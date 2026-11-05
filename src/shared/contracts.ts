export type Condition = 'reactive' | 'proactive';
export type ThinkingTime = 'short' | 'balanced' | 'extended';
export const fields = ['prediction', 'explanation', 'cl', 'rho', 'v', 'area'] as const;
export type FieldId = typeof fields[number];
export type ParameterId = 'cl' | 'rho' | 'v' | 'area';
export type AnswerStatus = 'editable' | 'checking' | 'accepted' | 'revealed';
export type Stage = 'pretest' | 'treadmill' | 'introduction' | 'formula' | 'posttest';
export type TreadmillPhase = 'setup' | 'prediction' | 'exploration';
export const controlTargets = ['treadmill-direction', 'treadmill-speed', 'slider-cl', 'slider-rho', 'slider-v', 'slider-area'] as const;
export type ControlTarget = typeof controlTargets[number];
export const helpTargets = [...fields, ...controlTargets, 'treadmill-scene', 'formula-scene', 'introduction'] as const;
export type HelpTarget = typeof helpTargets[number];
export function targetField(target: HelpTarget): FieldId | null {
  if (target.startsWith('treadmill-') && target !== 'treadmill-scene') return 'explanation';
  if (target.startsWith('slider-')) return target.slice(7) as ParameterId;
  return fields.includes(target as FieldId) ? target as FieldId : null;
}
export type BeltSettings = { beltSpeed: number; direction: number };
export interface SessionInfo {
  sessionId: string; participantId: string; condition: Condition;
  skipSeconds: number; thinkingTime: ThinkingTime; aiMode: 'development';
}
export interface Answer {
  text: string; status: AnswerStatus; feedback: string; revision: number; checks: number;
  example?: string;
}
export interface Interaction { kind: string; target: string; value: string; at: number }
export interface TutorMessage { decision: 'help' | 'wait'; target: HelpTarget; message: string }
export interface LearnerContext {
  stage: Stage; phase: TreadmillPhase; target: HelpTarget;
  drafts: Partial<Record<FieldId, string>>;
  outcomes: Partial<Record<FieldId, AnswerStatus>>;
  parameters: Record<ParameterId, number>;
  treadmill?: { controls: BeltSettings; observedRun: BeltSettings };
  interactiveControl?: { id: ControlTarget; label: string; value: string | number; unit?: string };
  recentInteractions: Interaction[];
  elapsedMs: number; timeWithoutProgressMs: number;
  priorGuidance: { target: HelpTarget; message: string }[];
}
export interface EvaluationRequest { field: FieldId; text: string; revision: number }
export interface EvaluationReply { accepted: boolean; revision: number; mode: 'development' | 'live' }
export interface DeveloperSettings {
  skipSeconds: number; thinkingTime: ThinkingTime;
  evaluator: 'auto' | 'accept' | 'reject' | 'technical-error';
  tutor: 'auto' | 'help' | 'wait' | 'technical-error';
}
