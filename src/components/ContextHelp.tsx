import { controlTargets } from '../shared/contracts.ts';
import { createPortal } from 'react-dom';
import type { Condition, ControlTarget, HelpTarget, TutorMessage } from '../shared/contracts.ts';
export function ContextHelp({ target, label, condition, bubble, busy, error, request, dismiss, bubbleContainer }: {
  target: HelpTarget; label: string; condition: Condition; bubble: TutorMessage | null; busy: HelpTarget | null;
  error: HelpTarget | null; request(target: HelpTarget): void; dismiss(): void;
  bubbleContainer?: HTMLElement | null;
}) {
  const visible = bubble?.target === target;
  const guidance = visible && <aside className="tutor-bubble" data-help-target={target} aria-label="Tutor guidance"><span className="bubble-label">Guidance · {label}</span><p>{bubble.message}</p><button className="quiet" onClick={dismiss}>Understood / Close</button></aside>;
  return <div className="help-anchor" data-help-target={target}>
    {condition === 'reactive' && controlTargets.includes(target as ControlTarget) && <button className="help" aria-label={`AI Help: ${label}`} disabled={busy !== null || bubble !== null} onClick={() => request(target)}><span aria-hidden="true">✦</span> AI Help</button>}
    {busy === target && <span className="guidance-status" role="status">Preparing guidance…</span>}
    {error === target && <span className="guidance-status" role="status">Guidance could not be loaded. Please try again later.</span>}
    {bubbleContainer ? createPortal(guidance, bubbleContainer) : guidance}
  </div>;
}
