const form = document.getElementById('assessment-form');
const content = document.getElementById('question-content');
const errorMessage = document.getElementById('error-message');
const continueButton = document.getElementById('continue-button');
const buttonLabel = document.getElementById('button-label');
const stepLabel = document.getElementById('step-label');
const progressLabel = document.getElementById('progress-label');
const progressBar = document.getElementById('progress-bar');

const answers = [];
let currentStep = 0;
let vector = null;
let vectorPreview = null;

const tasks = [
  {
    kicker: 'TASK 1 / GENERAL UNDERSTANDING',
    title: 'Where is the force vector?',
    description: 'A car has just crossed the line in front of a traffic light and is accelerating to the right. Place an arrow on the car to show the direction of the acceleration force.',
    render: renderVectorTask,
    validate: () => vector ? null : 'Drag on the figure to place a force vector before confirming.'
  },
  {
    kicker: 'TASK 2 / CALCULATION',
    title: 'Calculate the electric force.',
    description: 'Two point charges interact in air. Use Coulomb’s law and the provided values to calculate the magnitude of the electric force. Enter a number; an estimate is okay.',
    render: () => `
      <div class="formula">F = k · |q₁ · q₂| / r²</div>
      <div class="data-table">
        <div class="data-row"><span>k</span><strong>8.99 × 10⁹ N·m²/C²</strong></div>
        <div class="data-row"><span>q₁</span><strong>2 × 10⁻⁶ C</strong></div>
        <div class="data-row"><span>q₂</span><strong>3 × 10⁻⁶ C</strong></div>
        <div class="data-row"><span>r</span><strong>0.5 m</strong></div>
      </div>
      <label class="field-label" for="coulomb-answer">YOUR CALCULATED FORCE</label>
      <input class="text-input" id="coulomb-answer" name="coulomb" type="number" step="any" inputmode="decimal" />
      <span class="unit">newtons (N)</span>
    `,
    validate: () => valueRequired('coulomb-answer', 'Enter your calculated force before confirming.')
  },
  {
    kicker: 'TASK 3 / INTUITION',
    title: 'What does spin change?',
    description: 'Imagine two identical spheres moving from left to right through still air at the same speed. Sphere A does not spin. Sphere B spins counterclockwise when viewed from the front. How does sphere B behave differently, and why?',
    render: renderIntuitionTask,
    validate: () => valueRequired('free-answer', 'Write an answer before confirming.')
  },
  {
    kicker: 'TASK 4 / VARIABLES',
    title: 'What affects the spinning sphere?',
    description: 'List the variables you think could affect the behavior or deflection of a spinning sphere moving through air. Use words, symbols, or both.',
    render: renderTextTask,
    validate: () => valueRequired('free-answer', 'List at least one variable before confirming.')
  },
  {
    kicker: 'TASK 5 / MAGNUS FORCE',
    title: 'Calculate the force due to spin.',
    description: 'A ball moves through air. Use the symbols and values below to calculate the magnitude of the force acting on it due to its spin. Some listed parameters may not be needed.',
    render: () => `
      <div class="parameter-list">
        m=4 kg, ρ=1.2 kg/m³, ω=180 rad/s, A=0.9 m², T=20 °C,
        v=23 m/s, r=0.25 m, C<sub>D</sub>=0.4, C<sub>L</sub>=0.3, g=9.81 m/s²
      </div>
      <label class="field-label" for="magnus-answer">YOUR CALCULATED FORCE</label>
      <input class="text-input" id="magnus-answer" name="magnus" type="number" step="any" inputmode="decimal" />
      <span class="unit">newtons (N)</span>
    `,
    validate: () => valueRequired('magnus-answer', 'Enter your calculated force before confirming.')
  }
];

function valueRequired(id, message) {
  const field = document.getElementById(id);
  if (!field || !field.value.trim()) return message;
  return null;
}

function renderTextTask() {
  return `
    <label class="field-label" for="free-answer">YOUR RESPONSE</label>
    <textarea class="answer-area" id="free-answer" name="response" placeholder="Type your answer here..."></textarea>
  `;
}

function renderIntuitionTask() {
  return `
    <div class="sphere-comparison" role="img" aria-label="Two spheres moving from left to right. Sphere A is not spinning. Sphere B is spinning counterclockwise.">
      <div class="sphere-card">
        <div class="sphere-card-label">SPHERE A / NO SPIN</div>
        <div class="sphere-scene">
          <span class="motion-arrow" aria-hidden="true">→ → →</span>
          <span class="sphere sphere-still" aria-hidden="true"></span>
        </div>
        <div class="sphere-caption">Moving left to right</div>
      </div>
      <div class="sphere-card sphere-card-accent">
        <div class="sphere-card-label">SPHERE B / COUNTERCLOCKWISE</div>
        <div class="sphere-scene">
          <span class="motion-arrow" aria-hidden="true">→ → →</span>
          <span class="sphere sphere-spinning" aria-hidden="true"><span>↺</span></span>
        </div>
        <div class="sphere-caption">Moving left to right + spinning</div>
      </div>
    </div>
    <label class="field-label" for="free-answer">YOUR RESPONSE</label>
    <textarea class="answer-area" id="free-answer" name="response" placeholder="Type your answer here..."></textarea>
  `;
}

function renderVectorTask() {
  vector = null;
  return `
    <div class="vector-stage">
      <canvas id="vector-canvas" width="760" height="270" aria-label="A car accelerating to the right beside a traffic light. Drag to draw the force vector."></canvas>
      <div class="vector-instruction"><strong>DRAG YOUR MOUSE TO DRAW YOUR ARROW</strong><span>Direction matters more than length.</span></div>
    </div>
  `;
}

