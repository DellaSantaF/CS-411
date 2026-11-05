/* Standalone numerical model for the motion review. No UI or AI dependencies. */

  'use strict';

  export const configuration = Object.freeze({
    gravity: 9.81,
    releaseHeight: 4.5,
    radius: 0.11,
    mass: 0.43,
    airDensity: 1.225,
    restitution: 0.92,
    referenceLiftCoefficient: 0.25,
    minimumBeltSpeed: 6,
    maximumBeltSpeed: 10,
    defaultBeltSpeed: 8,
    magnusGain: 12,
    contactDuration: 0.025,
    pauseAfterSeparation: 0.025,
    integrationStep: 1 / 240,
  });

  const interpolate = (a, b, fraction) => ({
    t: a.t + (b.t - a.t) * fraction,
    x: a.x + (b.x - a.x) * fraction,
    y: a.y + (b.y - a.y) * fraction,
    vx: a.vx + (b.vx - a.vx) * fraction,
    vy: a.vy + (b.vy - a.vy) * fraction,
  });

  export function buildRun({ beltSpeed = configuration.defaultBeltSpeed, direction = 1,
    magnusGain = configuration.magnusGain, step = configuration.integrationStep } = {}) {
    const c = configuration;
    if (!Number.isFinite(beltSpeed) || beltSpeed < c.minimumBeltSpeed || beltSpeed > c.maximumBeltSpeed
      || ![-1, 1].includes(direction) || !Number.isFinite(magnusGain) || magnusGain < 0 || magnusGain > c.magnusGain
      || !Number.isFinite(step) || step <= 0 || step > 1 / 120) {
      throw new RangeError('Invalid treadmill model configuration.');
    }

    const dropTime = Math.sqrt(2 * (c.releaseHeight - c.radius) / c.gravity);
    // Tangential impulse for a uniform solid sphere, with I = 2 m R² / 5.
    // vx + omega R = belt speed; angular impulse R J = I omega.
    const initialVx = direction * (2 / 7) * beltSpeed;
    const omega = 5 * initialVx / (2 * c.radius);
    const initialVy = c.restitution * c.gravity * dropTime;
    const contactX = 0.5 * initialVx * c.contactDuration;
    // This CL-to-belt mapping is a provisional visual teaching choice, not an empirical fit.
    const liftCoefficient = c.referenceLiftCoefficient * beltSpeed / c.defaultBeltSpeed;
    const area = Math.PI * c.radius ** 2;
    const factor = magnusGain * 0.5 * c.airDensity * liftCoefficient * area / c.mass;

    function derivative(state) {
      const speed = Math.hypot(state.vx, state.vy);
      // Magnitude: gain * CL * 1/2 * rho * |v|² * A / m.
      // Direction: signed 90-degree rotation of v, consistent with omega cross v.
      return { x: state.vx, y: state.vy,
        vx: -direction * factor * speed * state.vy,
        vy: -c.gravity + direction * factor * speed * state.vx };
    }

    function advance(state, dt) {
      const add = (base, delta, scale) => ({ x: base.x + delta.x * scale,
        y: base.y + delta.y * scale, vx: base.vx + delta.vx * scale,
        vy: base.vy + delta.vy * scale });
      const k1 = derivative(state);
      const k2 = derivative(add(state, k1, dt / 2));
      const k3 = derivative(add(state, k2, dt / 2));
      const k4 = derivative(add(state, k3, dt));
      const next = { t: state.t + dt };
      for (const key of ['x', 'y', 'vx', 'vy']) {
        next[key] = state[key] + dt * (k1[key] + 2 * k2[key] + 2 * k3[key] + k4[key]) / 6;
      }
      return next;
    }

    const ascent = [{ t: 0, x: contactX, y: c.radius, vx: initialVx, vy: initialVy }];
    while (ascent.at(-1).vy > 0 && ascent.at(-1).t < 4) {
      const previous = ascent.at(-1);
      const next = advance(previous, step);
      if (next.vy <= 0) {
        const apex = interpolate(previous, next, previous.vy / (previous.vy - next.vy));
        apex.vy = 0;
        ascent.push(apex);
        break;
      }
      ascent.push(next);
    }
    if (ascent.at(-1).vy !== 0 || !ascent.every(s => Object.values(s).every(Number.isFinite))) {
      throw new Error('Trajectory did not reach a finite apex.');
    }
    const separationTime = dropTime + c.contactDuration;
    return { beltSpeed, direction, magnusGain, liftCoefficient, omega, initialVx, initialVy,
      contactX, dropTime, separationTime, pauseTime: separationTime + c.pauseAfterSeparation,
      duration: separationTime + ascent.at(-1).t, ascent };
  }

  export function sample(run, time) {
    const c = configuration;
    const t = Math.max(0, Math.min(run.duration, time));
    if (t < run.dropTime) {
      return { t, x: 0, y: c.releaseHeight - 0.5 * c.gravity * t ** 2,
        angle: 0, spinFraction: 0, compression: 0, phase: 'drop' };
    }
    if (t < run.separationTime) {
      const elapsed = t - run.dropTime;
      const fraction = elapsed / c.contactDuration;
      return { t, x: 0.5 * run.initialVx * elapsed ** 2 / c.contactDuration, y: c.radius,
        angle: 0.5 * run.omega * elapsed ** 2 / c.contactDuration,
        spinFraction: fraction, compression: Math.sin(Math.PI * fraction), phase: 'contact' };
    }
    const elapsed = t - run.separationTime;
    let lo = 0;
    let hi = run.ascent.length - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (run.ascent[mid].t <= elapsed) lo = mid;
      else hi = mid;
    }
    const a = run.ascent[lo];
    const b = run.ascent[hi];
    const state = interpolate(a, b, Math.min(1, (elapsed - a.t) / (b.t - a.t)));
    return { ...state, t, angle: run.omega * (c.contactDuration / 2 + elapsed),
      spinFraction: 1, compression: 0, phase: 'ascent' };
  }



