import type { GuidanceContext } from './contracts.ts';
import type { TutorMessage } from '../../src/shared/contracts.ts';

// Defense in depth: never surface obvious answer labels or units for hidden sliders.
export function protectGuidance(result: TutorMessage, context: GuidanceContext): TutorMessage {
  if (result.decision !== 'help' || context.stage !== 'formula') return result;
  const protectedTerms = {
    cl: /lift coefficient|C[_ ]?L\b|angular velocity/i,
    rho: /densit|kg\s*[/·]|kilogram|\brho\b|ρ|per (unit )?(cubic metre|cubic meter|volume)/i,
    v: /translational|\bvelocity\b|\bm\s*\/\s*s\b|met(?:er|re)s? per second/i,
    area: /cross.section|surface area|\bm²|square met(?:er|re)/i,
  };
  const leaked = Object.entries(protectedTerms).some(([id, pattern]) => !['accepted', 'revealed'].includes(context.outcomes[id as keyof typeof protectedTerms] ?? '') && pattern.test(result.message));
  return leaked ? { ...result, message: 'Compare two settings of this slider while leaving the others fixed. What visible change do you notice?' } : result;
}