function drawVectorScene() {
  const canvas = document.getElementById('vector-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scale = width / canvas.width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e5e3d8';
  ctx.fillRect(0, 208, canvas.width, 62);
  ctx.strokeStyle = '#b7b6aa';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 208); ctx.lineTo(canvas.width, 208); ctx.stroke();
  ctx.fillStyle = '#ef7854'; ctx.fillRect(185, 157, 145, 44);
  ctx.fillStyle = '#172321'; ctx.fillRect(205, 132, 82, 29);
  ctx.fillStyle = '#f2efe8'; ctx.fillRect(214, 137, 29, 19); ctx.fillRect(251, 137, 29, 19);
  ctx.fillStyle = '#172321';
  ctx.beginPath(); ctx.arc(218, 202, 13, 0, Math.PI * 2); ctx.arc(298, 202, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2efe8';
  ctx.beginPath(); ctx.arc(218, 202, 5, 0, Math.PI * 2); ctx.arc(298, 202, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#67736e'; ctx.fillRect(555, 77, 9, 131);
  ctx.fillStyle = '#172321'; ctx.fillRect(531, 62, 57, 91);
  ['#6f4037', '#77743b', '#77cfc0'].forEach((color, index) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(559, 81 + index * 29, 10, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#67736e'; ctx.font = '12px DM Mono, monospace'; ctx.fillText('ACCELERATING', 184, 245); ctx.fillText('TRAFFIC LIGHT', 518, 229);
  if (vector) drawArrow(ctx, vector.startX, vector.startY, vector.endX, vector.endY);
  if (vectorPreview) drawArrow(ctx, vectorPreview.startX, vectorPreview.startY, vectorPreview.endX, vectorPreview.endY, true);
}

function drawArrow(ctx, startX, startY, endX, endY, preview = false) {
  const angle = Math.atan2(endY - startY, endX - startX);
  ctx.strokeStyle = preview ? '#67736e' : '#172321'; ctx.fillStyle = preview ? '#67736e' : '#172321'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(endX - 15 * Math.cos(angle - Math.PI / 6), endY - 15 * Math.sin(angle - Math.PI / 6)); ctx.lineTo(endX - 15 * Math.cos(angle + Math.PI / 6), endY - 15 * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fill();
}

function attachVectorInteraction() {
  const canvas = document.getElementById('vector-canvas');
  if (!canvas) return;
  let start = null;
  const point = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
  };
  canvas.addEventListener('pointerdown', (event) => {
    start = point(event);
    vectorPreview = { startX: start.x, startY: start.y, endX: start.x, endY: start.y };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!start) return;
    const end = point(event);
    vectorPreview = { startX: start.x, startY: start.y, endX: end.x, endY: end.y };
    drawVectorScene();
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!start) return;
    const end = point(event);
    if (Math.hypot(end.x - start.x, end.y - start.y) > 15) vector = { startX: start.x, startY: start.y, endX: end.x, endY: end.y };
    start = null; vectorPreview = null; drawVectorScene();
  });
  canvas.addEventListener('pointercancel', () => { start = null; vectorPreview = null; drawVectorScene(); });
  drawVectorScene();
}

function renderTask() {
  const task = tasks[currentStep];
  stepLabel.textContent = `TASK ${currentStep + 1} / ${tasks.length}`;
  const percent = Math.round(((currentStep + 1) / tasks.length) * 100);
  progressLabel.textContent = `${percent}% COMPLETE`;
  progressBar.style.width = `${percent}%`;
  content.innerHTML = `<p class="question-kicker">${task.kicker}</p><h2 class="question-title" id="question-title">${task.title}</h2><p class="question-description">${task.description}</p>${task.render()}`;
  errorMessage.textContent = '';
  buttonLabel.textContent = currentStep === tasks.length - 1 ? 'FINISH TEST' : 'CONFIRM ANSWER';
  if (currentStep === 0) attachVectorInteraction();
  const firstInput = content.querySelector('input, textarea');
  if (firstInput) firstInput.focus();
}

function showCompletion() {
  stepLabel.textContent = 'TEST COMPLETE';
  progressLabel.textContent = '100% COMPLETE';
  progressBar.style.width = '100%';
  form.innerHTML = `
    <div class="completion">
      <div class="completion-mark" aria-hidden="true">✓</div>
      <h2>Thank you.</h2>
      <p>Your responses have been recorded for this pre-test.</p>
    </div>
  `;
}

async function submitToNetlify() {
  answers.forEach((answer, index) => {
    form.elements[`task_${index + 1}`].value = answer;
  });
  const formData = new FormData(form);
  const response = await fetch(form.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formData).toString()
  });
  if (!response.ok) throw new Error(`Netlify form submission failed with status ${response.status}.`);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = tasks[currentStep].validate();
  if (message) { errorMessage.textContent = message; return; }
  const currentAnswer = currentStep === 0
    ? `Arrow placed from (${Math.round(vector.startX)}, ${Math.round(vector.startY)}) to (${Math.round(vector.endX)}, ${Math.round(vector.endY)})`
    : new FormData(form).get('response') || new FormData(form).get('coulomb') || new FormData(form).get('magnus');
  answers.push(currentAnswer);
  currentStep += 1;
  if (currentStep < tasks.length) {
    renderTask();
    return;
  }
  continueButton.disabled = true;
  buttonLabel.textContent = 'SUBMITTING...';
  errorMessage.textContent = '';
  try {
    await submitToNetlify();
    showCompletion();
  } catch (error) {
    currentStep -= 1;
    answers.pop();
    continueButton.disabled = false;
    buttonLabel.textContent = 'FINISH TEST';
    errorMessage.textContent = 'Your answers could not be submitted. Please check your connection and try again.';
    console.error(error);
  }
});

renderTask();
