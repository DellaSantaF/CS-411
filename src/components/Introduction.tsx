export function Introduction({ onContinue }: { onContinue(): void }) {
  return <section className="introduction card"><h2>The Magnus effect</h2>
    <p>A spinning ball changes the airflow around it. The resulting pressure difference produces a force that deflects its path. This is called the Magnus effect.</p>
    <svg viewBox="0 0 760 270" role="img" aria-label="Air moving left around a counterclockwise-spinning ball; lower pressure above, higher pressure below, and upward deflecting force.">
      <defs><marker id="intro-head" viewBox="0 0 10 10" markerWidth="6" markerHeight="6" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#34766e" /></marker></defs>
      <rect width="760" height="270" rx="9" fill="#f4f7f6" />
      <ellipse cx="345" cy="72" rx="83" ry="23" fill="#d5e7f3" /><ellipse cx="345" cy="201" rx="83" ry="23" fill="#f0dfcc" />
      <g stroke="#a2b9c6" strokeWidth="2" fill="none"><path d="M40 105H230Q345 3 460 105H690M40 130H230Q345 8 460 130H690M40 157H230Q345 255 460 157H690M40 184H230Q345 260 460 184H690" /></g>
      <circle cx="345" cy="137" r="40" fill="#c5ca74" stroke="#858b48" /><path d="M312 117Q345 150 378 117M312 157Q345 124 378 157" fill="none" stroke="#f8f8dc" strokeWidth="2" />
      <path d="M345 88A49 49 0 0 0 296 137" stroke="#34766e" fill="none" strokeWidth="2" markerEnd="url(#intro-head)" />
      <path d="M345 137V48" stroke="#34766e" strokeWidth="4" markerEnd="url(#intro-head)" />
      <g fill="#506a7b" fontSize="14"><text x="32" y="245">← Airflow</text><text x="269" y="43">Lower pressure</text><text x="270" y="243">Higher pressure</text><text x="489" y="61">Deflecting force</text></g>
    </svg>
    <div className="concept-chain"><span>Spin</span><span aria-hidden="true">→</span><span>Pressure difference</span><span aria-hidden="true">→</span><span>Deflecting force</span></div>
    <div className="sports-example"><h3>Example: a tennis shot with backspin</h3><p>A tennis ball travelling right with counterclockwise backspin, as seen from the side, experiences an upward Magnus force. In the illustration, the ball is held in view and the relative airflow moves left. This upward force changes the path that gravity alone would produce.</p></div>
    <button className="flow-action" onClick={onContinue}>Continue</button>
  </section>;
}
