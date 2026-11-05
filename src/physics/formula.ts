import type { ParameterId } from '../shared/contracts.ts';
export const parameterOrder: ParameterId[] = ['cl', 'rho', 'v', 'area'];
export const parameters: Record<ParameterId, { number: number; name: string; symbol: string; color: string; min: number; max: number; initial: number; unit: string; example: string }> = {
  cl: { number: 1, name: 'Lift coefficient', symbol: 'Cₗ', color: '#537ca8', min: 0.1, max: 0.5, initial: 0.3, unit: '', example: 'It changes how quickly the sphere rotates.' },
  rho: { number: 2, name: 'Fluid density', symbol: 'ρ', color: '#a57d3d', min: 0.6, max: 1.8, initial: 1.2, unit: 'kg/m³', example: 'It changes the fluid density: the amount of air in a given volume.' },
  v: { number: 3, name: 'Translational velocity', symbol: 'v', color: '#806ca8', min: 4, max: 12, initial: 8, unit: 'm/s', example: 'It changes the speed of the sphere relative to the surrounding air.' },
  area: { number: 4, name: 'Cross-sectional area', symbol: 'A', color: '#3e8a78', min: 0.01, max: 0.05, initial: 0.03, unit: 'm²', example: 'It changes the size of the sphere and therefore its cross-sectional area.' },
};
export type ParameterValues = Record<ParameterId, number>;
export const initialParameters = (): ParameterValues => ({ cl: 0.3, rho: 1.2, v: 8, area: 0.03 });
export function magnusForce(values: ParameterValues) { return values.cl * 0.5 * values.rho * values.v ** 2 * values.area; }
export function normalized(id: ParameterId, value: number) { return (value - parameters[id].min) / (parameters[id].max - parameters[id].min); }
export function visualMapping(values: ParameterValues) {
  return { radius: 32 + 30 * (Math.sqrt(values.area) - Math.sqrt(0.01)) / (Math.sqrt(0.05) - Math.sqrt(0.01)),
    lineCount: 6 + 2 * Math.round(normalized('rho', values.rho) * 6),
    airflowSpeed: 35 + normalized('v', values.v) * 100,
    angularSpeed: 1.2 + normalized('cl', values.cl) * 5,
    forceLength: 26 + 112 * Math.sqrt(magnusForce(values) / 3.24) };
}
