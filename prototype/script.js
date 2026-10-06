const canvas = document.getElementById('simulationCanvas');
const context = canvas.getContext('2d');
const speedRange = document.getElementById('speedRange');
const sizeRange = document.getElementById('sizeRange');
const massRange = document.getElementById('massRange');
const spinRange = document.getElementById('spinRange');
const clRange = document.getElementById('clRange');
const airflowRange = document.getElementById('airflowRange');
const densityRange = document.getElementById('densityRange');
const zoomRange = document.getElementById('zoomRange');
const speedValue = document.getElementById('speedValue');
const sizeValue = document.getElementById('sizeValue');
const massValue = document.getElementById('massValue');
const spinValue = document.getElementById('spinValue');
const clValue = document.getElementById('clValue');
const airflowValue = document.getElementById('airflowValue');
const densityValue = document.getElementById('densityValue');
const zoomValue = document.getElementById('zoomValue');
const directionText = document.getElementById('directionText');
const launchButton = document.getElementById('launchButton');
const statusText = document.getElementById('statusText');
const flightTime = document.getElementById('flightTime');
const flightRange = document.getElementById('flightRange');

let animationId = null;
let flight = null;
let lastFrame = 0;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = bounds.width * ratio;
  canvas.height = bounds.height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawScene();
}

function updateReadouts() {
  speedValue.value = speedRange.value;
  sizeValue.value = Number(sizeRange.value).toFixed(2);
  massValue.value = Number(massRange.value).toFixed(2);
  spinValue.value = spinRange.value;
  clValue.value = Number(clRange.value).toFixed(2);
  airflowValue.value = Number(airflowRange.value).toFixed(1).replace('.0', '');
  densityValue.value = Number(densityRange.value).toFixed(3);
  zoomValue.value = Number(zoomRange.value).toFixed(2);
  const spin = Number(spinRange.value);
  directionText.textContent = spin === 0 ? 'NO SPIN' : spin > 0 ? 'TOP SPIN / RIGHT' : 'BACK SPIN / LEFT';
  [speedRange, sizeRange, massRange, spinRange, clRange, airflowRange, densityRange, zoomRange].forEach((input) => {
    const percent = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.background = `linear-gradient(90deg, var(--orange) ${percent}%, #dfe0d6 ${percent}%)`;
  });
  drawScene();
}

function getDimensions() {
  return { width: canvas.clientWidth, height: canvas.clientHeight };
}

function getWorldScale() {
  const { width, height } = getDimensions();
  return Math.min(width / 38, height / 13) * Number(zoomRange.value);
}

function worldToCanvas(x, y) {
  const { width, height } = getDimensions();
  const scale = getWorldScale();
  return { x: width * 0.09 + x * scale, y: height * 0.84 - y * scale };
}

function getLaunchX() {
  const { width } = getDimensions();
  return (width * 0.16) / getWorldScale();
}

function getEndX() {
  const { width } = getDimensions();
  return (width * 0.83) / getWorldScale();
}

function getLaunchHeight() {
  const { width, height } = getDimensions();
  return (height * 0.34) / getWorldScale();
}

function launch() {
  if (animationId) cancelAnimationFrame(animationId);
  const speed = Number(speedRange.value);
  const radius = Number(sizeRange.value) / 2;
  const mass = Number(massRange.value);
  const spin = Number(spinRange.value);
  const clScale = Number(clRange.value);
  const airflowSpeed = Number(airflowRange.value);
  const airDensity = Number(densityRange.value);
  flight = { x: getLaunchX(), y: getLaunchHeight(), vx: speed, vy: 0, speed, radius, mass, spin, clScale, airflowSpeed, airDensity, t: 0, points: [], angle: 0, complete: false };
  flightTime.textContent = '—';
  flightRange.textContent = '—';
  statusText.textContent = 'FLIGHT IN PROGRESS';
  lastFrame = performance.now();
  animationId = requestAnimationFrame(animate);
}

function animate(now) {
  if (!flight) return;
  const delta = Math.min((now - lastFrame) / 1000, 0.035);
  lastFrame = now;
  const requestedSpeed = Number(speedRange.value);
  const heading = Math.atan2(flight.vy, flight.vx);
  flight.speed = requestedSpeed;
  flight.vx = Math.cos(heading) * requestedSpeed;
  flight.vy = Math.sin(heading) * requestedSpeed;
  flight.radius = Number(sizeRange.value) / 2;
  flight.mass = Number(massRange.value);
  flight.spin = Number(spinRange.value);
  flight.clScale = Number(clRange.value);
  flight.airflowSpeed = Number(airflowRange.value);
  flight.airDensity = Number(densityRange.value);
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
  flight.x += vx * delta;
  flight.y += flight.vy * delta;
  flight.t += delta;
  flight.angle += spin * delta;
  flight.points.push({ x: flight.x, y: flight.y });
  if (flight.x >= getEndX()) {
    flight.complete = true;
  }
  drawScene();
  if (flight.complete) {
    animationId = null;
    statusText.textContent = 'FLIGHT COMPLETE';
    flightTime.textContent = `${flight.t.toFixed(2)} s`;
    flightRange.textContent = `${flight.x.toFixed(1)} m`;
    return;
  }
  animationId = requestAnimationFrame(animate);
}

