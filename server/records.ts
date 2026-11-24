import { createHash, timingSafeEqual } from 'node:crypto';
import type { SessionInfo } from '../src/shared/contracts.ts';
import type { Storage } from './storage.ts';

export type Participant = { keyHash: string; participantId: string; condition: SessionInfo['condition'] };
export const keyHash = (key: string) => createHash('sha256').update(key.trim().toUpperCase()).digest('hex');
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function isAdmin(header: string | null, secret: string | undefined) {
  return !!secret && timingSafeEqual(Buffer.from(tokenHash(header ?? '')), Buffer.from(tokenHash(`Bearer ${secret}`)));
}
export function validateParticipants(data: unknown): Participant[] {
  if (!Array.isArray(data) || data.length < 1 || data.length > 2000) throw new Error('Upload a mapping array with 1–2000 participants.');
  const hashes = new Set(), ids = new Set();
  for (const p of data) {
    if (!p || !/^[a-f0-9]{64}$/.test(p.keyHash) || typeof p.participantId !== 'string'
      || !/^[a-f0-9-]{36}$/.test(p.participantId) || !['reactive', 'proactive'].includes(p.condition)
      || hashes.has(p.keyHash) || ids.has(p.participantId) || Object.keys(p).some(k => !['keyHash', 'participantId', 'condition'].includes(k))) {
      throw new Error('Invalid or duplicate participant mapping. Use the key generator’s hashed JSON file.');
    }
    hashes.add(p.keyHash); ids.add(p.participantId);
  }
  return data;
}
export async function importParticipants(storage: Storage, incoming: Participant[]) {
  const existing = await storage.list<Participant>('participants');
  for (const p of incoming) {
    if (existing.some(old => (old.keyHash === p.keyHash || old.participantId === p.participantId)
      && (old.keyHash !== p.keyHash || old.participantId !== p.participantId || old.condition !== p.condition))) throw new Error('Existing participant identity/condition cannot be changed.');
  }
  for (const p of incoming) {
    if (!await storage.create('participants', p.keyHash, p)) {
      const old = await storage.get<Participant>('participants', p.keyHash);
      if (old?.participantId !== p.participantId || old?.condition !== p.condition) throw new Error('Conflicting mapping.');
    }
  }
  return { imported: incoming.length, reactive: incoming.filter(p => p.condition === 'reactive').length, proactive: incoming.filter(p => p.condition === 'proactive').length };
}

export type Event = {
  event_id: string; participant_id: string; session_id: string; condition: string;
  server_time: string; event_type: string; stage: string; target?: string; text?: string;
  result?: string; details?: string;
};
export const sessionColumns = ['participant_id', 'session_id', 'condition', 'started_at', 'stage', 'ai_calls_used', 'ai_call_limit', 'ai_limit_reached', 'ai_limit_reached_at', 'attempt_ended', 'technical_error'];
export const eventColumns = ['event_id', 'participant_id', 'session_id', 'condition', 'server_time', 'event_type', 'stage', 'target', 'text', 'result', 'details'];
export function csv(columns: string[], rows: Record<string, unknown>[]) {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    // Apply to every cell: leading whitespace/control characters cannot disguise formulas.
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [columns.map(cell).join(','), ...rows.map(row => columns.map(c => cell(row[c])).join(','))].join('\r\n') + '\r\n';
}
