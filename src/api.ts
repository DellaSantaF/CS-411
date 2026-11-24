import { tokenStorage } from './state.ts';
import { requestQueue } from './request-queue.ts';
const queue = requestQueue();
const endedKey = 'magnus.attempt-ended';
const interrupted = 'A technical interruption stopped this attempt. Your draft is saved in this tab. Please contact the researcher.';
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function stop(message: string) {
  queue.stop(message); sessionStorage.setItem(endedKey, message);
  window.dispatchEvent(new CustomEvent('activity-error', { detail: message }));
}
export function api<T>(path: string, data?: unknown, method = 'POST'): Promise<T> {
  const creating = path === 'session' && data !== undefined;
  if (creating) { queue.reset(); sessionStorage.removeItem(endedKey); }
  const action = async () => {
    const mutating = data !== undefined;
    const ended = sessionStorage.getItem(endedKey);
    if (mutating && ended) throw new Error(ended);
    const token = sessionStorage.getItem(tokenStorage);
    try {
      const response = await fetch('/api/' + path, { method: mutating ? method : 'GET', signal: AbortSignal.timeout(45_000),
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(mutating ? { body: JSON.stringify(data) } : {}) });
      const result = await response.json();
      if (result.attemptEnded || mutating && (result.code === 'attempt_ended' || response.status >= 500)) stop(result.message ?? interrupted);
      if (result.code === 'ai_limit') window.dispatchEvent(new CustomEvent('activity-error', { detail: result.message }));
      if (!response.ok) throw new ApiError(result.message ?? interrupted, response.status);
      return result as T;
    } catch (error) {
      if (!(error instanceof ApiError) && mutating) stop(interrupted);
      throw error;
    }
  };
  return data === undefined ? action() : queue.run(action);
}
