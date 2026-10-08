const canvas = document.getElementById('forceCanvas');
const context = canvas.getContext('2d');
const speedRange = document.getElementById('speedRange');
const radiusRange = document.getElementById('radiusRange');
const massRange = document.getElementById('massRange');
const spinRange = document.getElementById('spinRange');
const clRange = document.getElementById('clRange');
const airflowRange = document.getElementById('airflowRange');
const densityRange = document.getElementById('densityRange');
const speedValue = document.getElementById('speedValue');
const radiusValue = document.getElementById('radiusValue');
const massValue = document.getElementById('massValue');
const spinValue = document.getElementById('spinValue');
const clValue = document.getElementById('clValue');
const airflowValue = document.getElementById('airflowValue');
const densityValue = document.getElementById('densityValue');
const forceValue = document.getElementById('forceValue');
const spinParameterValue = document.getElementById('spinParameterValue');
const liftCoefficientValue = document.getElementById('liftCoefficientValue');
const accelerationValue = document.getElementById('accelerationValue');

const animationState = { angle: 0, lastFrame: performance.now() };

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = bounds.width * ratio;
  canvas.height = bounds.height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function values() {
  const speed = Number(speedRange.value);
  const radius = Number(radiusRange.value);
  const spin = Number(spinRange.value);
  const airflow = Number(airflowRange.value);
  const relativeSpeed = speed + airflow;
  const spinParameter = radius * Math.abs(spin) / Math.max(relativeSpeed, 0.01);
  const baseLiftCoefficient = Math.min(0.6, 1.5 * spinParameter);
  const liftCoefficient = Math.min(0.6, baseLiftCoefficient * Number(clRange.value));
  const area = Math.PI * radius * radius;
  const force = 0.5 * Number(densityRange.value) * liftCoefficient * area * relativeSpeed ** 2;
  const acceleration = force / Number(massRange.value);
  return { speed, radius, spin, airflow, relativeSpeed, spinParameter, liftCoefficient, force, acceleration };
}

function updateReadouts() {
  const current = values();
  speedValue.value = speedRange.value;
  radiusValue.value = radiusRange.value;
  massValue.value = Number(massRange.value).toFixed(2);
  spinValue.value = spinRange.value;
  clValue.value = Number(clRange.value).toFixed(2);
  airflowValue.value = Number(airflowRange.value).toFixed(1).replace('.0', '');
  densityValue.value = Number(densityRange.value).toFixed(3);
  forceValue.textContent = `${current.force.toFixed(2)} N`;
  spinParameterValue.value = current.spinParameter.toFixed(3);
  liftCoefficientValue.value = current.liftCoefficient.toFixed(3);
  accelerationValue.value = current.acceleration.toFixed(2);
  [speedRange, radiusRange, massRange, spinRange, clRange, airflowRange, densityRange].forEach((input) => {
    const percent = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.background = `linear-gradient(90deg, var(--orange) ${percent}%, #dfe0d6 ${percent}%)`;
  });
  draw();
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const current = values();
  context.clearRect(0, 0, width, height);
  drawReferenceAir(width, height);
  drawBall(width / 2, height / 2, current.radius, animationState.angle);
  drawForceVector(width / 2, height / 2, current);
}

function drawReferenceAir(width, height) {
  context.save();
  context.strokeStyle = 'rgba(119, 207, 192, .45)';
  context.lineWidth = 1;
  const centerY = height / 2;
  for (let offset = -118; offset <= 118; offset += 59) {
    const y = centerY + offset;
    context.beginPath();
    context.moveTo(width * .08, y);
    context.lineTo(width * .38, y);
    context.stroke();
    context.beginPath();
    context.moveTo(width * .08, y);
    context.lineTo(width * .08 + 7, y - 4);
    context.moveTo(width * .08, y);
    context.lineTo(width * .08 + 7, y + 4);
    context.stroke();
  }
  context.restore();
}

function drawBall(centerX, centerY, radius, angle) {
  const screenRadius = Math.max(18, radius * Math.min(canvas.clientWidth / 38, canvas.clientHeight / 13) * 9);
  context.save();
  context.shadowColor = 'rgba(23, 35, 33, .18)';
  context.shadowBlur = 16;
  context.shadowOffsetY = 7;
  const gradient = context.createRadialGradient(centerX - screenRadius * .3, centerY - screenRadius * .4, 1, centerX, centerY, screenRadius);
  gradient.addColorStop(0, '#ffb090');
  gradient.addColorStop(.55, '#ef7854');
  gradient.addColorStop(1, '#be553d');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(centerX, centerY, screenRadius, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.translate(centerX, centerY);
  context.rotate(angle);
  context.strokeStyle = '#f8c0a8';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, screenRadius * .65, -.95, .95);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, screenRadius * .65, Math.PI - .95, Math.PI + .95);
  context.stroke();
  context.restore();
}

function drawForceVector(centerX, centerY, current) {
  const direction = Math.sign(current.spin) || 1;
  const length = Math.min(190, 38 + current.force * 20);
  const angle = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
  const endX = centerX + Math.cos(angle) * length;
  const endY = centerY + Math.sin(angle) * length;
  context.save();
  context.strokeStyle = '#77cfc0';
  context.fillStyle = '#77cfc0';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(centerX, centerY);
  context.lineTo(endX, endY);
  context.stroke();
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - 8, endY - direction * 16);
  context.lineTo(endX + 8, endY - direction * 16);
  context.closePath();
  context.fill();
  context.restore();
}

function animate(now) {
  const delta = Math.min((now - animationState.lastFrame) / 1000, 0.05);
  animationState.lastFrame = now;
  animationState.angle += Number(spinRange.value) * delta;
  draw();
  requestAnimationFrame(animate);
}

[speedRange, radiusRange, massRange, spinRange, clRange, airflowRange, densityRange].forEach((input) => input.addEventListener('input', updateReadouts));
window.addEventListener('resize', resizeCanvas);
updateReadouts();
resizeCanvas();
requestAnimationFrame(animate);
