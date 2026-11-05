import { useEffect, useState } from 'react';
import { api } from './api.ts';
import type { DeveloperSettings, SessionInfo } from './shared/contracts.ts';
import { activityStorage, taskKey, tokenStorage } from './state.ts';
import type { ActivityState } from './state.ts';
type Details = { settings: DeveloperSettings; checks: { field: string; text: string; accepted: boolean; diagnostics: string[] }[]; guidance: { target: string; message: string }[] };
export function Developer({ session }: { session: SessionInfo | null }) {
  const [details, setDetails] = useState<Details | null>(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const current = () => { try { return JSON.parse(sessionStorage.getItem(activityStorage) ?? 'null') as ActivityState | null; } catch { return null; } };
  const value = current(), task = value && taskKey(value);
  useEffect(() => { if (session) void api<Details>('developer').then(setDetails).catch(error => setError(error.message)); }, [session]);
  const change = (patch: Partial<DeveloperSettings>) => setDetails(value => value ? { ...value, settings: { ...value.settings, ...patch } } : value);
  async function save() {
    try { if (details) { setDetails(await api<Details>('developer', details.settings, 'PATCH')); setMessage('Settings saved. Return to the activity to apply them.'); } }
    catch (error) { setError((error as Error).message); }
  }
  return <section className="developer-panel"><h1>Developer controls</h1><p>{session?.aiMode === 'live' ? 'Live OpenAI prototype. Checks and guidance use the API. Simulated outcomes are disabled; thinking allowance and skip timing remain adjustable.' : 'Separate from the learner interface. All evaluator and tutor outcomes here are development substitutes; no live AI calls are made.'}</p>
    <a href="/">Return to activity</a>
    {!session && <div className="card"><p>First enter a participant key in the activity, then open this page in the same tab.</p><p>Review keys: <code>DEMO-R7K2</code> (reactive), <code>DEMO-P9M4</code> (proactive).</p></div>}
    {session && <div className="session-details"><p>Condition: <strong>{session.condition}</strong></p><p>Participant ID: <code>{session.participantId}</code></p><p>Session ID: <code>{session.sessionId}</code></p><p>Key reuse is allowed for development. Study-data storage is not implemented.</p></div>}
    {error && <p role="alert">{error}</p>}
    {details && <><form className="card developer-form" onSubmit={event => { event.preventDefault(); void save(); }}><h2>Development settings</h2>
      <label>Task skip threshold (seconds)<input type="number" min="1" max="3600" value={details.settings.skipSeconds} onChange={e => change({ skipSeconds: Number(e.target.value) })} /></label>
      <label>Tutor thinking allowance<select value={details.settings.thinkingTime} onChange={e => change({ thinkingTime: e.target.value as DeveloperSettings['thinkingTime'] })}><option value="short">Short</option><option value="balanced">Balanced</option><option value="extended">Extended</option></select></label>
      <label>Evaluator substitute<select disabled={session?.aiMode === 'live'} value={details.settings.evaluator} onChange={e => change({ evaluator: e.target.value as DeveloperSettings['evaluator'] })}><option value="auto">Development keyword recognition</option><option value="accept">Return accepted</option><option value="reject">Return not accepted</option><option value="technical-error">Simulate technical failure</option></select></label>
      <label>Tutor substitute<select disabled={session?.aiMode === 'live'} value={details.settings.tutor} onChange={e => change({ tutor: e.target.value as DeveloperSettings['tutor'] })}><option value="auto">Development context demonstration</option><option value="help">Return Socratic guidance</option><option value="wait">Return wait</option><option value="technical-error">Simulate technical failure</option></select></label>
      <button>Save settings</button></form>
      <div className="card developer-actions"><h2>Review shortcuts</h2><p>These controls are for review only. They are not part of the learner flow.</p>
        <button disabled={!task || task === 'prediction'} onClick={() => { const state = current(), key = state && taskKey(state); if (state && key && key !== 'prediction') { state.timers[key] = Math.max(state.timers[key], details.settings.skipSeconds * 1000 + 1); sessionStorage.setItem(activityStorage, JSON.stringify(state)); setMessage('The current task timer is eligible. Return to the activity and choose an individual reveal.'); } }}>Make current task's timed reveal available</button>
        <button disabled={session?.condition !== 'proactive' || !task} onClick={() => { sessionStorage.setItem('magnus.dev.assess', '1'); setMessage('A context assessment is queued for your return to the activity.'); }}>Assess proactive context on return</button>
        <button className="quiet" onClick={() => { sessionStorage.removeItem(activityStorage); sessionStorage.removeItem(tokenStorage); sessionStorage.removeItem('magnus.dev.assess'); location.assign('/'); }}>Start another review session</button>
      </div>
      <details className="card"><summary>Private evaluator diagnostics</summary><p>Visible here only for developer review. Learner check responses contain acceptance results without these diagnostics.</p><pre>{JSON.stringify(details.checks, null, 2)}</pre></details>
      <details className="card"><summary>Recent tutor messages</summary><pre>{JSON.stringify(details.guidance, null, 2)}</pre></details>
    </>}
    {message && <p className="developer-message" role="status">{message}</p>}
  </section>;
}
