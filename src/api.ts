import { tokenStorage } from './state.ts';
export async function api<T>(path: string, data?: unknown, method = 'POST'): Promise<T> {
  const token = sessionStorage.getItem(tokenStorage);
  const response = await fetch('/api/' + path, { method: data === undefined ? 'GET' : method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? 'Please try again.');
  return result as T;
}
