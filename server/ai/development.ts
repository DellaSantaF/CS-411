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
    if (field === 'cl') accepted = /lift coefficient|spin|rotation|angular/.test(value) || /(?:ball|sphere).*(?:rotat|turn)|(?:rotat|turn).*(?:ball|sphere)/.test(value);
    if (field === 'rho') accepted = /^(?:the )?(?:fluid |air )?density[.!]?$/.test(value.trim()) || /(?:air|fluid|particles).*(?:dens|per (unit )?volume|same (space|volume)|packed)|(?:dens|amount|more|less|number|packed).*(?:air|fluid|particles)/.test(value);
    if (field === 'v') accepted = /speed|velocity|fast|slow/.test(value) && /ball|sphere|air(?! (?:lines|dashes|arrows))|fluid|translat/.test(value) && !/only spin|spin speed|rotation speed|rotational/.test(value);
    if (field === 'area') accepted = /cross.section|radius|radii|diameter/.test(value) || /^(?:the )?(?:area|size)[.!]?$/.test(value.trim()) || /(?:ball|sphere).*(?:area|size|bigger|larger|smaller)|(?:area|size|bigger|larger|smaller).*(?:ball|sphere)/.test(value);
    if (field === 'explanation') {
      const spin = /spin|rotat|turning/.test(value);
      const belt = /belt|treadmill|direction|speed/.test(value);
      const deflection = /curv|deflect|bend|path|force|left|right/.test(value);
      const relation = /because|caus|make|lead|result|chang|produc|due|so |which|affect/.test(value);
      accepted = spin && belt && deflection && relation && /opposite|against|other (way|direction)/.test(value);
      if (!accepted) diagnostics.push('Expected spin causing curvature opposite to the treadmill.');
      if (!spin || !deflection || !relation) diagnostics.push('Rotation to deflection connection not identified by development checker.');
    }
    if (!accepted && !diagnostics.length) diagnostics.push(`Development checker did not recognize the ${field} description.`);
        const feedback = accepted ? '' : field === 'v' && /speed|velocity|fast|slow/.test(value) ? 'The speed of what exactly?' : field === 'rho' && /air|lines|particles/.test(value) ? 'What changes about how much is in the same space?' : field === 'explanation' && /spin|rotat/.test(value) ? 'You noticed the spin. Which way does the path curve compared with the treadmill?' : 'What physical property of the ball or surrounding air does that visible change represent?';
    return { accepted, diagnostics, feedback };
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
        let message = questions[target];
    if (requested && target.startsWith('slider-')) {
      if (!context.exploredControls?.includes(target)) message = 'Try moving this slider first and observe what changes in the scene. What do you notice at two different settings?';
      else if (context.drafts[field!]?.trim()) message = `You wrote “${context.drafts[field!]!.slice(0, 120)}”. Compare two settings again: which visible change supports that description?`;
      else if (repeated) message = 'Move this slider between its two ends while keeping the others fixed. Describe the one visible change you can follow.';
    }
    if (target === 'treadmill-speed' && context.treadmill) {
      const { controls, observedRun } = context.treadmill;
      message = controls.beltSpeed !== observedRun.beltSpeed || controls.direction !== observedRun.direction ? `The selected speed is ${controls.beltSpeed} m/s; the last run used ${observedRun.beltSpeed} m/s. Select Run again to observe the selected settings. What changes in the path?` : `The current run used ${controls.beltSpeed} m/s. Compare it with ${controls.beltSpeed >= 10 ? 'a lower' : 'another'} speed. What changes in the path?`;
    }
    return { decision: help ? 'help' : 'wait', target, message: help ? message : '' };
  } };
}
