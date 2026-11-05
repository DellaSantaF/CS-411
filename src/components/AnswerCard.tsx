import type { ReactNode } from 'react';
import type { Answer, FieldId } from '../shared/contracts.ts';
import { resolved } from '../state.ts';
export function AnswerCard({ id, label, answer, help, allowReveal, onText, onCheck, onReveal }: {
  id: FieldId; label: string; answer: Answer; help: ReactNode; allowReveal: boolean;
  onText(text: string): void; onCheck(): void; onReveal(): void;
}) {
  const complete = resolved(answer), checking = answer.status === 'checking';
  return <div className={`answer-card ${answer.status}`} data-field={id}>
    <div className="field-top"><label htmlFor={`answer-${id}`}>{label}</label>{complete && <span className={`outcome ${answer.status}`}>{answer.status === 'accepted' ? (id === 'explanation' || id === 'prediction' ? 'Completed' : 'Discovered') : 'Revealed'}</span>}</div>
    {!complete && help}
    <textarea id={`answer-${id}`} value={answer.text} readOnly={complete} disabled={checking} maxLength={2000} rows={id === 'explanation' ? 5 : 2} onChange={event => onText(event.target.value)} aria-describedby={answer.feedback ? `feedback-${id}` : undefined} />
    {!complete && <div className="answer-actions"><button disabled={checking || !answer.text.trim()} onClick={onCheck}>{checking ? 'Checking…' : 'Check'}</button>{allowReveal && <button className="quiet" disabled={checking} onClick={onReveal}>{id === 'explanation' ? 'Skip and view example' : 'Reveal example'}</button>}</div>}
    {answer.feedback && <p className="feedback" id={`feedback-${id}`} role="status">{answer.feedback}</p>}
    {answer.example && <div className="example"><span>{id === 'explanation' ? 'Example explanation' : 'Example description'}</span><p>{answer.example}</p></div>}
    {answer.status === 'accepted' && id !== 'prediction' && <span className="confetti" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>}
  </div>;
}
