import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { openAIEvaluator, openAITutor } from '../server/ai/openai.ts';
import { physicsExcerpts } from '../server/ai/physics.ts';
import { providersFromEnvironment } from '../server/ai/providers.ts';
import type { GuidanceContext } from '../server/ai/contracts.ts';

const context: GuidanceContext = { stage: 'formula', phase: 'exploration', target: 'slider-rho', drafts: { rho: 'I am unsure' }, outcomes: {}, parameters: { cl: .3, rho: 1.2, v: 8, area: .03 }, recentInteractions: [], elapsedMs: 60000, timeWithoutProgressMs: 60000, priorGuidance: [], checkedAnswers: [], condition: 'reactive', thinkingTime: 'balanced' };
function mock(value: unknown, status = 'completed') {
  const requests: Record<string, any>[] = [];
  const transport: typeof fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ id: 'resp_test', object: 'response', status, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(value), annotations: [] }] }] }), { headers: { 'content-type': 'application/json' } });
  };
  return { requests, options: { apiKey: 'test-key-never-sent', model: 'gpt-6-luna', physicsExcerpt: 'Reviewed test context', fetch: transport } };
}
test('Responses requests use requested model, low reasoning, bounded outputs, strict JSON, and no storage', async () => {
  const evaluator = mock({ accepted: false, diagnostics: ['Negates the required idea.'] });
  assert.equal((await openAIEvaluator(evaluator.options).evaluate({ field: 'cl', text: 'It does not change rotation.', revision: 1 })).accepted, false);
  const tutor = mock({ decision: 'help', target: 'slider-rho', message: 'Compare the lines before and after moving this slider. What changes?' });
  await openAITutor(tutor.options).assess(context, true);
  for (const request of [...evaluator.requests, ...tutor.requests]) {
    assert.equal(request.model, 'gpt-6-luna');
    assert.deepEqual(request.reasoning, { effort: 'low' });
    assert.equal(request.store, false);
    assert.ok(request.max_output_tokens <= 1000);
    assert.equal(request.text.format.strict, true);
    assert.equal('previous_response_id' in request, false);
  }
  assert.deepEqual(tutor.requests[0].text.format.schema.properties.target.enum, ['slider-rho']);
});
test('incomplete, malformed, out-of-scope and resolved-target replies are technical failures', async () => {
  for (const [value, status] of [[{ accepted: true, diagnostics: [] }, 'incomplete'], [{ accepted: 'yes', diagnostics: [] }, 'completed']] as const) {
    await assert.rejects(openAIEvaluator(mock(value, status).options).evaluate({ field: 'rho', text: 'air per volume', revision: 1 }));
  }
  await assert.rejects(openAITutor(mock({ decision: 'help', target: 'slider-area', message: 'Look here' }).options).assess(context, true));
  await assert.rejects(openAITutor(mock({ decision: 'help', target: 'slider-rho', message: 'Look here' }).options).assess({ ...context, outcomes: { rho: 'accepted' } }, false));
  const wait = await openAITutor(mock({ decision: 'wait', target: 'slider-rho', message: '' }).options).assess(context, false);
  assert.equal(wait.decision, 'wait');
});
test('provider errors are not automatically retried', async () => {
  let calls = 0;
  const options = mock({}).options;
  options.fetch = async () => { calls++; return new Response('{"error":{"message":"Rate limited"}}', { status: 429, headers: { 'content-type': 'application/json' } }); };
  await assert.rejects(openAIEvaluator(options).evaluate({ field: 'rho', text: 'air per volume', revision: 1 }));
  assert.equal(calls, 1);
});
test('physics excerpts exclude obsolete force-view controls', async () => {
  const excerpts = physicsExcerpts(await readFile(new URL('../magnus_effect_physics_reference.md', import.meta.url), 'utf8'));
  assert.match(excerpts.treadmill, /friction/);
  assert.match(excerpts.formula, /exactly four controls/);
  assert.doesNotMatch(excerpts.formula, /v_\{\\text\{ball\}\}/);
  assert.throws(() => physicsExcerpts('incomplete source'));
});
test('live activation fails without a key and development remains explicit', async t => {
  const previous = { mode: process.env.AI_MODE, key: process.env.OPENAI_API_KEY };
  t.after(() => {
    if (previous.mode === undefined) delete process.env.AI_MODE; else process.env.AI_MODE = previous.mode;
    if (previous.key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous.key;
  });
  process.env.AI_MODE = 'live'; delete process.env.OPENAI_API_KEY;
  await assert.rejects(providersFromEnvironment(), /API key/);
  process.env.AI_MODE = 'invalid';
  await assert.rejects(providersFromEnvironment(), /AI_MODE/);
  process.env.AI_MODE = 'development'; process.env.OPENAI_API_KEY = 'unused-test-value';
  assert.equal((await providersFromEnvironment()).mode, 'development');
});
