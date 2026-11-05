// Read the supplied source once at startup; send only sections relevant to this activity.
export function physicsExcerpts(source: string) {
  function section(start: string, end: string) {
    const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
    if (from < 0 || to < 0) throw new Error('Required physics-reference section is missing.');
    return source.slice(from, to).trim();
  }
  const core = section('## Core idea', '## The simplified formula');
  return {
    treadmill: core + '\n' + section('## Treadmill activity', '## Examples relevant'),
    formula: section('## The simplified formula', '## Relative airflow') + '\nCurrent approved scene: exactly four controls: C_L (spin animation), rho (line density), v (line speed), A (sphere size). Relative airflow points left, rotation is counterclockwise, force points up. Direction is fixed and sliders are positive. No separate mass, radius, airflow or angular-speed controls or spin-parameter readout. C_L is independently controlled; spin is an illustrative cue. Do not describe the source\'s older separate-speed/spin controls as present.',
  };
}
