/* Dependency-free 2D Magnus dynamics. SI units throughout. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MagnusPhysics = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function finite(name, value, min) {
    if (!Number.isFinite(value) || (min !== undefined && value < min)) throw new RangeError(name + ' must be finite' + (min !== undefined ? ' and >= ' + min : ''));
  }
  function force(state, params) {
    const { vx, vy } = state;
    const { liftCoefficient: cl, density, area } = params;
    finite('vx', vx); finite('vy', vy); finite('liftCoefficient', cl);
    finite('density', density, 0); finite('area', area, 0);
    const speed = Math.hypot(vx, vy);
    if (speed === 0) return { x: 0, y: 0, magnitude: 0 };
    const signed = cl * 0.5 * density * speed * speed * area;
    return { x: -vy / speed * signed, y: vx / speed * signed, magnitude: Math.abs(signed) };
  }
  // Optional prototype-inspired correlation, not a universal aerodynamic law.
  // Positive spin is counterclockwise (positive z), matching this controller's coordinates.
  function coefficientFromSpin({ radius, spin, relativeAirSpeed, scale = 1 }) {
    finite('radius', radius, 0); finite('spin', spin);
    finite('relativeAirSpeed', relativeAirSpeed, 0); finite('scale', scale, 0);
    const spinParameter = radius * Math.abs(spin) / Math.max(relativeAirSpeed, 0.01);
    return Math.sign(spin) * Math.min(0.6, Math.min(0.6, 1.5 * spinParameter) * scale);
  }
  // Exact integration for constant parameters: force is always perpendicular to velocity,
  // so speed is constant and the path is a circular arc (or a straight line).
  function step(state, params, dt) {
    finite('x', state.x); finite('y', state.y); finite('mass', params.mass, Number.MIN_VALUE); finite('dt', dt, 0);
    const f = force(state, params);
    const speed = Math.hypot(state.vx, state.vy);
    if (speed === 0 || f.magnitude === 0 || dt === 0) return { x: state.x + state.vx * dt, y: state.y + state.vy * dt, vx: state.vx, vy: state.vy };
    const omega = params.liftCoefficient * 0.5 * params.density * speed * params.area / params.mass;
    const angle = omega * dt;
    // Sinc forms avoid cancellation for very small turning angles.
    const sinc = Math.abs(angle) < 1e-4 ? 1 - angle * angle / 6 : Math.sin(angle) / angle;
    const cosc = Math.abs(angle) < 1e-4 ? angle / 2 - angle * angle * angle / 24 : (1 - Math.cos(angle)) / angle;
    return { x: state.x + dt * (state.vx * sinc - state.vy * cosc), y: state.y + dt * (state.vx * cosc + state.vy * sinc), vx: state.vx * Math.cos(angle) - state.vy * Math.sin(angle), vy: state.vx * Math.sin(angle) + state.vy * Math.cos(angle) };
  }
  return { force, step, coefficientFromSpin };
});
