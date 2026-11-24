import { useState } from 'react';

type Summary = { participant_id: string; session_id: string; condition: string; started_at: string; stage: string; ai_calls_used: number; ai_call_limit: number; ai_limit_reached: boolean; attempt_ended: boolean };
export function Admin() {
  // Password lives only in component memory. Never persisted, logged or put in a URL.
  const [secret, setSecret] = useState(''), [sessions, setSessions] = useState<Summary[]>([]);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function request(path: string, data?: unknown) {
    const response = await fetch('/api/admin/' + path, { method: data === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    if (!response.ok) throw new Error((await response.json()).message ?? 'Request failed.');
    return response;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function download(name: string) {
    let blob: Blob;
    if (name === 'events.csv') {
      const records: Summary[] = await (await request('sessions')).json();
      const pieces: string[] = [];
      // Keep each function request bounded to one attempt; combine the CSV in this page.
      for (const [index, record] of records.entries()) {
        const text = await (await request(`events.csv?session_id=${encodeURIComponent(record.session_id)}`)).text();
        pieces.push(index === 0 ? text : text.slice(text.indexOf('\n') + 1));
      }
      if (!pieces.length) pieces.push('event_id,participant_id,session_id,condition,server_time,event_type,stage,target,text,result,details\r\n');
      blob = new Blob(pieces, { type: 'text/csv;charset=utf-8' });
    } else blob = await (await request(name)).blob();
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main><h1>Researcher administration</h1><p>Use the researcher password configured in Netlify. Reloading this page forgets it. Import the hashed JSON mapping, never the handout CSV.</p>
    <label>Researcher password<input type="password" autoComplete="off" value={secret} onChange={e => setSecret(e.target.value)} /></label>
    <fieldset disabled={!secret || busy}><legend>Participants and records</legend>
      <label>Import participant mapping<input type="file" accept=".json,application/json" onChange={e => {
        const file = e.target.files?.[0]; if (!file) return;
        void run(async () => { if (file.size > 500_000) throw new Error('Mapping is too large.'); const result = await (await request('import', { participants: JSON.parse(await file.text()) })).json(); setMessage(`Imported/confirmed ${result.imported} participants: ${result.reactive} reactive, ${result.proactive} proactive.`); });
        e.target.value = '';
      }} /></label>
      <button onClick={() => void run(async () => setSessions(await (await request('sessions')).json()))}>Refresh sessions</button>{' '}
      <button onClick={() => void run(() => download('sessions.csv'))}>Download sessions.csv</button>{' '}
      <button onClick={() => void run(() => download('events.csv'))}>Download events.csv</button>
    </fieldset>
    <p role="status">{busy ? 'Working…' : message}</p>
    <p>Includes incomplete attempts. Last stage is not proof of completion. Refresh after ongoing requests finish before excluding an interrupted attempt.</p>
    <div style={{ overflowX: 'auto' }}><table><thead><tr>{['Participant ID', 'Session ID', 'Condition', 'Started (UTC)', 'Last stage', 'AI calls', 'At limit', 'Interrupted/pending'].map(s => <th key={s}>{s}</th>)}</tr></thead>
      <tbody>{sessions.map(s => <tr key={s.session_id}><td>{s.participant_id}</td><td>{s.session_id}</td><td>{s.condition}</td><td>{s.started_at}</td><td>{s.stage}</td><td>{s.ai_calls_used}/{s.ai_call_limit}</td><td>{String(s.ai_limit_reached)}</td><td>{String(s.attempt_ended)}</td></tr>)}</tbody></table></div>
  </main>;
}
