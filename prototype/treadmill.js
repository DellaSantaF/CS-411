(() => {
  'use strict';
  const { buildRun, sample, configuration } = globalThis.TreadmillModel;
  const byId = id => document.getElementById(id);
  const ball = byId('ball');
  const ghost = byId('ghost');
  const settings = byId('belt-settings');
  const directionToggle = document.querySelector('.direction-toggle');
  const speed = byId('speed');
  const runButton = byId('run');
  const status = byId('status');
  const display = Object.freeze({ originX: 380, beltY: 430, pixelsPerMetre: 76,
    horizontalGain: 2.5, ballRadius: 12, playbackRate: 0.55, beltPixelsPerMetre: 22,
    maximumCompression: 0.04 });

  let run = buildRun();
  let mode = 'setup';
  let clock = 0;
  let replayClock = 0;
  let beltOffset = 0;
  let lastFrame = null;
  let runAgain = false;
  let selectedDirection = 1;
  const confirmed = { ball: false, belt: false };

  function toScreen(state) {
    return { x: display.originX + state.x * display.pixelsPerMetre * display.horizontalGain,
      y: display.beltY - display.ballRadius - (state.y - configuration.radius) * display.pixelsPerMetre };
  }

  function drawBall(element, state) {
    const point = toScreen(state);
    element.setAttribute('transform', `translate(${point.x} ${point.y})`);
    // Match rendered rim travel to rendered belt travel, using f = v / circumference.
    // Keep this visual mapping separate from the idealized angular velocity in the model.
    const circumference = 2 * Math.PI * display.ballRadius;
    const revolutionsPerModelSecond = run.beltSpeed * display.beltPixelsPerMetre / circumference;
    const spinTime = state.angle / run.omega;
    const angle = -run.direction * spinTime * revolutionsPerModelSecond * 360;
    const compression = state.compression * display.maximumCompression;
    element.querySelector('[data-body]').setAttribute('transform',
      `translate(0 ${display.ballRadius * compression}) scale(${1 + compression} ${1 - compression}) rotate(${angle})`);
    const spin = element.querySelector('[data-spin]');
    spin.setAttribute('opacity', String(state.spinFraction));
    spin.setAttribute('transform', `scale(1 ${run.direction})`);
  }

  function drawPath(time) {
    const dropState = sample(run, Math.min(time, run.dropTime));
    const release = toScreen(sample(run, 0));
    const dropped = toScreen(dropState);
    byId('drop-path').setAttribute('d', `M${release.x} ${release.y}L${dropped.x} ${dropped.y}`);
    const elapsed = time - run.separationTime;
    if (elapsed < 0) { byId('trajectory').setAttribute('d', ''); return; }
    const points = run.ascent.filter(point => point.t < elapsed).map(toScreen);
    points.push(toScreen(sample(run, time)));
    byId('trajectory').setAttribute('d', points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(''));
  }

  function showPanel(name) {
    byId('task-window').classList.toggle('is-current', name === 'prediction');
    for (const id of ['setup', 'dropping', 'prediction', 'reveal', 'exploration']) {
      byId(`${id}-panel`).hidden = id !== name;
    }
  }

  function setPlaybackLocked(locked) {
    settings.disabled = locked;
    runButton.disabled = locked;
  }

  function pauseForPrediction() {
    mode = 'prediction';
    clock = run.pauseTime;
    byId('pause-badge').setAttribute('visibility', 'visible');
    showPanel('prediction');
    status.textContent = 'Paused just after contact';
    byId('prediction').focus({ preventScroll: true });
    byId('task-window').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  function finishRun() {
    mode = 'exploration';
    clock = run.duration;
    setPlaybackLocked(false);
    runButton.hidden = false;
    byId('settings-note').textContent = 'Changes apply to the next run.';
    showPanel('exploration');
    status.textContent = 'Stopped at the highest point';
  }

  function startRun(repeated) {
    run = buildRun({ beltSpeed: Number(speed.value), direction: selectedDirection });
    runAgain = repeated;
    mode = 'drop';
    clock = 0;
    replayClock = 0;
    lastFrame = null;
    setPlaybackLocked(true);
    byId('pause-badge').setAttribute('visibility', 'hidden');
    ghost.setAttribute('visibility', 'hidden');
    byId('trajectory').setAttribute('d', '');
    byId('drop-path').setAttribute('d', '');
    showPanel(repeated ? 'exploration' : 'dropping');
    status.textContent = 'Dropping';
  }

  function frame(timestamp) {
    const delta = lastFrame === null || document.hidden ? 0 : Math.min(0.05, (timestamp - lastFrame) / 1000);
    lastFrame = document.hidden ? null : timestamp;
    const previousMode = mode;
    const playing = ['drop', 'replay', 'ascent'].includes(previousMode);
    const beforeTime = previousMode === 'replay' ? replayClock : clock;

    if (mode === 'drop') {
      clock += delta * display.playbackRate;
      if (clock >= run.pauseTime) {
        if (runAgain) { mode = 'ascent'; status.textContent = 'Rising'; }
        else pauseForPrediction();
      }
    } else if (mode === 'replay') {
      replayClock += delta * display.playbackRate;
      if (replayClock >= run.pauseTime) {
        clock = replayClock;
        mode = 'ascent';
        ghost.setAttribute('visibility', 'hidden');
        status.textContent = 'Rising';
        byId('reveal-description').textContent = 'Observe the path as the ball rises.';
      } else {
        drawBall(ghost, sample(run, replayClock));
      }
    } else if (mode === 'ascent') {
      clock += delta * display.playbackRate;
      if (clock >= run.duration) finishRun();
    }
    // Advance the belt by exactly the same model time as the moving ball (or faded replay).
    // Setup, prediction, the apex, and hidden tabs therefore freeze both animations.
    const afterTime = previousMode === 'replay' ? replayClock : clock;
    const modelDelta = playing ? Math.max(0, afterTime - beforeTime) : 0;
    beltOffset = (beltOffset + modelDelta * display.beltPixelsPerMetre * run.beltSpeed * run.direction) % 48;
    byId('belt-texture').setAttribute('transform', `translate(${beltOffset} 0)`);
    byId('belt-arrow').setAttribute('transform', run.direction === 1 ? '' : 'translate(760 0) scale(-1 1)');
    drawBall(ball, sample(run, clock));
    drawPath(clock);
    requestAnimationFrame(frame);
  }

  for (const target of ['ball', 'belt']) {
    byId(`confirm-${target}`).addEventListener('click', () => {
      confirmed[target] = true;
      byId(`${target}-description`).hidden = true;
      const ready = confirmed.ball && confirmed.belt;
      byId('drop').disabled = !ready;
      byId('setup-instruction').textContent = ready ? 'Select Drop ball to begin.'
        : `Confirm the ${confirmed.ball ? 'treadmill' : 'ball'} description in the scene.`;
      if (ready) byId('drop').focus({ preventScroll: true });
    });
  }
  byId('drop').addEventListener('click', () => {
    if (mode === 'setup' && confirmed.ball && confirmed.belt) startRun(false);
  });
  byId('prediction').addEventListener('input', () => {
    byId('check').disabled = !byId('prediction').value.trim();
  });
  byId('check').addEventListener('click', () => {
    if (mode !== 'prediction' || !byId('prediction').value.trim() || byId('prediction').readOnly) return;
    // Prediction recognition only: no correctness grading or live AI in this demonstration.
    byId('prediction').readOnly = true;
    byId('check').disabled = true;
    byId('prediction-feedback').textContent = 'Prediction recorded.';
    byId('reveal').disabled = false;
  });
  byId('reveal').addEventListener('click', () => {
    if (mode !== 'prediction' || byId('reveal').disabled) return;
    mode = 'replay';
    replayClock = 0;
    byId('pause-badge').setAttribute('visibility', 'hidden');
    ghost.setAttribute('visibility', 'visible');
    drawBall(ghost, sample(run, 0));
    showPanel('reveal');
    status.textContent = 'Replaying the drop and contact';
  });
  speed.addEventListener('input', () => {
    byId('speed-value').value = `${Number(speed.value).toFixed(1)} m/s`;
    speed.setAttribute('aria-valuetext', `${Number(speed.value).toFixed(1)} metres per second`);
  });
  directionToggle.querySelectorAll('[data-direction]').forEach(button => {
    button.addEventListener('click', () => {
      if (settings.disabled) return;
      selectedDirection = Number(button.dataset.direction);
      directionToggle.dataset.direction = String(selectedDirection);
      directionToggle.querySelectorAll('button').forEach(option => {
        option.setAttribute('aria-pressed', String(option === button));
      });
    });
  });
  runButton.addEventListener('click', () => { if (mode === 'exploration') startRun(true); });
  requestAnimationFrame(frame);
})();
