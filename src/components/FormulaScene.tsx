import { useEffect, useRef } from 'react';
import { magnusForce, visualMapping } from '../physics/formula.ts';
import type { ParameterValues } from '../physics/formula.ts';
export function FormulaScene({ values }: { values: ParameterValues }) {
  const svg = useRef<SVGSVGElement>(null);
  const latest = useRef(values); latest.current = values;
  const visual = visualMapping(values), r = visual.radius, cx = 360, cy = 172;
  useEffect(() => {
    let angle = 0, offset = 0, previous: number | null = null, id = 0;
    function frame(time: number) {
      const delta = previous === null || document.hidden ? 0 : Math.min((time - previous) / 1000, .05);
      previous = document.hidden ? null : time;
      const mapping = visualMapping(latest.current);
      angle = (angle - delta * mapping.angularSpeed * 180 / Math.PI) % 360;
      offset = (offset + delta * mapping.airflowSpeed) % 54;
      svg.current?.querySelector('[data-sphere]')?.setAttribute('transform', `rotate(${angle})`);
      svg.current?.querySelectorAll('[data-airflow] path').forEach((path, index) => path.setAttribute('stroke-dashoffset', String(offset + index * 17.3 % 54)));
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame); return () => cancelAnimationFrame(id);
  }, []);
  const paths = Array.from({ length: visual.lineCount }, (_, i) => {
    const y = 26 + i * 280 / (visual.lineCount - 1), dy = y - cy;
    const near = Math.abs(dy) < r + 30;
    const bend = near ? cy + Math.sign(dy || 1) * (r + 16 + Math.abs(dy) * .2) : y;
    return `M-40 ${y}L220 ${y}C285 ${y} 290 ${bend} 360 ${bend}C430 ${bend} 435 ${y} 500 ${y}L800 ${y}`;
  });
  return <svg ref={svg} viewBox="0 0 760 330" role="img" aria-label={`Air moving left around a counterclockwise-rotating sphere. Upward Magnus force: ${magnusForce(values).toFixed(3)} newtons.`}>
    <defs><marker id="force-head" viewBox="0 0 10 10" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#34766e" /></marker><marker id="rotation-head" viewBox="0 0 8 8" markerWidth="4" markerHeight="4" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64745a" /></marker></defs>
    <rect width="760" height="330" fill="#f7f9f7" />
    <ellipse data-pressure="low" cx={cx} cy={cy-r-12} rx={r+26} ry="21" fill="#8eb8d4" opacity=".28" />
    <ellipse data-pressure="high" cx={cx} cy={cy+r+12} rx={r+26} ry="21" fill="#ddb080" opacity=".30" />
    <g data-airflow="" stroke="#6e95aa" strokeOpacity=".85" strokeWidth="2" fill="none" strokeDasharray="29 25">{paths.map((path, i) => <path key={i} d={path} strokeDashoffset={i * 17.3 % 54} />)}</g>
    <g transform={`translate(${cx} ${cy})`}><g data-sphere=""><circle r={r} fill="#c5ca74" stroke="#858b48" strokeWidth="1.5" /><path d={`M${-r*.85} ${-r*.5}Q0 ${r*.5} ${r*.85} ${-r*.5}M${-r*.85} ${r*.5}Q0 ${-r*.5} ${r*.85} ${r*.5}`} fill="none" stroke="#f8f8dc" strokeWidth="2.5" /><circle cx={r*.5} cy={-r*.4} r="3" fill="#777e3a" /></g>
      <g fill="none" stroke="#64745a" strokeWidth="1.5" markerEnd="url(#rotation-head)"><path d={`M0 ${-r-10}A${r+10} ${r+10} 0 0 0 ${-r-10} 0`} /><path d={`M0 ${r+10}A${r+10} ${r+10} 0 0 0 ${r+10} 0`} /></g></g>
    <path data-force="" d={`M${cx} ${cy}V${cy-visual.forceLength}`} stroke="#34766e" strokeWidth="4" markerEnd="url(#force-head)" />
    <circle cx={cx} cy={cy} r="3" fill="#34766e" />
    <text x={cx+r+32} y={cy-visual.forceLength+5} fill="#28625b" fontSize="14">Magnus force</text>
    <text x="27" y="312" fill="#5d7786" fontSize="13">← Airflow</text>
  </svg>;
}
