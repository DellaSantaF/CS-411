export interface MotionPoint { t: number; x: number; y: number; vx: number; vy: number }
export interface Run {
  beltSpeed: number; direction: number; magnusGain: number; liftCoefficient: number;
  omega: number; initialVx: number; initialVy: number; contactX: number;
  dropTime: number; separationTime: number; pauseTime: number; duration: number; ascent: MotionPoint[];
}
export interface BallState { t: number; x: number; y: number; angle: number; spinFraction: number; compression: number; phase: string }
export const configuration: Readonly<{ gravity: number; releaseHeight: number; radius: number; mass: number;
  airDensity: number; restitution: number; referenceLiftCoefficient: number; minimumBeltSpeed: number;
  maximumBeltSpeed: number; defaultBeltSpeed: number; magnusGain: number; contactDuration: number;
  pauseAfterSeparation: number; integrationStep: number }>;
export function buildRun(options?: { beltSpeed?: number; direction?: number; magnusGain?: number; step?: number }): Run;
export function sample(run: Run, time: number): BallState;
