import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { buildRun, configuration, sample } from '../physics/treadmill.js';
import type { BallState, Run } from '../physics/treadmill.js';
import type { TreadmillPhase } from '../shared/contracts.ts';

type Belt = { beltSpeed: number; direction: number };
export interface TreadmillPlayer { drop(): void; reveal(): void }
interface Props {
  initialPhase: TreadmillPhase; lastRun: Belt; previousRun: Belt | null; belt: Belt; directionHelp: ReactNode; speedHelp: ReactNode;
  onBelt(value: Belt): void; onRun(value: Belt): void; onReady(): void;
  onPrediction(): void; onFinished(): void;
}
const display = { originX: 380, beltY: 430, pixelsPerMetre: 76, horizontalGain: 2.5,
  ballRadius: 12, playbackRate: 0.55, beltPixelsPerMetre: 22, maximumCompression: 0.04 };

export const Treadmill = forwardRef<TreadmillPlayer, Props>(function Treadmill(props, ref) {
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const actions = useRef<TreadmillPlayer>({ drop() {}, reveal() {} });
  const acknowledged = useRef({ ball: props.initialPhase !== 'setup', belt: props.initialPhase !== 'setup' });
  const [confirmations, setConfirmations] = useState(acknowledged.current);
  const [playing, setPlaying] = useState(false);
  const [explored, setExplored] = useState(props.initialPhase === 'exploration');
  const [status, setStatus] = useState(props.initialPhase === 'prediction' ? 'Paused just after contact' : props.initialPhase === 'exploration' ? 'Stopped at the highest point' : 'Ready to drop');
  useImperativeHandle(ref, () => ({ drop: () => actions.current.drop(), reveal: () => actions.current.reveal() }), []);
  function confirm(target: 'ball' | 'belt') {
    acknowledged.current = { ...acknowledged.current, [target]: true };
    setConfirmations(acknowledged.current);
    if (acknowledged.current.ball && acknowledged.current.belt) latest.current.onReady();
  }
  useEffect(() => {
    const container = root.current!;
    const element = (id: string) => container.querySelector<SVGElement>(`#${id}`)!;
    const ball = element('ball'), ghost = element('ghost');
    let run: Run = buildRun(latest.current.lastRun);
    let mode: string = latest.current.initialPhase;
    let clock = mode === 'prediction' ? run.pauseTime : mode === 'exploration' ? run.duration : 0;
    let replayClock = 0, beltOffset = 0, lastFrame: number | null = null, repeated = false;
    let frameId = 0;
    const toScreen = (state: { x: number; y: number }) => ({
      x: display.originX + state.x * display.pixelsPerMetre * display.horizontalGain,
      y: display.beltY - display.ballRadius - (state.y - configuration.radius) * display.pixelsPerMetre,
    });
    function drawPrevious(previous: Run | null) {
      const points = previous ? previous.ascent.map(toScreen) : [];
      element('previous-trajectory').setAttribute('d', points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(''));
      element('previous-label').setAttribute('visibility', previous ? 'visible' : 'hidden');
      const shadow = element('previous-ball');
      shadow.setAttribute('visibility', previous ? 'visible' : 'hidden');
      if (previous) {
        const end = toScreen(sample(previous, previous.duration));
        shadow.setAttribute('transform', `translate(${end.x} ${end.y})`);
      }
    }
    drawPrevious(latest.current.previousRun ? buildRun(latest.current.previousRun) : null);
    function drawBall(node: SVGElement, state: BallState) {
      const point = toScreen(state);
      node.setAttribute('transform', `translate(${point.x} ${point.y})`);
      const revolutions = run.beltSpeed * display.beltPixelsPerMetre / (2 * Math.PI * display.ballRadius);
      const angle = -run.direction * (state.angle / run.omega) * revolutions * 360;
      const compression = state.compression * display.maximumCompression;
      node.querySelector('[data-body]')!.setAttribute('transform', `translate(0 ${display.ballRadius * compression}) scale(${1 + compression} ${1 - compression}) rotate(${angle})`);
      node.querySelector('[data-spin]')!.setAttribute('opacity', String(state.spinFraction));
      node.querySelector('[data-spin]')!.setAttribute('transform', `scale(1 ${run.direction})`);
    }
    function drawPath() {
      const release = toScreen(sample(run, 0)), dropped = toScreen(sample(run, Math.min(clock, run.dropTime)));
      element('drop-path').setAttribute('d', `M${release.x} ${release.y}L${dropped.x} ${dropped.y}`);
      const elapsed = clock - run.separationTime;
      if (elapsed < 0) { element('trajectory').setAttribute('d', ''); return; }
      const points = run.ascent.filter(point => point.t < elapsed).map(toScreen);
      points.push(toScreen(sample(run, clock)));
      element('trajectory').setAttribute('d', points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(''));
    }
    function start(again: boolean) {
      if (again) drawPrevious(run);
      run = buildRun(latest.current.belt); repeated = again; mode = 'drop'; clock = 0; replayClock = 0; lastFrame = null;
      setPlaying(true); setStatus('Dropping');
      element('pause-badge').setAttribute('visibility', 'hidden'); ghost.setAttribute('visibility', 'hidden');
      element('trajectory').setAttribute('d', ''); element('drop-path').setAttribute('d', '');
      latest.current.onRun({ beltSpeed: run.beltSpeed, direction: run.direction });
    }
    actions.current = {
      drop() { if (mode === 'setup' && acknowledged.current.ball && acknowledged.current.belt) start(false); },
      reveal() {
        if (mode !== 'prediction') return;
        mode = 'replay'; replayClock = 0; setPlaying(true); setStatus('Replaying the drop and contact');
        element('pause-badge').setAttribute('visibility', 'hidden'); ghost.setAttribute('visibility', 'visible');
        drawBall(ghost, sample(run, 0));
      },
    };
    const repeat = () => { if (mode === 'exploration') start(true); };
    container.addEventListener('repeat-run', repeat);
    element('pause-badge').setAttribute('visibility', mode === 'prediction' ? 'visible' : 'hidden');
    function frame(timestamp: number) {
      const delta = lastFrame === null || document.hidden ? 0 : Math.min(0.05, (timestamp - lastFrame) / 1000);
      lastFrame = document.hidden ? null : timestamp;
      const previousMode = mode, active = ['drop', 'replay', 'ascent'].includes(mode);
      const before = mode === 'replay' ? replayClock : clock;
      if (mode === 'drop') {
        clock += delta * display.playbackRate;
        if (clock >= run.pauseTime) {
          if (repeated) { mode = 'ascent'; setStatus('Rising'); }
          else {
            mode = 'prediction'; clock = run.pauseTime; setPlaying(false); setStatus('Paused just after contact');
            element('pause-badge').setAttribute('visibility', 'visible'); latest.current.onPrediction();
          }
        }
      } else if (mode === 'replay') {
        replayClock += delta * display.playbackRate;
        if (replayClock >= run.pauseTime) { mode = 'ascent'; clock = replayClock; ghost.setAttribute('visibility', 'hidden'); setStatus('Rising'); }
        else drawBall(ghost, sample(run, replayClock));
      } else if (mode === 'ascent') {
        clock += delta * display.playbackRate;
        if (clock >= run.duration) {
          mode = 'exploration'; clock = run.duration; setPlaying(false); setExplored(true); setStatus('Stopped at the highest point'); latest.current.onFinished();
        }
      }
      const after = previousMode === 'replay' ? replayClock : clock;
      beltOffset = (beltOffset + (active ? Math.max(0, after - before) : 0) * display.beltPixelsPerMetre * run.beltSpeed * run.direction) % 48;
      element('belt-texture').setAttribute('transform', `translate(${beltOffset} 0)`);
      element('belt-arrow').setAttribute('transform', run.direction === 1 ? '' : 'translate(760 0) scale(-1 1)');
      drawBall(ball, sample(run, clock)); drawPath();
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(frameId); container.removeEventListener('repeat-run', repeat); };
  }, []);
  return <div ref={root} className="simulation">
    <div className="scene"><div className="scene-viewport">
      <svg viewBox="0 0 760 490" role="img" aria-label="Ball and treadmill simulation. Motion is exaggerated for teaching.">
        <defs>
          <pattern id="belt-pattern" width="48" height="28" patternUnits="userSpaceOnUse"><path d="M0 1L-8 27M48 1L40 27" stroke="#a3b9ac" strokeWidth="2" /></pattern>
          <clipPath id="belt-clip"><rect x="70" y="430" width="620" height="28" rx="14" /></clipPath>
          <marker id="spin-head" viewBox="0 0 8 8" markerWidth="5" markerHeight="5" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#315f89" /></marker>
          <g id="sphere-shape"><circle r="12" fill="#c5ca74" stroke="#858b48" strokeWidth="1.3" /><path d="M-10-6Q0 6 10-6M-10 6Q0-6 10 6" fill="none" stroke="#f8f8dc" strokeWidth="1.8" /><circle cx="6" cy="-5" r="1.8" fill="#777e3a" /></g>
          <g id="spin-shape" fill="none" stroke="#315f89" strokeWidth="1.8" markerEnd="url(#spin-head)"><path d="M20 0A20 20 0 0 0 0-20" /><path d="M-20 0A20 20 0 0 0 0 20" /></g>
        </defs>
        <rect width="760" height="490" fill="#f7f9f6" />
        <path d="M70 103H690M70 211H690M70 319H690" stroke="#e7ece5" />
        <path id="drop-path" fill="none" stroke="#becbc2" strokeWidth="1.5" strokeDasharray="4 6" />
        <path id="previous-trajectory" fill="none" stroke="#667d91" strokeOpacity=".25" strokeWidth="2" strokeDasharray="5 6" />
        <g id="previous-ball" opacity=".18" visibility="hidden"><use href="#sphere-shape" /></g>
        <text id="previous-label" x="24" y="29" fill="#71828e" fontSize="13" visibility="hidden">Dashed path: previous drop</text>
        <path id="trajectory" fill="none" stroke="#396f82" strokeOpacity=".38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <g aria-hidden="true"><rect x="60" y="427" width="640" height="40" rx="20" fill="#d4ded5" /><rect x="70" y="430" width="620" height="28" rx="14" fill="#596e62" />
          <g clipPath="url(#belt-clip)"><rect id="belt-texture" x="22" y="430" width="716" height="28" fill="url(#belt-pattern)" /></g>
          <path d="M108 466L102 478M652 466L658 478" stroke="#73877a" strokeWidth="6" strokeLinecap="round" />
          <path id="belt-arrow" d="M349 444H411M404 439L411 444L404 449" fill="none" stroke="#f0f5ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g id="ball"><g data-body=""><use href="#sphere-shape" /></g><g data-spin=""><use href="#spin-shape" /></g></g>
        <g id="ghost" opacity=".27" visibility="hidden"><g data-body=""><use href="#sphere-shape" /></g><g data-spin=""><use href="#spin-shape" /></g></g>
        <g id="pause-badge" visibility="hidden"><rect x="22" y="22" width="191" height="36" rx="7" fill="#eee5d0" /><path d="M38 33V47M44 33V47" stroke="#78633c" strokeWidth="3" /><text x="57" y="45" fill="#655536" fontSize="14">Paused · prediction</text></g>
      </svg>
      {!confirmations.ball && <div className="scene-callout ball-callout"><p>This is a tennis ball.</p><button onClick={() => confirm('ball')} aria-label="Confirm tennis ball description">Understood</button></div>}
      {!confirmations.belt && <div className="scene-callout belt-callout"><p>This is a running treadmill.</p><button onClick={() => confirm('belt')} aria-label="Confirm treadmill description">Understood</button></div>}
    </div><div className="scene-status"><span role="status">{status}</span><span>Teaching model · motion exaggerated</span></div></div>
    {explored && <section className="controls" aria-label="Treadmill Controls"><h2 className="controls-title">Treadmill Controls</h2><div className="control-grid">
      <div><div className="control-heading"><span className="control-label" id="direction-label">Belt direction</span>{props.directionHelp}</div><div className="direction-toggle" data-direction={props.belt.direction} role="group" aria-labelledby="direction-label"><span className="direction-thumb" aria-hidden="true" /><button disabled={playing} aria-pressed={props.belt.direction === -1} onClick={() => props.onBelt({ ...props.belt, direction: -1 })}>← Left</button><button disabled={playing} aria-pressed={props.belt.direction === 1} onClick={() => props.onBelt({ ...props.belt, direction: 1 })}>Right →</button></div></div>
      <div><div className="control-heading"><label htmlFor="belt-speed">Belt speed</label>{props.speedHelp}</div><output className="belt-speed-output">{props.belt.beltSpeed.toFixed(1)} m/s</output><input id="belt-speed" disabled={playing} type="range" min="6" max="10" step="0.5" value={props.belt.beltSpeed} aria-valuetext={`${props.belt.beltSpeed} metres per second`} onChange={e => props.onBelt({ ...props.belt, beltSpeed: Number(e.target.value) })} /><div className="range-labels"><span>6 m/s</span><span>10 m/s</span></div></div>
    </div><div className="run-row"><p>Changes apply to the next run.</p><button disabled={playing} onClick={() => root.current?.dispatchEvent(new Event('repeat-run'))}>Run again</button></div></section>}
  </div>;
});
