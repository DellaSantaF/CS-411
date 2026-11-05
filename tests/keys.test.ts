import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

test('key generation assigns opaque keys and random IDs without storing raw keys in the server mapping', async () => {
  const root = resolve('test-results'); await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'keys-'));
  try {
    for (const condition of ['reactive', 'proactive']) {
      execFileSync(process.execPath, [resolve('scripts/create-keys.mjs'), '--condition', condition, '--count', '2'], { cwd: directory });
    }
    const mapping = JSON.parse(await readFile(join(directory, 'participants.local.json'), 'utf8'));
    assert.equal(mapping.length, 4); assert.equal(new Set(mapping.map((p: any) => p.participantId)).size, 4);
    for (const filename of (await readdir(directory)).filter(name => name.endsWith('.csv'))) {
      const rows = (await readFile(join(directory, filename), 'utf8')).trim().split('\n').slice(1);
      assert.equal(rows.length, 2);
      for (const row of rows) {
        const [key, id, condition] = row.split(',');
        assert.match(key, /^[0-9A-F]{16}$/); assert.match(id, /^[0-9a-f-]{36}$/);
        const record = mapping.find((p: any) => p.keyHash === createHash('sha256').update(key).digest('hex'));
        assert.equal(record.participantId, id); assert.equal(record.condition, condition);
        assert.equal(JSON.stringify(mapping).includes(key), false);
      }
    }
  } finally {
    // Verify the absolute target remains inside the isolated test fixture before recursive cleanup.
    assert.ok(resolve(directory).startsWith(root + sep));
    await rm(directory, { recursive: true });
  }
});
