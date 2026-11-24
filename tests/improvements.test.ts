import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentEvaluator, developmentTutor } from '../server/ai/development.ts';
import { protectGuidance } from '../server/ai/guidance.ts';
import type { GuidanceContext } from '../server/ai/contracts.ts';
import { initialParameters, visualMapping } from '../src/physics/formula.ts';
const settings = () => ({ skipSeconds: 240, thinkingTime: 'balanced' as const, evaluator: 'auto' as const, tutor: 'auto' as const });
const context: GuidanceContext = { stage: 'formula', phase: 'exploration', target: 'slider-rho', drafts: {}, outcomes: {}, parameters: initialParameters(), exploredControls: [], recentInteractions: [], elapsedMs: 0, timeWithoutProgressMs: 0, priorGuidance: [], checkedAnswers: [], condition: 'reactive', thinkingTime: 'balanced' };
test('intuitive spin and general opposite-curvature explanation count; vague speed needs precision', async () => {
  const evaluator = developmentEvaluator(settings);
  for (const [field, text, accepted] of [ ['cl', 'the spin', true], ['explanation', 'The ball curves opposite to the treadmill because it is spinning.', true], ['explanation', 'The belt pushes it sideways.', false], ['v', 'the speed', false], ['v', 'the speed of the ball through air', true] ] as const) {
    const result = await evaluator.evaluate({ field, text, revision: 1 }); assert.equal(result.accepted, accepted, text);
    if (text === 'the speed') assert.equal(result.feedback, 'The speed of what exactly?');
  }
});
test('guidance changes with exploration, draft and selected versus observed treadmill speed', async () => {
  const tutor = developmentTutor(settings);
  assert.match((await tutor.assess(context, true)).message, /moving this slider first/);
  assert.match((await tutor.assess({ ...context, exploredControls: ['slider-rho'], drafts: { rho: 'more lines' } }, true)).message, /more lines/);
  const message = (await tutor.assess({ ...context, stage: 'treadmill', target: 'treadmill-speed', treadmill: { controls: { beltSpeed: 10, direction: 1 }, observedRun: { beltSpeed: 8, direction: 1 } } }, true)).message;
  assert.match(message, /selected speed is 10/); assert.match(message, /Run again/);
});
test('hidden parameter names and units are protected, revealed parameters can be discussed', () => {
  const hint = { decision: 'help' as const, target: 'slider-rho' as const, message: 'Consider density in kg/m³.' };
  assert.doesNotMatch(protectGuidance(hint, context).message, /density|kg/);
  assert.equal(protectGuidance(hint, { ...context, outcomes: { rho: 'accepted' } }).message, hint.message);
});
test('airflow animation is proportional to the actual velocity', () => {
  assert.ok(Math.abs(visualMapping({ ...initialParameters(), v: 12 }).airflowSpeed / visualMapping({ ...initialParameters(), v: 4 }).airflowSpeed - 3) < 1e-12);
});

test('treadmill reveal gives fifty percent more time than formula discovery', async () => {
  const { taskRevealSeconds } = await import('../src/state.ts');
  assert.equal(taskRevealSeconds(240, 'explanation'), 360);
  assert.equal(taskRevealSeconds(240, 'formula'), 240);
  assert.equal(taskRevealSeconds(10, 'explanation'), 15);
});

test('airflow preserves the reviewed one-tenth visual time scale relative to physical ball size', () => {
  for (const area of [.01, .03, .05]) {
    const visual = visualMapping({ ...initialParameters(), area });
    const unitsPerMetre = visual.radius / Math.sqrt(area / Math.PI);
    assert.ok(Math.abs(visual.airflowSpeed / unitsPerMetre - .8) < 1e-12);
  }
});

test('formula discovery requires physical meaning beyond changes to graphics', async () => {
  const evaluator = developmentEvaluator(settings);
  const cases = [
    ['cl', 'The stripes turn faster.', false], ['cl', 'the spin', true],
    ['rho', 'There are more lines.', false], ['rho', 'The lines get denser.', false], ['rho', 'More air in the same volume.', true],
    ['v', 'The lines move faster.', false], ['v', 'The air lines move faster.', false], ['v', 'The speed of air past the ball.', true],
    ['area', 'The circle gets bigger.', false], ['area', 'The size of the ball.', true],
  ] as const;
  for (const [field, text, accepted] of cases) {
    assert.equal((await evaluator.evaluate({ field, text, revision: 1 })).accepted, accepted, text);
  }
});
