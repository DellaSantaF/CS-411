import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { BlobsServer } from '@netlify/blobs/server';
import { createActivityHandler } from '../server/activity.ts';
import { blobStorage, memoryStorage } from '../server/storage.ts';
import type { Storage } from '../server/storage.ts';
import { csv, keyHash, tokenHash } from '../server/records.ts';
import type { Providers } from '../server/ai/providers.ts';
import type { GuidanceContext } from '../server/ai/contracts.ts';
import { requestQueue } from '../src/request-queue.ts';

const secret = 'test-only-researcher-password';
const mapping = [
  { keyHash: keyHash('R-TEST'), participantId: randomUUID(), condition: 'reactive' },
  { keyHash: keyHash('P-TEST'), participantId: randomUUID(), condition: 'proactive' },
];
const snapshot = { stage: 'formula', phase: 'exploration', target: 'formula-scene', drafts: {}, outcomes: {}, parameters: {}, recentInteractions: [], elapsedMs: 100000, timeWithoutProgressMs: 100000 };
const mock = (contexts: GuidanceContext[] = []): Providers => ({
  mode: 'live', evaluator: () => ({ async evaluate() { return { accepted: false, diagnostics: ['PRIVATE_DIAGNOSTIC'], feedback: 'What is moving?' }; } }),
  tutor: () => ({ async assess(context) { contexts.push(context); return { decision: 'wait', target: context.target, message: '' }; } }),
});
async function fixture(storage: Storage, providers = mock(), cap = 2) {
  // Deliberately construct a fresh handler for EVERY request, as separate functions do.
  return async (path: string, token = '', data?: unknown) => {
    const handler = await createActivityHandler({ storage, providers, developerEnabled: false, loadLocalMapping: false, adminSecret: secret, maxLiveCalls: cap });
    return handler(new Request(`http://activity.test/api/${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${token}` }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }));
  };
}

