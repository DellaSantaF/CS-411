import { useRef } from 'react';
import { controlTargets } from '../shared/contracts.ts';
import { GuidanceDialog } from './GuidanceDialog.tsx';
import type { Condition, ControlTarget, HelpTarget, TutorMessage } from '../shared/contracts.ts';
export function ContextHelp({ target, label, condition, bubble, busy, error, request, dismiss, disabled = false }: {
  target: HelpTarget; label: string; condition: Condition; bubble: TutorMessage | null; busy: HelpTarget | null;
  disabled?: boolean; error: HelpTarget | null; request(target: HelpTarget): void; dismiss(): void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  return <div ref={anchor} className="help-anchor" data-help-target={target}>
    {condition === 'reactive' && controlTargets.includes(target as ControlTarget) && <button className="help" aria-label={`AI Help: ${label}`} title={`Help with ${label}`} disabled={disabled || busy !== null || bubble !== null} onClick={() => request(target)}>?</button>}
    {busy === target && <span className="guidance-status" role="status">Preparing guidance…</span>}
    {error === target && <span className="guidance-status" role="status">Guidance could not be loaded. Please try again later.</span>}
    {bubble?.target === target && <GuidanceDialog label={`Guidance: ${label}`} close={dismiss} anchor={anchor.current?.closest<HTMLElement>('.parameter-control, .control-heading') ?? anchor.current}><span className="bubble-label">Guidance · {label}</span><p>{bubble.message}</p></GuidanceDialog>}
  </div>;
}
