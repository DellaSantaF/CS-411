import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { BlobsServer } from '@netlify/blobs/server';
import { setEnvironmentContext } from '@netlify/blobs';
import { zipFunctions } from '@netlify/zip-it-and-ship-it';

const root = resolve('test-results'); await mkdir(root, { recursive: true });
const destination = await mkdtemp(join(root, 'functions-'));
// Mirrors the committed Netlify settings. Unpacked output allows checking actual assets.
const functions = await zipFunctions(resolve('netlify/functions'), destination, {
  basePath: resolve('.'), repositoryRoot: resolve('.'), archiveFormat: 'none',
  config: { '*': { nodeBundler: 'esbuild', nodeVersion: '24', includedFiles: ['magnus_effect_physics_reference.md'], includedFilesBasePath: resolve('.') } },
});
assert.equal(functions.length, 1); assert.equal(functions[0].name, 'api');
assert.equal(functions[0].runtimeAPIVersion, 2);
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const contents = await files(destination);
const reference = contents.find(file => file.endsWith('magnus_effect_physics_reference.md'));
assert.ok(reference, 'physics reference is in the function artifact');
assert.equal(await readFile(reference, 'utf8'), await readFile('magnus_effect_physics_reference.md', 'utf8'));
assert.equal(contents.some(file => /(?:^|[\\/])(?:\.env(?:\..*)?|participants\.local\.json|participant-keys.*\.csv)$/.test(file)), false, 'private files are excluded');
console.log('Netlify api function packaged; exact physics reference included; private files excluded.');

const emulator = new BlobsServer({ directory: join(destination, 'emulator'), token: 'bundle-test', logger: () => {} });
const { port } = await emulator.start();
const base = `http://127.0.0.1:${port}`;
setEnvironmentContext({ siteID: 'bundle-test', token: 'bundle-test', apiURL: base, edgeURL: base, uncachedEdgeURL: base });
process.env.AI_MODE = 'live'; process.env.OPENAI_API_KEY = 'not-a-real-key'; process.env.OPENAI_MODEL = 'gpt-6-luna';
process.env.ADMIN_SECRET = 'bundle-test-only'; process.env.DEVELOPER_TOOLS = '0';
// Exercise live initialization/physics loading but forbid any external/billable request.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input);
  assert.equal(url.origin, base, 'bundle verification cannot call a paid provider');
  return originalFetch(input, options);
};
try {
  const entry = contents.find(file => file.endsWith(join('netlify', 'functions', 'api.mjs')));
  assert.ok(entry);
  const { default: handler } = await import(pathToFileURL(entry));
  process.chdir(dirname(reference)); // Match deployed /var/task, away from the source tree.
  const call = (path, data, admin = false) => handler(new Request(`http://activity.test${path}`, { method: data ? 'POST' : 'GET', headers: admin ? { authorization: 'Bearer bundle-test-only' } : {}, ...(data ? { body: JSON.stringify(data) } : {}) }));
  const participant = { keyHash: createHash('sha256').update('BUNDLE-TEST').digest('hex'), participantId: randomUUID(), condition: 'reactive' };
  assert.equal((await call('/.netlify/functions/api/admin/import', { participants: [participant] }, true)).status, 200);
  const session = await (await call('/api/session', { key: 'BUNDLE-TEST' })).json();
  assert.equal(session.session.aiMode, 'live'); assert.equal(session.session.condition, 'reactive');
  assert.equal((await call('/api/session', { key: 'DEMO-R7K2' })).status, 400);
  assert.equal((await call('/api/admin/sessions')).status, 401);
  console.log('Packaged function loaded live physics and Blobs, imported mapping and created session; zero provider calls.');
} finally { await emulator.stop(); }