test('Blobs adapter persists fresh-instance authentication, isolated overlapping participants, context and exports', async t => {
  const root = resolve('test-results'); await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'blobs-'));
  const emulator = new BlobsServer({ directory, token: 'emulator-only', logger: () => {} });
  const { port } = await emulator.start();
  t.after(async () => { await emulator.stop(); assert.ok(resolve(directory).startsWith(root + sep)); await rm(directory, { recursive: true }); });
  const options = { apiURL: `http://127.0.0.1:${port}`, edgeURL: `http://127.0.0.1:${port}`, uncachedEdgeURL: `http://127.0.0.1:${port}`, siteID: 'local-fixture', token: 'emulator-only' };
  const contexts: GuidanceContext[] = [];
  const call = async (path: string, token = '', data?: unknown) => (await fixture(blobStorage(options), mock(contexts)))(path, token, data);
  assert.equal((await call('admin/import', '', { participants: mapping })).status, 401);
  assert.equal((await call('admin/import', secret, { participants: mapping })).status, 200);
  assert.equal((await call('admin/import', secret, { participants: mapping.map(p => ({ condition: p.condition, keyHash: p.keyHash, participantId: p.participantId })) })).status, 200);
  assert.equal((await call('admin/import', secret, { participants: [{ ...mapping[0], condition: 'proactive' }] })).status, 409);
  assert.equal((await call('session', '', { key: 'DEMO-R7K2' })).status, 400);
  const [r, p] = await Promise.all(['R-TEST', 'P-TEST'].map(async key => (await call('session', '', { key, condition: 'ignored' })).json()));
  assert.notEqual(r.session.sessionId, p.session.sessionId);
  assert.equal(r.session.condition, 'reactive'); assert.equal(p.session.condition, 'proactive');
  const again = await (await call('session', '', { key: 'R-TEST' })).json();
  assert.equal(again.session.participantId, r.session.participantId); assert.notEqual(again.session.sessionId, r.session.sessionId);
  assert.equal((await call('session', r.token)).status, 200);
  assert.equal((await call('admin/events.csv', r.token)).status, 401);
  assert.equal((await call('developer', r.token)).status, 404);
  const text = '=HYPERLINK("bad"),\nsecond line';
  const responses = await Promise.all([
    call('evaluate', r.token, { field: 'rho', text, revision: 1 }),
    call('evaluate', p.token, { field: 'cl', text: 'P answer', revision: 1 }),
  ]);
  for (const response of responses) { assert.equal(response.status, 200); assert.equal((await response.text()).includes('PRIVATE_DIAGNOSTIC'), false); }
  await call('evaluate', r.token, { field: 'rho', text, revision: 2 }); // cached, free
  await call('tutor', r.token, { requested: true, context: { ...snapshot, target: 'slider-rho' } }); // untouched slider, local/free
  assert.equal((await blobStorage(options).get<any>('sessions', tokenHash(r.token))).calls, 1);
  await call('tutor', p.token, { requested: false, context: { ...snapshot, drafts: { cl: 'P answer' } } }); // wait uses last allowance
  assert.equal(contexts[0].checkedAnswers[0].text, 'P answer');
  assert.equal(JSON.stringify(contexts).includes('HYPERLINK'), false);
  const stored = await blobStorage(options).get<any>('sessions', tokenHash(p.token));
  assert.equal(stored.calls, 2); assert.equal(stored.limitReached, true); assert.ok(stored.limitReachedAt);
  assert.equal(await blobStorage(options).get('sessions', p.token), null, 'raw bearer tokens are not lookup keys');
  assert.equal((await call('evaluate', p.token, { field: 'v', text: 'new', revision: 1 })).status, 429);
  const sessions = await (await call('admin/sessions.csv', secret)).text();
  const events = (await Promise.all([r, p, again].map(async s => (await call(`admin/events.csv?session_id=${s.session.sessionId}`, secret)).text()))).join('');
  assert.ok(sessions.includes('ai_limit_reached_at')); assert.ok(sessions.includes('"true"')); assert.ok(sessions.includes(again.session.sessionId), 'incomplete attempt exported');
  assert.ok(events.includes('ai_limit_blocked'), events); assert.ok(events.includes('tutor_wait')); assert.ok(events.includes('evaluation_result'));
  assert.ok(events.includes("'=HYPERLINK")); assert.ok(events.includes('""bad""')); assert.ok(events.includes('\nsecond line'));
  assert.equal((sessions + events).includes(r.token), false); assert.equal(events.includes('PRIVATE_DIAGNOSTIC'), false);
  const records = await blobStorage(options).list<any>('events');
  assert.equal(new Set(records.map(e => e.event_id)).size, records.length);
});

test('reservation, last allowance, failed provider and no replay across fresh handlers', async () => {
  const storage = memoryStorage(); let attempts = 0;
  const providers: Providers = { ...mock(), evaluator: () => ({ async evaluate() {
    attempts++;
    const sessions = await storage.list<any>('sessions');
    assert.equal(sessions[0].calls, 1); assert.equal(sessions[0].limitReached, true); assert.ok(sessions[0].limitReachedAt);
    throw new Error('private provider details');
  } }) };
  const call = await fixture(storage, providers, 1);
  await call('admin/import', secret, { participants: mapping });
  const session = await (await call('session', '', { key: 'R-TEST' })).json();
  const response = await call('evaluate', session.token, { field: 'rho', text: 'air', revision: 1 });
  assert.equal(response.status, 503); assert.equal((await response.text()).includes('private provider'), false);
  assert.equal((await call('evaluate', session.token, { field: 'rho', text: 'air', revision: 1 })).status, 409);
  assert.equal(attempts, 1);
  const events = await storage.list<any>('events');
  assert.ok(events.some(e => e.event_type === 'technical_error')); assert.equal(events.some(e => e.event_type === 'evaluation_result'), false);
  assert.ok((await (await call('admin/sessions.csv', secret)).text()).includes('"true"'));
});

