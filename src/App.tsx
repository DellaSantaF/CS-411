import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { api } from './api.ts';
import { fields, targetField } from './shared/contracts.ts';
import type { Answer, EvaluationReply, FieldId, HelpTarget, LearnerContext, SessionInfo, Stage, TutorMessage } from './shared/contracts.ts';
import { activityStorage, addInteraction, explanationExample, initialState, resolved, restoredState, taskKey, tokenStorage } from './state.ts';
import type { ActivityState } from './state.ts';
import { parameters, parameterOrder, normalized, magnusForce } from './physics/formula.ts';
import { Treadmill } from './components/Treadmill.tsx';
import type { TreadmillPlayer } from './components/Treadmill.tsx';
import { FormulaScene } from './components/FormulaScene.tsx';
import { Introduction } from './components/Introduction.tsx';
import { AnswerCard } from './components/AnswerCard.tsx';
import { ContextHelp } from './components/ContextHelp.tsx';
import { Developer } from './Developer.tsx';

export function App() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [state, setState] = useState<ActivityState | null>(null);
  const [loading, setLoading] = useState(true), [key, setKey] = useState(''), [entryError, setEntryError] = useState('');
  const [entering, setEntering] = useState(false), [ready, setReady] = useState(false), [motionBusy, setMotionBusy] = useState(false);
  const [tutorBusy, setTutorBusy] = useState<HelpTarget | null>(null), [tutorError, setTutorError] = useState<HelpTarget | null>(null);
  const [formulaGuidanceHost, setFormulaGuidanceHost] = useState<HTMLDivElement | null>(null);
  const player = useRef<TreadmillPlayer>(null), latest = useRef(state); latest.current = state;
  const tutorPending = useRef(false), lastAssessment = useRef(Date.now()), lastFingerprint = useRef('');
  const checking = useRef(new Set<FieldId>());
  const developer = location.pathname === '/developer';
  const activeTask = state ? taskKey(state) : null;
  useEffect(() => {
    if (!sessionStorage.getItem(tokenStorage)) { setLoading(false); return; }
    void api<SessionInfo>('session').then(info => { setSession(info); setState(restoredState(info)); }).catch(() => {
      sessionStorage.removeItem(tokenStorage); sessionStorage.removeItem(activityStorage);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (state) sessionStorage.setItem(activityStorage, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (state?.stage === 'treadmill' && state.phase === 'prediction' && !motionBusy) {
      document.querySelector<HTMLButtonElement>('.prediction-choices button:not(:disabled)')?.focus({ preventScroll: true });
      document.querySelector('#task-window')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [state?.phase, motionBusy, state?.stage]);
  useEffect(() => { window.scrollTo(0, 0); document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); }, [state?.stage]);
  useEffect(() => {
    if (developer || !activeTask) return;
    let previous = performance.now(), visible = !document.hidden;
    const tick = () => {
      const now = performance.now(), delta = visible ? now - previous : 0; previous = now; visible = !document.hidden;
      if (delta <= 0) return;
      setState(current => { const task = current && taskKey(current); return current && task === activeTask ? { ...current, timers: { ...current.timers, [task]: current.timers[task] + delta } } : current; });
    };
    const interval = setInterval(tick, 500); document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [developer, activeTask]);

  function snapshot(current: ActivityState, target: HelpTarget): LearnerContext {
    const task = taskKey(current), elapsed = task ? current.timers[task] : 0;
    const relevant: FieldId[] = current.stage === 'formula' ? parameterOrder : current.phase === 'prediction' ? ['prediction'] : ['explanation'];
    return { stage: current.stage, phase: current.phase, target,
      drafts: Object.fromEntries(relevant.map(id => [id, current.answers[id].text.slice(0, 1200)])),
      outcomes: Object.fromEntries(relevant.map(id => [id, current.answers[id].status])),
      parameters: current.parameters, treadmill: current.stage === 'treadmill' ? { controls: current.belt, observedRun: current.lastRun } : undefined, recentInteractions: current.interactions.slice(-8),
      elapsedMs: elapsed, timeWithoutProgressMs: task ? elapsed - current.progressAt[task] : 0, priorGuidance: [] };
  }
  async function ask(target: HelpTarget, requested: boolean) {
    const current = latest.current;
    if (!current || current.bubble || tutorPending.current) return;
    if (current.stage !== 'formula' && !(current.stage === 'treadmill' && current.phase !== 'setup')) return;
    tutorPending.current = true; setTutorBusy(target); setTutorError(null); lastAssessment.current = Date.now();
    const stage = current.stage, phase = current.phase;
    try {
      const result = await api<TutorMessage>('tutor', { requested, context: snapshot(current, target) });
      setState(value => {
        if (!value || value.stage !== stage || value.phase !== phase || value.bubble || result.decision !== 'help') return value;
        const field = targetField(result.target);
        if (!requested && field && resolved(value.answers[field])) return value;
        return { ...value, bubble: result };
      });
    } catch { setTutorError(target); }
    finally { tutorPending.current = false; setTutorBusy(null); }
  }
  useEffect(() => {
    if (developer || session?.condition !== 'proactive') return;
    const assess = () => {
      const current = latest.current;
      if (document.hidden || !current || current.bubble || tutorPending.current || Date.now() - lastAssessment.current < 45_000) return;
      if (!(current.stage === 'formula' || current.stage === 'treadmill' && current.phase !== 'setup')) return;
      const target: HelpTarget = current.stage === 'formula' ? 'formula-scene' : current.phase === 'prediction' ? 'prediction' : 'explanation';
      if (target !== 'formula-scene' && resolved(current.answers[target as FieldId])) return;
      if (current.stage === 'formula' && parameterOrder.every(id => resolved(current.answers[id]))) return;
      const context = snapshot(current, target);
      const fingerprint = JSON.stringify([context.drafts, context.outcomes, context.recentInteractions, Math.floor(context.timeWithoutProgressMs / 45_000)]);
      if (fingerprint === lastFingerprint.current) return;
      lastFingerprint.current = fingerprint; void ask(target, false);
    };
    const interval = setInterval(assess, 5000); return () => clearInterval(interval);
  }, [developer, session?.condition]);
  useEffect(() => {
    if (developer || !state || session?.condition !== 'proactive' || sessionStorage.getItem('magnus.dev.assess') !== '1') return;
    sessionStorage.removeItem('magnus.dev.assess');
    void ask(state.stage === 'formula' ? 'formula-scene' : state.phase === 'prediction' ? 'prediction' : 'explanation', false);
  }, [developer, session?.condition, state?.sessionId]);

  async function enter() {
    if (!key.trim() || entering) return;
    setEntering(true); setEntryError('');
    try {
      const result = await api<{ token: string; session: SessionInfo }>('session', { key });
      sessionStorage.setItem(tokenStorage, result.token); setSession(result.session); setState(initialState(result.session));
    } catch (error) { setEntryError((error as Error).message); }
    finally { setEntering(false); }
  }
  const updateAnswer = (id: FieldId, change: Partial<Answer>) => setState(current => current ? { ...current, answers: { ...current.answers, [id]: { ...current.answers[id], ...change } } } : current);
  async function check(id: FieldId) {
    const current = latest.current, answer = current?.answers[id];
    if (!current || !answer?.text.trim() || resolved(answer) || checking.current.has(id)) return;
    checking.current.add(id); updateAnswer(id, { status: 'checking', feedback: '' });
    try {
      const result = await api<EvaluationReply>('evaluate', { field: id, text: answer.text, revision: answer.revision });
      setState(value => {
        if (!value || value.answers[id].revision !== result.revision) return value;
        const task = taskKey(value);
        const changed = addInteraction(value, 'check', id, result.accepted ? 'accepted' : 'not accepted');
        return { ...changed, bubble: result.accepted && changed.bubble?.target === id ? null : changed.bubble,
          progressAt: result.accepted && task ? { ...value.progressAt, [task]: value.timers[task] } : value.progressAt,
          answers: { ...value.answers, [id]: { ...value.answers[id], status: result.accepted ? 'accepted' : 'editable', checks: value.answers[id].checks + 1,
            feedback: result.accepted ? (id === 'prediction' ? 'Prediction recorded.' : '') : 'Required information has not yet been provided.' } } };
      });
    } catch { updateAnswer(id, { status: 'editable', feedback: 'Checking could not be completed. Your response is saved; please try again.' }); }
    finally { checking.current.delete(id); }
  }
  function reveal(id: FieldId) {
    setState(current => {
      if (!current || !session || current.answers[id].status !== 'editable') return current;
      const task = taskKey(current);
      if (!task || task === 'prediction' || current.timers[task] < session.skipSeconds * 1000) return current;
      const example = id === 'explanation' ? explanationExample : parameters[id as keyof typeof parameters].example;
      return { ...addInteraction(current, 'reveal', id, 'example'), bubble: current.bubble?.target === id ? null : current.bubble,
        answers: { ...current.answers, [id]: { ...current.answers[id], status: 'revealed', example, feedback: '' } } };
    });
  }
  function go(stage: Stage) { setState(current => current ? { ...addInteraction(current, 'stage', stage, 'entered'), stage, bubble: null } : current); setTutorError(null); }
  function dismiss() { setState(current => current ? { ...addInteraction(current, 'guidance', current.bubble?.target ?? '', 'dismissed'), bubble: null } : current); lastAssessment.current = Date.now(); }
  function help(target: HelpTarget) {
    if (!session || !state) return null;
    if (fields.includes(target as FieldId) && resolved(state.answers[target as FieldId])) return null;
    const parameter = target.startsWith('slider-') ? target.slice(7) as keyof typeof parameters : null;
    const label = parameter ? resolved(state.answers[parameter]) ? parameters[parameter].name : `Parameter ${parameters[parameter].number}` : target.replace('treadmill-', 'treadmill ');
    return <ContextHelp target={target} label={label} condition={session.condition} bubble={state.bubble} busy={tutorBusy} error={tutorError} request={target => void ask(target, true)} dismiss={dismiss} bubbleContainer={parameter ? formulaGuidanceHost : null} />;
  }
  function answer(id: FieldId, label: string, allowReveal = false) {
    return <AnswerCard id={id} label={label} answer={state!.answers[id]} help={help(id)} allowReveal={allowReveal}
      onText={text => { const value = latest.current!.answers[id]; updateAnswer(id, { text, revision: value.revision + 1, feedback: '' }); }}
      onCheck={() => void check(id)} onReveal={() => reveal(id)} />;
  }
  const stageLabel = !state ? 'Participant entry' : ({ pretest: 'Pre-test', treadmill: 'Treadmill', introduction: 'Introduction', formula: 'Formula exploration', posttest: 'Post-test' })[state.stage];
  const count = state ? parameterOrder.filter(id => resolved(state.answers[id])).length : 0;
  const progress = !state ? 0 : state.stage === 'pretest' ? 0 : state.stage === 'treadmill' ? (state.phase === 'setup' ? 12 : state.phase === 'prediction' ? 23 : 36) : state.stage === 'introduction' ? 48 : state.stage === 'formula' ? 60 + count * 8 : 100;
  const eligible = !!state && !!session && (state.stage === 'formula' ? state.timers.formula : state.timers.explanation) >= session.skipSeconds * 1000;
  return <>
    <div className="development-notice">{session?.aiMode === 'live' ? 'AI prototype · evaluator and tutor use OpenAI' : session ? 'Development demonstration · evaluator and tutor responses are simulated' : 'Learning activity prototype'}</div>
    <main><header><span className="brand">Learning activity</span><span className="stage-label">{stageLabel}</span></header>
      <div className="progress" role="progressbar" aria-label="Activity progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
      {loading ? <p role="status">Loading session…</p> : developer ? <Developer session={session} /> : !session || !state ? <section className="entry card"><h1>Participant entry</h1><form onSubmit={event => { event.preventDefault(); void enter(); }}><p>Enter the participant key provided for your session.</p><label htmlFor="participant-key">Participant key</label><input id="participant-key" value={key} autoComplete="off" autoCapitalize="characters" onChange={event => setKey(event.target.value)} disabled={entering} /><button disabled={!key.trim() || entering}>{entering ? 'Opening session…' : 'Start activity'}</button>{entryError && <p className="feedback" role="alert">{entryError}</p>}</form></section> : <>
        <h1 tabIndex={-1}>{state.stage === 'treadmill' ? 'Treadmill exploration' : state.stage === 'formula' ? 'Magnus Force Formula' : stageLabel}</h1>
        {state.stage === 'pretest' && <section className="card placeholder"><h2>Pre-test placeholder</h2><p>The pre-test will be provided here before the activity. No test questions are included in this development version.</p><button className="flow-action" onClick={() => go('treadmill')}>Continue to activity</button></section>}
        {state.stage === 'treadmill' && <div className="layout"><Treadmill ref={player} initialPhase={state.phase} belt={state.belt} lastRun={state.lastRun} previousRun={state.previousRun} directionHelp={help('treadmill-direction')} speedHelp={help('treadmill-speed')}
          onBelt={belt => setState(value => value ? { ...addInteraction(value, 'slider', belt.direction !== value.belt.direction ? 'treadmill-direction' : 'treadmill-speed', belt.direction !== value.belt.direction ? (belt.direction === -1 ? 'left' : 'right') : String(belt.beltSpeed)), belt } : value)}
          onRun={lastRun => { setMotionBusy(true); setState(value => value ? { ...addInteraction(value, 'run', 'treadmill', `${lastRun.direction}:${lastRun.beltSpeed}`), previousRun: value.phase === 'exploration' ? value.lastRun : value.previousRun, lastRun } : value); }}
          onReady={() => { setReady(true); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("#drop-ball")?.focus({ preventScroll: true })); }} onPrediction={() => { setMotionBusy(false); setState(value => value ? { ...value, phase: 'prediction' } : value); }}
          onFinished={() => { setMotionBusy(false); setState(value => value ? { ...value, phase: 'exploration' } : value); }} />
          <section id="task-window" className={`task card ${state.phase !== 'setup' && !motionBusy ? 'is-current' : ''}`} aria-label="Current task">
            {state.phase === 'setup' && !motionBusy ? <><h2>Before starting</h2><p>{ready ? 'Select Drop ball to begin.' : 'Confirm both descriptions in the scene, then drop the ball.'}</p><button id="drop-ball" disabled={!ready} onClick={() => player.current?.drop()}>Drop ball</button></> : state.phase !== 'exploration' && motionBusy ? <><h2>Observe the motion</h2><p>The simulation shows the drop, contact, and rising path.</p></> : state.phase === 'prediction' ? <><h2 className="task-number">Task 1</h2><p className="task-prompt">Which way will the ball’s path bend as it rises?</p><div className="prediction-choices" role="group" aria-label="Your prediction">{(['Left', 'Straight', 'Right'] as const).map((choice, index) => <button key={choice} aria-pressed={state.answers.prediction.text === choice} disabled={resolved(state.answers.prediction)} onClick={() => setState(value => value ? { ...addInteraction(value, 'prediction', 'prediction', choice), bubble: null, answers: { ...value.answers, prediction: { ...value.answers.prediction, text: choice, status: 'accepted', revision: value.answers.prediction.revision + 1 } } } : value)}><span aria-hidden="true">{['↖', '↑', '↗'][index]}</span>{choice}</button>)}</div>{help('prediction')}{resolved(state.answers.prediction) && <p className="feedback" role="status">Prediction recorded.</p>}<button className="flow-action reveal-action" disabled={!resolved(state.answers.prediction)} onClick={() => { setMotionBusy(true); player.current?.reveal(); }}>Reveal what happens</button></> : <><p className="exploration-invitation">Explore the Treadmill Controls below the simulation. Change the direction or speed, then select Run again to compare the paths.</p><h2 className="task-number">Task 2</h2><p className="task-prompt">Why did the ball behave this way? What influences its deflection?</p>{answer('explanation', 'Your explanation', eligible)}<button className="flow-action continue-action" disabled={!resolved(state.answers.explanation)} onClick={() => go('introduction')}>Continue</button></>}
          </section></div>}
        {state.stage === 'introduction' && <Introduction onContinue={() => go('formula')} />}
        {state.stage === 'formula' && <><div className="formula-layout"><section className="formula-simulation" aria-label="Formula simulation and controls"><div className="scene"><FormulaScene values={state.parameters} /><div className="scene-status pressure-legend"><span><i className="pressure-low" /> Lower pressure <i className="pressure-high" /> Higher pressure</span><span>Force: {magnusForce(state.parameters).toFixed(3)} N</span></div></div>
          <div className="parameter-controls">{parameterOrder.map(id => { const p = parameters[id], known = resolved(state.answers[id]); return <div className="parameter-control" key={id} style={{ '--parameter': p.color } as CSSProperties}><label htmlFor={`slider-${id}`}>{known ? p.name : `Parameter ${p.number}`}</label>{help(`slider-${id}`)}<input id={`slider-${id}`} type="range" min="0" max="100" step="1" value={Math.round(normalized(id, state.parameters[id]) * 100)} aria-valuetext={known ? `${state.parameters[id].toFixed(id === 'area' ? 3 : 2)} ${p.unit}` : undefined} onChange={event => { const next = p.min + Number(event.target.value) / 100 * (p.max - p.min); setState(value => value ? { ...addInteraction(value, 'slider', `slider-${id}`, next.toFixed(3)), parameters: { ...value.parameters, [id]: next } } : value); }} />{known && <output>{state.parameters[id].toFixed(id === 'area' ? 3 : 2)} {p.unit}</output>}</div>; })}</div>
          <div className="formula-guidance" ref={setFormulaGuidanceHost} />
          <div className="formula" aria-label="Magnus force formula"><div>F<sub>Magnus</sub> = <span className={`formula-term ${resolved(state.answers.cl) ? '' : 'masked'}`} style={{ '--parameter': parameters.cl.color } as CSSProperties}>{resolved(state.answers.cl) ? <>C<sub>L</sub></> : '?'}</span></div><div>× ½ × <span className={`formula-term ${resolved(state.answers.rho) ? '' : 'masked'}`} style={{ '--parameter': parameters.rho.color } as CSSProperties}>{resolved(state.answers.rho) ? 'ρ' : '?'}</span></div><div>× <span className={`formula-term ${resolved(state.answers.v) ? '' : 'masked'}`} style={{ '--parameter': parameters.v.color } as CSSProperties}>{resolved(state.answers.v) ? <>v<sup>2</sup></> : '?'}</span></div><div>× <span className={`formula-term ${resolved(state.answers.area) ? '' : 'masked'}`} style={{ '--parameter': parameters.area.color } as CSSProperties}>{resolved(state.answers.area) ? 'A' : '?'}</span></div></div>
          {resolved(state.answers.cl) && <p className="mapping-note">Spin is an illustrative cue for lift coefficient.</p>}
        </section><section className="formula-task" aria-label="Parameter discovery responses"><h2>Describe each parameter</h2><p>Experiment with the sliders, then describe what each controls. Check each response separately.</p>{parameterOrder.map(id => <div className="parameter-answer card" key={id} style={{ '--parameter': parameters[id].color } as CSSProperties}>{answer(id, resolved(state.answers[id]) ? parameters[id].name : `Parameter ${parameters[id].number}`, eligible)}</div>)}{eligible && count < 4 && <p className="fallback-note">Example descriptions are now available for unresolved responses.</p>}</section></div>
        <div className="formula-footer"><p role="status">{parameterOrder.filter(id => state.answers[id].status === 'accepted').length}/4 discovered{parameterOrder.some(id => state.answers[id].status === 'revealed') && ` · ${parameterOrder.filter(id => state.answers[id].status === 'revealed').length} revealed`}</p><button className="flow-action" disabled={count !== 4} onClick={() => go('posttest')}>Continue</button></div></>}
        {state.stage === 'posttest' && <section className="card placeholder"><h2>Post-test placeholder</h2><p>The post-test will be provided here. You have reached the end of the activity demonstration.</p></section>}
      </>}
    </main>
  </>;
}


