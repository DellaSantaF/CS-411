import type { EvaluationRequest, FieldId, LearnerContext, SessionInfo, TutorMessage } from '../../src/shared/contracts.ts';
export interface EvaluationOutcome { accepted: boolean; diagnostics: string[]; feedback?: string }
export interface CheckedAnswer extends EvaluationRequest, EvaluationOutcome { at: number }
export interface GuidanceContext extends LearnerContext {
  condition: SessionInfo['condition']; thinkingTime: SessionInfo['thinkingTime'];
  checkedAnswers: CheckedAnswer[];
}
export interface Evaluator { evaluate(request: EvaluationRequest): Promise<EvaluationOutcome> }
export interface Tutor { assess(context: GuidanceContext, requested: boolean): Promise<TutorMessage> }
export const rubrics: Record<FieldId, string> = {
  prediction: 'Accept any nonempty prediction regardless of scientific correctness. Do not require justification.',
  explanation: 'Accept the general explanation that the ball curves opposite to the treadmill because it is spinning. Do not require changing/reversing the belt, reversing rotation, or comparing speeds. Do not require the name Magnus effect or pressure differences. Belt pushing sideways alone is insufficient. Accept intuitive language and semantic equivalents.',
  cl: 'Accept spin- or rotation-related descriptions; naming lift coefficient is unnecessary. Formal revealed quantity is lift coefficient, not angular velocity.',
  rho: 'Accept descriptions of fluid density, including the amount of air or fluid per volume. Do not require a mathematical relationship to force.',
  v: 'Accept descriptions of translational speed or velocity of the sphere, or equivalent relative airflow speed in this fixed-sphere depiction. Bare speed or velocity is ambiguous: ask "The speed of what exactly?" Spin speed alone is insufficient. No exponent or force relationship is required.',
  area: 'Accept cross-sectional area, ball size, radius, or diameter. No exact force relationship is required. The formal quantity is cross-sectional area, not total sphere surface area.',
};
