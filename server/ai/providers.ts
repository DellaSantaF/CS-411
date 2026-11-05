import { readFile } from 'node:fs/promises';
import { developmentEvaluator, developmentTutor } from './development.ts';
import { openAIEvaluator, openAITutor, optionsFromEnvironment } from './openai.ts';
import { physicsExcerpts } from './physics.ts';
import type { DeveloperSettings } from '../../src/shared/contracts.ts';
import type { Evaluator, Tutor } from './contracts.ts';

export type Providers = { mode: 'development' | 'live'; evaluator: (settings: () => DeveloperSettings) => Evaluator; tutor: (settings: () => DeveloperSettings) => Tutor };
export async function providersFromEnvironment(): Promise<Providers> {
  const mode = process.env.AI_MODE?.trim() || 'development';
  if (mode === 'development') return { mode, evaluator: developmentEvaluator, tutor: developmentTutor };
  if (mode !== 'live') throw new Error('AI_MODE must be development or live.');
  const excerpts = physicsExcerpts(await readFile(new URL('../../magnus_effect_physics_reference.md', import.meta.url), 'utf8'));
  const evaluators = { treadmill: openAIEvaluator(optionsFromEnvironment('evaluator', excerpts.treadmill)), formula: openAIEvaluator(optionsFromEnvironment('evaluator', excerpts.formula)) };
  const tutors = { treadmill: openAITutor(optionsFromEnvironment('tutor', excerpts.treadmill)), formula: openAITutor(optionsFromEnvironment('tutor', excerpts.formula)) };
  // Live mode never mixes in forced development outcomes, even on the developer page.
  return { mode, evaluator: () => ({ evaluate: request => evaluators[['prediction', 'explanation'].includes(request.field) ? 'treadmill' : 'formula'].evaluate(request) }),
    tutor: () => ({ assess: (context, requested) => tutors[context.stage === 'formula' ? 'formula' : 'treadmill'].assess(context, requested) }) };
}
