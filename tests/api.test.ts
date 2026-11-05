import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityServer } from '../server/index.ts';
import { openAIEvaluator, openAITutor } from '../server/ai/openai.ts';
import type { AddressInfo } from 'node:net';

test('session assignment, Check-only evaluation privacy, technical failure, and condition boundaries', async t => {
  const server = await createActivityServer({ developerEnabled: true });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/`;
  const call = async (path: string, token = '', data?: unknown, method = 'POST') => {
    const response = await fetch(base + path, { method: data === undefined ? 'GET' : method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    return { status: response.status, value: await response.json() };
  };
  assert.equal((await call('session', '', { key: 'invalid' })).status, 400);
  const r1 = (await call('session', '', { key: 'DEMO-R7K2' })).value;
  const r2 = (await call('session', '', { key: 'DEMO-R7K2' })).value;
  const proactive = (await call('session', '', { key: 'DEMO-P9M4' })).value;
  assert.equal(r1.session.condition, 'reactive'); assert.equal(proactive.session.condition, 'proactive');
  assert.match(r1.session.participantId, /^[0-9a-f-]{36}$/);
  assert.equal(r1.session.participantId, r2.session.participantId);
  assert.notEqual(r1.session.sessionId, r2.session.sessionId);
  assert.equal(r1.session.skipSeconds, 240);
  assert.equal((await call('developer', r1.token)).value.checks.length, 0);
  const rejected = await call('evaluate', r1.token, { field: 'explanation', text: 'The belt pushes it sideways.', revision: 1 });
  assert.equal(rejected.value.accepted, false); assert.equal('diagnostics' in rejected.value, false);
  let details = (await call('developer', r1.token)).value;
  assert.equal(details.checks.length, 1); assert.ok(details.checks[0].diagnostics.length);
  assert.equal(details.guidance.length, 0, 'unsuccessful reactive Check never invokes tutoring');
  await call('developer', r1.token, { ...details.settings, evaluator: 'technical-error' }, 'PATCH');
  assert.equal((await call('evaluate', r1.token, { field: 'cl', text: 'rotation', revision: 0 })).status, 503);
  details = (await call('developer', r1.token)).value;
  assert.equal(details.checks.length, 1, 'technical errors are not unsuccessful learning attempts');
  await call('developer', r1.token, { ...details.settings, evaluator: 'auto', tutor: 'help' }, 'PATCH');
  const context = { stage: 'formula', phase: 'exploration', target: 'slider-cl', drafts: { cl: 'I see movement' }, outcomes: {}, parameters: { cl: .3, rho: 1.2, v: 8, area: .03 }, recentInteractions: [], elapsedMs: 60000, timeWithoutProgressMs: 60000 };
  const help = await call('tutor', r1.token, { requested: true, context });
  assert.equal(help.value.decision, 'help'); assert.equal(help.value.target, 'slider-cl');
  assert.equal((await call('tutor', r1.token, { requested: true, context: { ...context, target: 'cl' } })).status, 400, 'reactive requests must name an interactive control');
  assert.equal((await call('tutor', r1.token, { requested: true, context: { ...context, target: 'treadmill-speed' } })).status, 400, 'controls must belong to the current stage');
  for (const target of ['slider-rho', 'slider-v', 'slider-area']) {
    const result = await call('tutor', r1.token, { requested: true, context: { ...context, target } });
    assert.equal(result.value.target, target);
  }
  for (const target of ['treadmill-direction', 'treadmill-speed']) {
    const result = await call('tutor', r1.token, { requested: true, context: { ...context, stage: 'treadmill', target,
      treadmill: { controls: { beltSpeed: 10, direction: -1 }, observedRun: { beltSpeed: 8, direction: 1 } } } });
    assert.equal(result.value.target, target);
    assert.match(result.value.message, target.endsWith('speed') ? /speed/ : /direction/);
  }
  assert.equal('accepted' in help.value, false); assert.equal('diagnostics' in help.value, false);
  assert.equal((await call('tutor', proactive.token, { requested: true, context })).status, 403);
  assert.equal((await call('tutor', r1.token, { requested: false, context })).status, 403);
  const waiting = await call('tutor', proactive.token, { requested: false, context: { ...context, elapsedMs: 1000, timeWithoutProgressMs: 1000 } });
  assert.equal(waiting.value.decision, 'wait');
  const timeAlone = await call('tutor', proactive.token, { requested: false, context: { ...context, elapsedMs: 200000, timeWithoutProgressMs: 200000 } });
  assert.equal(timeAlone.value.decision, 'wait', 'elapsed time alone does not produce an automatic development intervention');
  const behavioral = await call('tutor', proactive.token, { requested: false, context: { ...context, elapsedMs: 200000, timeWithoutProgressMs: 200000,
    recentInteractions: [{ kind: 'slider', target: 'cl', value: '0.4', at: 1000 }] } });
  assert.equal(behavioral.value.decision, 'help', 'the substitute demonstrates using draft, interaction, and progress context together');
  await call('evaluate', proactive.token, { field: 'explanation', text: 'I am unsure.', revision: 0 });
  const controlContext = { ...context, stage: 'treadmill', target: 'treadmill-speed', drafts: {}, elapsedMs: 200000, timeWithoutProgressMs: 200000 };
  const diagnosticHelp = await call('tutor', proactive.token, { requested: false, context: controlContext });
  assert.equal(diagnosticHelp.value.decision, 'help', 'control targets receive private diagnostics from their associated task');
  assert.equal(diagnosticHelp.value.target, 'treadmill-speed');
  const unrelated = await call('tutor', proactive.token, { requested: false, context: { ...context, target: 'slider-rho', drafts: {}, timeWithoutProgressMs: 200000 } });
  assert.equal(unrelated.value.decision, 'wait', 'unrelated task diagnostics cannot trigger control guidance');
});
test('developer routes and demo keys can be disabled', async t => {
  const server = await createActivityServer({ developerEnabled: false });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  assert.equal((await fetch(base + '/developer')).status, 404);
  assert.equal((await fetch(base + '/api/session', { method: 'POST', body: JSON.stringify({ key: 'DEMO-R7K2' }) })).status, 400);
});
test('future OpenAI providers require explicit integration materials', () => {
  assert.throws(() => openAIEvaluator({ apiKey: '', model: '', physicsExcerpt: '' }));
  assert.throws(() => openAITutor({ apiKey: '', model: '', physicsExcerpt: '' }));
});
