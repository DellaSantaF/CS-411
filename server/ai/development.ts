import type { DeveloperSettings, HelpTarget } from '../../src/shared/contracts.ts';
import { targetField } from '../../src/shared/contracts.ts';
import type { Evaluator, GuidanceContext, Tutor } from './contracts.ts';

// Explicit development substitutes. These heuristics do not implement semantic AI assessment.
export function developmentEvaluator(settings: () => DeveloperSettings): Evaluator {
  return { async evaluate({ field, text }) {
    await new Promise(resolve => setTimeout(resolve, 550));
    const override = settings().evaluator;
    if (override === 'technical-error') throw new Error('Simulated evaluator failure');
    if (override !== 'auto') return { accepted: override === 'accept', diagnostics: [`Developer forced ${override}.`] };
    const value = text.toLowerCase();
    let accepted = false;
    const diagnostics: string[] = [];
    if (field === 'prediction') accepted = !!text.trim();
    if (field === 'cl') accepted = /spin|rotat|angular|turns? (faster|slower)/.test(value);
    if (field === 'rho') accepted = /dens|per (unit )?volume|amount of (air|fluid)|more (air|fluid|particles)|number of (air )?(lines|particles)|packed/.test(value);
    if (field === 'v') accepted = /speed|velocity|fast|slow/.test(value) && !/only spin|spin speed|rotation speed|rotational/.test(value);
    if (field === 'area') accepted = /area|size|radius|radii|diameter|bigger|larger|smaller/.test(value);
    if (field === 'explanation') {
      const spin = /spin|rotat|turning/.test(value);
      const belt = /belt|treadmill|direction|speed/.test(value);
      const deflection = /curv|deflect|bend|path|force|left|right/.test(value);
      const relation = /because|caus|make|lead|result|chang|produc|due|so |which|affect/.test(value);
      accepted = spin && belt && deflection && relation;
      if (!spin || !belt || !relation) diagnostics.push('Belt direction/speed to rotation connection not identified by development checker.');
      if (!spin || !deflection || !relation) diagnostics.push('Rotation to deflection connection not identified by development checker.');
    }
    if (!accepted && !diagnostics.length) diagnostics.push(`Development checker did not recognize the ${field} description.`);
    return { accepted, diagnostics };
  } };
}

const questions: Record<HelpTarget, string> = {
  prediction: 'What do you notice just after contact? Record a tentative prediction based on that observation.',
  explanation: 'Compare the markings on the ball before and after contact. How could that change relate to the later change in its path?',
  cl: 'Compare the markings on the sphere at the two ends of this slider. What changes while its centre stays in the same place?',
  rho: 'Compare the space around the sphere at two settings. What changes about the air lines you can see?',
  v: 'Follow one air line across the scene at two settings. What changes about its movement?',
  area: 'Compare the outline of the sphere at two settings. What changes about the space it occupies?',
  'treadmill-direction': 'Run the simulation with the opposite treadmill direction. What changes about the ball’s rotation and the direction its rising path curves?',
  'treadmill-speed': 'Keep the direction fixed and compare two treadmill speeds. What changes about the ball’s rotation and its rising path?',
  'slider-cl': 'Compare the markings on the sphere at the two ends of this slider. What changes while its centre stays in the same place?',
  'slider-rho': 'Compare the space around the sphere at two settings of this slider. What changes about the air lines you can see?',
  'slider-v': 'Follow one air line across the scene at two settings of this slider. What changes about its movement?',
  'slider-area': 'Compare the outline of the sphere at two settings of this slider. What changes about the space it occupies?',
  'treadmill-scene': 'What changes at contact, and what changes later while the ball is in the air?',
  'formula-scene': 'Try changing one slider while leaving the others where they are. Which visible part of the scene responds?',
  introduction: 'Can you trace the connection from the moving surface to the pressure pattern and then to the direction of force?',
};

export function developmentTutor(settings: () => DeveloperSettings): Tutor {
  return { async assess(context: GuidanceContext, requested) {
    await new Promise(resolve => setTimeout(resolve, 450));
    const override = settings().tutor;
    if (override === 'technical-error') throw new Error('Simulated tutor failure');
    let target = context.target;
    if (target === 'formula-scene') {
      const field = (['cl', 'rho', 'v', 'area'] as const).find(field => !['accepted', 'revealed'].includes(context.outcomes[field] ?? 'editable'));
      if (field) target = `slider-${field}`;
    }
    if (target === 'explanation' || target === 'treadmill-scene') target = 'treadmill-direction';
    const field = targetField(target);
    const unresolved = !field || !['accepted', 'revealed'].includes(context.outcomes[field] ?? 'editable');
    // Only a demonstration of context-aware help/wait outcomes. The future LLM owns this decision.
    const thinking = { short: 35_000, balanced: 75_000, extended: 120_000 }[context.thinkingTime];
    const failed = context.checkedAnswers.some(check => !check.accepted);
    const experimenting = context.recentInteractions.some(event => event.kind === 'slider' || event.kind === 'run');
    const hasDraft = Object.values(context.drafts).some(text => text?.trim());
    const sufficientContext = failed || (experimenting && hasDraft);
    const repeated = context.priorGuidance.some(message => message.target === target);
    const help = override === 'help' || (override !== 'wait' && (requested ||
      (unresolved && sufficientContext && !repeated && context.timeWithoutProgressMs >= thinking)));
    return { decision: help ? 'help' : 'wait', target, message: help ? questions[target] : '' };
  } };
}