test('failed reservation prevents provider invocation and ends attempt instead of memory fallback', async () => {
  const base = memoryStorage(); let fail = false, attempts = 0;
  const storage: Storage = { ...base, async put(n, k, value) { if (fail && n === 'sessions' && (value as any).calls === 1) throw new Error('storage unavailable'); await base.put(n, k, value); } };
  const call = await fixture(storage, { ...mock(), evaluator: () => ({ async evaluate() { attempts++; return { accepted: true, diagnostics: [] }; } }) });
  await call('admin/import', secret, { participants: mapping });
  const session = await (await call('session', '', { key: 'R-TEST' })).json(); fail = true;
  assert.equal((await call('evaluate', session.token, { field: 'rho', text: 'air', revision: 1 })).status, 503);
  assert.equal(attempts, 0);
  assert.equal((await call('evaluate', session.token, { field: 'rho', text: 'air', revision: 1 })).status, 409);
});

test('tab queue serializes all writers, permits other tabs and stops already queued work after ambiguity', async () => {
  const queue = requestQueue(), otherTab = requestQueue(); const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const first = queue.run(async () => { order.push('evaluate'); await gate; queue.stop('attempt ended'); throw new Error('timeout'); });
  const second = queue.run(async () => { order.push('tutor'); });
  const third = queue.run(async () => { order.push('record'); });
  const results = Promise.allSettled([first, second, third]);
  await otherTab.run(async () => { order.push('other participant'); });
  assert.deepEqual(order, ['evaluate', 'other participant']); release();
  assert.ok((await results).every(r => r.status === 'rejected'));
  assert.deepEqual(order, ['evaluate', 'other participant']);
});

test('successful queued checks and tutor mutations retain independent histories across handlers', async () => {
  const storage = memoryStorage(), queue = requestQueue();
  const providers: Providers = { ...mock(), tutor: () => ({ async assess(context) { return { decision: 'help', target: context.target, message: 'What do you observe?' }; } }) };
  const call = await fixture(storage, providers, 10);
  await call('admin/import', secret, { participants: mapping });
  const session = await (await call('session', '', { key: 'R-TEST' })).json();
  const responses = await Promise.all([
    queue.run(() => call('evaluate', session.token, { field: 'cl', text: 'rotation', revision: 1 })),
    queue.run(() => call('record', session.token, { stage: 'formula' })),
    queue.run(() => call('tutor', session.token, { requested: true, context: { ...snapshot, target: 'slider-cl', exploredControls: ['slider-cl'] } })),
    queue.run(() => call('evaluate', session.token, { field: 'rho', text: 'density', revision: 1 })),
  ]);
  assert.ok(responses.every(response => response.status === 200));
  const saved = await storage.get<any>('sessions', tokenHash(session.token));
  assert.deepEqual(saved.checks.map((check: any) => check.field), ['cl', 'rho']);
  assert.equal(saved.guidance.length, 1); assert.equal(saved.calls, 3); assert.equal(saved.stage, 'formula');
});

test('failed result persistence withholds success and prevents another provider call', async () => {
  const base = memoryStorage(); let attempts = 0;
  const storage: Storage = { ...base, async put(n, k, value) {
    if (n === 'events' && (value as any).event_type === 'evaluation_result') throw new Error('failed result write');
    await base.put(n, k, value);
  } };
  const call = await fixture(storage, { ...mock(), evaluator: () => ({ async evaluate() { attempts++; return { accepted: true, diagnostics: [] }; } }) });
  await call('admin/import', secret, { participants: mapping });
  const session = await (await call('session', '', { key: 'R-TEST' })).json();
  const answer = { field: 'rho', text: 'density', revision: 1 };
  assert.equal((await call('evaluate', session.token, answer)).status, 503);
  assert.equal((await call('evaluate', session.token, answer)).status, 409);
  assert.equal(attempts, 1);
  assert.equal((await storage.get<any>('sessions', tokenHash(session.token))).calls, 1);
});

test('CSV escapes quotes/newlines and neutralizes disguised learner formulas', () => {
  const value = csv(['text'], ['=1+1', '  @SUM(1)', '\t+1', '-1', 'a,"b"\nc'].map(text => ({ text })));
  assert.ok(value.includes("'=1+1")); assert.ok(value.includes("'  @SUM")); assert.ok(value.includes("'\t+1")); assert.ok(value.includes('a,""b""\nc'));
});
