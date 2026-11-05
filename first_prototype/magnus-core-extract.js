// Extracted from script.js as refactoring input; the prototype does not import this file.
// Coordinates: x increases right, y increases up. Positive spin produces downward lift
// for rightward relative airflow. Spin is used directly as angular velocity (rad/s).
// The original simulation has no gravity or drag and maintains the requested speed.
// airflowSpeed is added to vx when computing velocity relative to the air.

function createFlight({ x, y, speed, radius, mass, spin, clScale, airflowSpeed, airDensity }) {
  return {
    x, y, vx: speed, vy: 0, speed, radius, mass, spin, clScale,
    airflowSpeed, airDensity, t: 0, points: [], angle: 0, complete: false,
  };
}

// Call once per animation frame. Inputs are read live in the original simulation.
// delta is capped at 35 ms; endX is the viewport-derived horizontal stopping point.
function advanceFlight(flight, elapsedSeconds, inputs, endX) {
  const delta = Math.min(elapsedSeconds, 0.035);
  const heading = Math.atan2(flight.vy, flight.vx);
  flight.speed = inputs.speed;
  flight.vx = Math.cos(heading) * inputs.speed;
  flight.vy = Math.sin(heading) * inputs.speed;
  flight.radius = inputs.radius;
  flight.mass = inputs.mass;
  flight.spin = inputs.spin;
  flight.clScale = inputs.clScale;
  flight.airflowSpeed = inputs.airflowSpeed;
  flight.airDensity = inputs.airDensity;

  const { vx, vy, spin, clScale, airflowSpeed, airDensity } = flight;
  const relativeVelocityX = vx + airflowSpeed;
  const relativeVelocityY = vy;
  const relativeAirSpeed = Math.hypot(relativeVelocityX, relativeVelocityY);
  const area = Math.PI * flight.radius * flight.radius;
  const spinParameter = (flight.radius * Math.abs(spin)) / Math.max(relativeAirSpeed, 0.01);
  const baseLiftCoefficient = Math.min(0.6, 1.5 * spinParameter);
  const liftCoefficient = Math.min(0.6, baseLiftCoefficient * clScale);
  const magnusForce = 0.5 * airDensity * liftCoefficient * area * relativeAirSpeed ** 2;
  const spinDirection = Math.sign(spin);
  const forceX = spinDirection * magnusForce * relativeVelocityY / Math.max(relativeAirSpeed, 0.01);
  const forceY = -spinDirection * magnusForce * relativeVelocityX / Math.max(relativeAirSpeed, 0.01);

  flight.vx += (forceX / flight.mass) * delta;
  flight.vy += (forceY / flight.mass) * delta;
  const currentSpeed = Math.hypot(flight.vx, flight.vy);
  if (currentSpeed > 0) {
    flight.vx = (flight.vx / currentSpeed) * flight.speed;
    flight.vy = (flight.vy / currentSpeed) * flight.speed;
  }
  // Preserve the original integration order: x uses pre-force vx, y uses updated vy.
  flight.x += vx * delta;
  flight.y += flight.vy * delta;
  flight.t += delta;
  flight.angle += spin * delta;
  flight.points.push({ x: flight.x, y: flight.y });
  if (flight.x >= endX) flight.complete = true;
  return flight;
}
