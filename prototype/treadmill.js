const canvas = document.getElementById('treadmillCanvas');
const context = canvas.getContext('2d');
const reflectionInput = document.getElementById('reflectionInput');
const dropButton = document.getElementById('dropButton');
const finishButton = document.getElementById('finishButton');
const replayButton = document.getElementById('replayButton');
const predictionCheck = document.getElementById('predictionCheck');
const reflectionCheck = document.getElementById('reflectionCheck');
const phaseLabel = document.getElementById('phaseLabel');
const pauseBadge = document.getElementById('pauseBadge');
const beltSpeedRange = document.getElementById('beltSpeedRange');
const beltSpeedValue = document.getElementById('beltSpeedValue');
const beltDirectionRange = document.getElementById('beltDirectionRange');
const beltDirectionValue = document.getElementById('beltDirectionValue');
const progressBar = document.getElementById('progressBar');
const progressValue = document.getElementById('progressValue');

let frameId;
let phase = 'orient';
let startTime = performance.now();
let replayCount = 0;
let simulatedPath = [];

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = bounds.width * ratio;
  canvas.height = bounds.height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function geometry() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  return { width, height, beltY: height * .77, startX: width * .5, startY: height * .16, radius: Math.max(19, Math.min(width, height) * .045) };
}

function pointAt(time) {
  const { width, height, beltY, startX, startY, radius } = geometry();
  if (phase === 'orient') return { x: startX, y: startY, angle: 0 };
  if (phase === 'drop') {
    const progress = Math.min(1, time / 2.1);
    return { x: startX, y: startY + (beltY - radius - startY) * progress * progress, angle: 0 };
  }
  if (phase === 'paused') return { x: startX, y: beltY - radius, angle: 2.8 };
  if (!simulatedPath.length) return { x: startX, y: beltY - radius, angle: 2.8 };
  if (phase === 'complete') return simulatedPath[simulatedPath.length - 1];
  const index = Math.min(simulatedPath.length - 1, Math.floor((time / 3.8) * simulatedPath.length));
  return simulatedPath[index];
}

function buildMagnusPath() {
  const { width, beltY, startX, radius } = geometry();
  const scale = Math.min(width / 22, canvas.clientHeight / 10);
  const beltSpeed = Number(beltSpeedRange.value);
  const direction = Number(beltDirectionRange.value);
  const physicalRadius = 0.11;
  const omega = direction * beltSpeed / physicalRadius;
  const density = 1.225;
  const mass = 0.15;
  const area = Math.PI * physicalRadius * physicalRadius;
  const path = [{ x: startX, y: beltY - radius, angle: 2.8 }];
  let x = 0;
  let y = 0;
  let vx = direction * beltSpeed * .55;
  let vy = 13.5;
  let angle = 2.8;
  const dt = 1 / 60;
  for (let time = 0; time <= 3.8; time += dt) {
    const speed = Math.max(.01, Math.hypot(vx, vy));
    const spinParameter = physicalRadius * Math.abs(omega) / speed;
    const liftCoefficient = Math.min(.6, 1.5 * spinParameter);
    const magnusForce = .5 * density * liftCoefficient * area * speed ** 2;
    const magnusX = -Math.sign(omega) * magnusForce * vy / speed;
    const magnusY = Math.sign(omega) * magnusForce * vx / speed;
    vx += (magnusX / mass) * dt;
    vy += (-9.81 + magnusY / mass) * dt;
    x += vx * dt;
    y += vy * dt;
    angle -= omega * dt;
    path.push({ x: startX + x * scale, y: beltY - radius - y * scale, angle });
    if (vy <= 0 && time > .25) break;
  }
  simulatedPath = path;
}

function draw() {
  const { width, height, beltY, radius } = geometry();
  context.clearRect(0, 0, width, height);
  drawBelt(width, beltY);
  const elapsed = (performance.now() - startTime) / 1000;
  const current = pointAt(phase === 'drop' || phase === 'reveal' ? elapsed : elapsed);
  if (phase === 'reveal' || phase === 'complete') {
    drawPath();
    const ghost = pointAt(Math.min(3.8, Math.max(0, elapsed - .8)));
    drawBall(ghost.x, ghost.y, ghost.angle, radius, true);
  }
  drawBall(current.x, current.y, current.angle, radius, false);
  if (phase === 'drop' && elapsed >= 2.1) {
    phase = 'paused';
    buildMagnusPath();
    startTime = performance.now();
    pauseBadge.classList.add('visible');
    phaseLabel.textContent = 'PHASE 02 / PREDICT';
    dropButton.disabled = false;
    dropButton.querySelector('span').textContent = 'REVEAL WHAT HAPPENS';
    dropButton.querySelector('b').textContent = '▶';
    draw();
    return;
  }
  if (phase === 'reveal' && elapsed >= 3.8) {
    if (replayCount === 0) {
      replayCount = 1;
      startTime = performance.now();
      draw();
      return;
    }
    phase = 'complete';
    phaseLabel.textContent = 'PHASE 03 / EXPLAIN';
    phaseLabel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('predictionTask').classList.add('hidden');
    document.getElementById('reflectionTask').classList.remove('hidden');
    updateProgress(2);
    draw();
    return;
  }
  if (phase === 'complete') return;
  frameId = requestAnimationFrame(() => draw());
}

