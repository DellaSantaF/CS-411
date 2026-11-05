import type { Answer, FieldId, Interaction, ParameterId, SessionInfo, Stage, TreadmillPhase, TutorMessage } from './shared/contracts.ts';
import { fields } from './shared/contracts.ts';
import { initialParameters } from './physics/formula.ts';
export const activityStorage = 'magnus.activity.v1';
export const tokenStorage = 'magnus.session.token';
export interface ActivityState {
  sessionId: string; stage: Stage; phase: TreadmillPhase;
  answers: Record<FieldId, Answer>; parameters: Record<ParameterId, number>;
  belt: { beltSpeed: number; direction: number }; lastRun: { beltSpeed: number; direction: number };
  previousRun: { beltSpeed: number; direction: number } | null;
  timers: { prediction: number; explanation: number; formula: number };
  progressAt: { prediction: number; explanation: number; formula: number };
  interactions: Interaction[]; bubble: TutorMessage | null;
}
export function initialState(session: SessionInfo): ActivityState {
  return { sessionId: session.sessionId, stage: 'pretest', phase: 'setup',
    answers: Object.fromEntries(fields.map(id => [id, { text: '', status: 'editable', feedback: '', revision: 0, checks: 0 }])) as Record<FieldId, Answer>,
    parameters: initialParameters(), belt: { beltSpeed: 8, direction: 1 }, lastRun: { beltSpeed: 8, direction: 1 }, previousRun: null,
    timers: { prediction: 0, explanation: 0, formula: 0 }, progressAt: { prediction: 0, explanation: 0, formula: 0 }, interactions: [], bubble: null };
}
export function restoredState(session: SessionInfo): ActivityState {
  const fresh = initialState(session);
  try {
    const value = JSON.parse(sessionStorage.getItem(activityStorage) ?? 'null') as ActivityState | null;
    if (!value || value.sessionId !== session.sessionId || !['pretest', 'treadmill', 'introduction', 'formula', 'posttest'].includes(value.stage)) return fresh;
    for (const field of fields) {
      const answer = value.answers[field];
      if (!answer || typeof answer.text !== 'string') return fresh;
      if (answer.status === 'checking') { answer.status = 'editable'; answer.feedback = 'Please check your response again.'; }
    }
    value.previousRun ??= null;
    // Existing development sessions may contain the earlier free-text prediction.
    if (!['Left', 'Straight', 'Right'].includes(value.answers.prediction.text) && value.phase === 'prediction') value.answers.prediction = fresh.answers.prediction;
    if (value.bubble) {
      const target = value.bubble.target;
      if (['cl', 'rho', 'v', 'area'].includes(target)) value.bubble.target = `slider-${target}` as TutorMessage['target'];
      else if (target === 'explanation' || target === 'treadmill-scene') value.bubble.target = 'treadmill-direction';
      else if (target === 'formula-scene') value.bubble.target = 'slider-cl';
    }
    return value;
  } catch { return fresh; }
}
export function taskKey(state: ActivityState): keyof ActivityState['timers'] | null {
  if (state.stage === 'formula') return 'formula';
  if (state.stage === 'treadmill' && state.phase === 'exploration') return 'explanation';
  if (state.stage === 'treadmill' && state.phase === 'prediction') return 'prediction';
  return null;
}
export function addInteraction(state: ActivityState, kind: string, target: string, value: string): ActivityState {
  return { ...state, interactions: [...state.interactions, { kind, target, value, at: Date.now() }].slice(-8) };
}
export const resolved = (answer: Answer) => answer.status === 'accepted' || answer.status === 'revealed';
export const explanationExample = 'The moving belt makes the ball rotate. Reversing the belt reverses that rotation. A spinning ball experiences a deflecting force, so reversing its rotation reverses the direction in which its rising path curves.';
