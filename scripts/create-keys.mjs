import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const argument = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const condition = argument('--condition');
const count = Number(argument('--count') ?? '1');
if (!['reactive', 'proactive'].includes(condition) || !Number.isInteger(count) || count < 1 || count > 1000) {
  console.error('Usage: npm run keys -- --condition reactive|proactive --count 10'); process.exit(1);
}
let mapping = [];
try { mapping = JSON.parse(await readFile('participants.local.json', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const rows = ['participant_key,participant_id,condition'];
for (let i = 0; i < count; i++) {
  const key = randomBytes(8).toString('hex').toUpperCase();
  const participantId = randomUUID();
  mapping.push({ keyHash: createHash('sha256').update(key).digest('hex'), participantId, condition });
  rows.push(`${key},${participantId},${condition}`);
}
await writeFile('participants.local.json', JSON.stringify(mapping, null, 2));
const output = `participant-keys-${condition}-${Date.now()}.csv`;
await writeFile(output, rows.join('\n') + '\n');
console.log(`Created ${count} keys in ${output}. Keep this private. Restart the API server to load the updated mapping.`);