function drawBelt(width, beltY) {
  context.save();
  context.strokeStyle = '#172321';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(width * .13, beltY);
  context.lineTo(width * .87, beltY);
  context.stroke();
  const beltSpeed = Number(beltSpeedRange.value);
  const direction = Number(beltDirectionRange.value);
  const offset = ((performance.now() / 1000) * beltSpeed * 8 * direction) % 46;
  context.strokeStyle = '#77cfc0';
  context.lineWidth = 2;
  for (let x = width * .13 - 46 + offset; x < width * .87 + 46; x += 46) {
    context.beginPath();
    context.moveTo(x, beltY - 5);
    context.lineTo(x + 12 * direction, beltY + 5);
    context.stroke();
  }
  context.fillStyle = '#67736e';
  context.font = '10px DM Mono';
  context.fillText(`BELT ${Number(beltDirectionRange.value) > 0 ? '→' : '←'} ${beltSpeedRange.value} M/S`, width * .13, beltY + 29);
  context.restore();
}

function drawPath() {
  const { width, height, beltY, startX, radius } = geometry();
  context.save();
  context.strokeStyle = '#ef7854';
  context.lineWidth = 3;
  context.setLineDash([6, 6]);
  context.beginPath();
  simulatedPath.forEach((p, index) => {
    if (index === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
  });
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = '#9ca6a0';
  context.font = '10px DM Mono';
  context.fillText('DEFLECTION PATH', startX + Number(beltDirectionRange.value) * width * .16, beltY - radius - height * .53);
  context.restore();
}

function drawBall(x, y, angle, radius, ghost) {
  context.save();
  context.globalAlpha = ghost ? .22 : 1;
  context.shadowColor = 'rgba(23, 35, 33, .18)';
  context.shadowBlur = 13;
  context.shadowOffsetY = 6;
  const gradient = context.createRadialGradient(x - radius * .3, y - radius * .4, 1, x, y, radius);
  gradient.addColorStop(0, '#ffb090');
  gradient.addColorStop(.55, '#ef7854');
  gradient.addColorStop(1, '#be553d');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.translate(x, y);
  context.rotate(angle);
  context.strokeStyle = '#f8c0a8';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, radius * .65, -.95, .95);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, radius * .65, Math.PI - .95, Math.PI + .95);
  context.stroke();
  if (!ghost && (phase === 'paused' || phase === 'reveal' || phase === 'complete')) {
    context.strokeStyle = '#77cfc0';
    context.beginPath();
    context.moveTo(-radius * 1.6, -radius * .8);
    context.lineTo(-radius * 2.3, -radius * 1.3);
    context.moveTo(radius * 1.6, radius * .8);
    context.lineTo(radius * 2.3, radius * 1.3);
    context.stroke();
  }
  context.restore();
}

function updateProgress(step) {
  progressBar.style.width = `${step === 3 ? 100 : step === 2 ? 66 : 33}%`;
  progressValue.textContent = `${step} / 3`;
}

function updatePrediction() {
  const valid = document.querySelector('.prediction-choice.selected') !== null;
  predictionCheck.classList.toggle('complete', valid);
  document.getElementById('predictionStatus').textContent = valid ? 'Prediction selected' : 'Choose a direction';
  dropButton.disabled = !valid;
}

function updateReflection() {
  const valid = reflectionInput.value.trim().length > 24 && /(spin|belt|treadmill|contact|direction|speed|magnus|friction)/i.test(reflectionInput.value);
  reflectionCheck.classList.toggle('complete', valid);
  document.getElementById('reflectionStatus').textContent = valid ? 'Explanation captured — nice connection' : 'Mention the belt, spin, contact, or direction';
  finishButton.disabled = !valid;
}

function beginDrop() {
  if (phase === 'paused') {
    reveal();
    return;
  }
  cancelAnimationFrame(frameId);
  phase = 'drop';
  startTime = performance.now();
  pauseBadge.classList.remove('visible');
  phaseLabel.textContent = 'PHASE 01 / CONTACT';
  dropButton.disabled = true;
  dropButton.querySelector('span').textContent = 'DROP THE BALL';
  dropButton.querySelector('b').textContent = '↘';
  draw();
}

function reveal() {
  cancelAnimationFrame(frameId);
  phase = 'reveal';
  replayCount = 0;
  startTime = performance.now();
  buildMagnusPath();
  pauseBadge.classList.remove('visible');
  draw();
}

function finish() {
  updateProgress(3);
  finishButton.textContent = '✓ EXPLORATION COMPLETE';
  finishButton.disabled = true;
  document.getElementById('rewardBanner').classList.add('visible');
}

reflectionInput.addEventListener('input', updateReflection);
dropButton.addEventListener('click', beginDrop);
document.getElementById('pauseBadge').addEventListener('click', () => { if (phase === 'paused') reveal(); });
replayButton.addEventListener('click', () => { phase = 'reveal'; replayCount = 0; startTime = performance.now(); buildMagnusPath(); pauseBadge.classList.remove('visible'); draw(); });
beltSpeedRange.addEventListener('input', () => { beltSpeedValue.value = beltSpeedRange.value; draw(); });
beltDirectionRange.addEventListener('input', () => { beltDirectionValue.textContent = Number(beltDirectionRange.value) > 0 ? 'RIGHT →' : '← LEFT'; draw(); });
finishButton.addEventListener('click', finish);
window.addEventListener('resize', resizeCanvas);
document.querySelectorAll('.prediction-choice').forEach((choice) => choice.addEventListener('click', () => {
  document.querySelectorAll('.prediction-choice').forEach((button) => button.classList.remove('selected'));
  choice.classList.add('selected');
  updatePrediction();
}));
updatePrediction();
updateProgress(1);
resizeCanvas();
draw();
