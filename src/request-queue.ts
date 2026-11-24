// One queue per browser tab, shared by every session writer (including recording).
export function requestQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  let stopped = '';
  return {
    stop(message: string) { stopped = message; },
    reset() { stopped = ''; },
    run<T>(action: () => Promise<T>): Promise<T> {
      const next = tail.then(() => { if (stopped) throw new Error(stopped); return action(); });
      tail = next.catch(() => {});
      return next;
    },
  };
}
