import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createActivityServer } from '../server/index.ts';
import type { GuidanceContext } from '../server/ai/contracts.ts';

test('live routing, private diagnostics, repeat caching, bounded calls and no simulated overrides', async t => {
  let evaluations = 0;
  const contexts: GuidanceContext[] = [];
  const server = await createActivityServer({ developerEnabled: true, maxLiveCalls: 3, providers: {
    mode: 'live', evaluator: () => ({ async evaluate() { evaluations++; return { accepted: false, diagnostics: ['private missing concept'] }; } }),
    tutor: () => ({ async assess(context) { contexts.push(context); return { decision: 'wait', target: context.target, message: '' }; } }),
  } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/`;
  async function call(path: string, data?: unknown, token = '', method = 'POST') {
    const response = await fetch(base + path, { method: data === undefined ? 'GET' : method, headers: { authorization: `Bearer ${token}` }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    return { status: response.status, value: await response.json() };
  }
  const { value: session } = await call('session', { key: 'DEMO-P9M4' });
  assert.equal(session.session.aiMode, 'live');
  const answer = { field: 'rho', text: 'wind', revision: 1 };
  const result = await call('evaluate', answer, session.token);
  assert.equal(result.value.mode, 'live'); assert.equal('diagnostics' in result.value, false);
  await call('evaluate', { ...answer, revision: 2 }, session.token);
  assert.equal(evaluations, 1, 'identical answer uses cached result with new revision');
  const context = { stage: 'formula', phase: 'exploration', target: 'formula-scene', drafts: { rho: 'wind', explanation: 'previous task must be excluded' }, outcomes: {}, parameters: {}, recentInteractions: [], elapsedMs: 100000, timeWithoutProgressMs: 100000 };
  await call('tutor', { requested: false, context }, session.token);
  assert.equal(contexts[0].drafts.explanation, undefined);
  assert.equal(contexts[0].checkedAnswers[0].diagnostics[0], 'private missing concept');
  await call('tutor', { requested: false, context }, session.token);
  assert.equal(contexts.length, 1, 'proactive calls are limited on the server too');
  await call('evaluate', { ...answer, text: 'new answer' }, session.token);
  assert.equal((await call('evaluate', { ...answer, text: 'another answer' }, session.token)).status, 429);
  const { value: details } = await call('developer', undefined, session.token);
  assert.equal(details.checks.length, 3, 'rate limit adds no learning attempt');
  assert.deepEqual(details.aiRequests, { used: 3, limit: 3 });
  assert.equal((await call('developer', { ...details.settings, evaluator: 'accept' }, session.token, 'PATCH')).status, 400);
});