function drawScene() {
  const { width, height } = getDimensions();
  context.clearRect(0, 0, width, height);
  drawAirflow(width, height);
  if (!flight) {
    drawTrajectoryPreview();
    drawBall(getLaunchX(), getLaunchHeight(), 0, Number(sizeRange.value) / 2);
    return;
  }
  drawTrajectory(flight.points);
  drawForceVector(flight);
  drawBall(flight.x, flight.y, flight.angle, flight.radius);
}

function drawAirflow(width, height) {
  context.save();
  context.strokeStyle = 'rgba(119, 207, 192, .4)';
  context.lineWidth = 1;
  for (let y = 74; y < height - 55; y += 76) {
    context.beginPath(); context.moveTo(width * .73, y); context.lineTo(width * .54, y); context.stroke();
    context.beginPath(); context.moveTo(width * .54, y); context.lineTo(width * .54 + 6, y - 4); context.moveTo(width * .54, y); context.lineTo(width * .54 + 6, y + 4); context.stroke();
  }
  context.restore();
}

function drawTrajectoryPreview() {
  const launchHeight = getLaunchHeight();
  const start = worldToCanvas(getLaunchX(), launchHeight);
  const end = worldToCanvas(20, launchHeight);
  context.save(); context.setLineDash([5, 7]); context.strokeStyle = 'rgba(239, 120, 84, .35)'; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke(); context.restore();
}

function drawTrajectory(points) {
  if (points.length < 2) return;
  context.save(); context.strokeStyle = '#ef7854'; context.lineWidth = 2; context.lineJoin = 'round'; context.beginPath();
  points.forEach((point, index) => { const screen = worldToCanvas(point.x, point.y); if (index === 0) context.moveTo(screen.x, screen.y); else context.lineTo(screen.x, screen.y); }); context.stroke(); context.restore();
}

function drawForceVector(currentFlight) {
  if (!currentFlight.spin) return;
  const point = worldToCanvas(currentFlight.x, currentFlight.y);
  const direction = currentFlight.spin > 0 ? 1 : -1;
  context.save(); context.strokeStyle = '#77cfc0'; context.fillStyle = '#77cfc0'; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(point.x + 15, point.y); context.lineTo(point.x + 15, point.y + direction * 37); context.stroke();
  context.beginPath(); context.moveTo(point.x + 15, point.y + direction * 37); context.lineTo(point.x + 11, point.y + direction * 28); context.lineTo(point.x + 19, point.y + direction * 28); context.closePath(); context.fill(); context.restore();
}

function drawBall(x, y, angle, radius) {
  const point = worldToCanvas(x, y);
  const screenRadius = Math.max(5, radius * Math.min(canvas.clientWidth / 38, canvas.clientHeight / 13) * Number(zoomRange.value) * 6);
  context.save();
  context.shadowColor = 'rgba(23, 35, 33, .16)'; context.shadowBlur = 10; context.shadowOffsetY = 5;
  const gradient = context.createRadialGradient(point.x - screenRadius * .3, point.y - screenRadius * .4, 1, point.x, point.y, screenRadius);
  gradient.addColorStop(0, '#ffb090'); gradient.addColorStop(.55, '#ef7854'); gradient.addColorStop(1, '#be553d');
  context.fillStyle = gradient; context.beginPath(); context.arc(point.x, point.y, screenRadius, 0, Math.PI * 2); context.fill(); context.shadowColor = 'transparent';
  context.strokeStyle = '#f8c0a8'; context.lineWidth = 1.5; context.translate(point.x, point.y); context.rotate(angle); context.beginPath(); context.arc(0, 0, screenRadius * .64, -.95, .95); context.stroke(); context.beginPath(); context.arc(0, 0, screenRadius * .64, Math.PI - .95, Math.PI + .95); context.stroke(); context.restore();
}

[speedRange, sizeRange, massRange, spinRange, clRange, airflowRange, densityRange, zoomRange].forEach((input) => input.addEventListener('input', updateReadouts));
launchButton.addEventListener('click', launch);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => { if (event.code === 'Space' && event.target.tagName !== 'INPUT') { event.preventDefault(); launch(); } });
updateReadouts();
resizeCanvas();
