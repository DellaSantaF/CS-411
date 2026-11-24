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
  cl: 'Require identifying a physical property: ball spin/rotation or lift coefficient. The spin is sufficient intuitive physical wording; naming lift coefficient or relating it to force is unnecessary. Reject purely graphical observations such as markings moving, stripes turning, or animation getting faster unless explicitly linked to ball spin/rotation. Formal revealed quantity is lift coefficient, not angular velocity.',
  rho: 'Require fluid/air density or an intuitive physical description of more or less air/fluid/particles in the same space. More lines, denser lines, line spacing or line count alone are visual observations and must be rejected unless linked to air/fluid quantity or density. Do not require a mathematical relationship to force.',
  v: 'Require identifying translational speed/velocity of the ball or surrounding air relative to the ball. Lines/dashes moving faster alone are graphical observations and must be rejected unless linked to actual air or ball movement. Bare speed or velocity is ambiguous: ask "The speed of what exactly?" Spin speed alone is insufficient. No exponent or force relationship is required.',
  area: 'Require identifying physical cross-sectional area, ball/sphere size, radius, or diameter. A circle/image becoming bigger or occupying more screen space alone is a graphical observation and must be rejected unless linked to the physical ball size/area. No exact force relationship is required. The formal quantity is cross-sectional area, not total sphere surface area.',
};
