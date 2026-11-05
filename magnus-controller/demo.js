(function () {
  'use strict';
  const definitions = [
    { key: 'liftCoefficient', label: 'Lift coefficient', symbol: 'Cₗ · signed spin direction', min: -1, max: 1, step: 0.01, initial: 0.45, unit: '', digits: 2 },
    { key: 'density', label: 'Air density', symbol: 'ρ · mass per unit volume', min: 0, max: 2, step: 0.01, initial: 1.23, unit: ' kg/m³', digits: 2 },
    { key: 'speed', label: 'Velocity magnitude', symbol: '|v| · direction shown on the field', min: 0, max: 30, step: 0.1, initial: 12, unit: ' m/s', digits: 1 },
    { key: 'area', label: 'Cross-sectional area', symbol: 'A · projected area of the ball', min: 0.005, max: 0.1, step: 0.001, initial: 0.038, unit: ' m²', digits: 3 }
  ];
  const params = { mass: 0.43, liftCoefficient: 0.45, density: 1.23, area: 0.038 };
  let state, elapsed, trail, paused = false, last = null, spinAngle = 0, heading = { x: 1, y: 0 }, angularVelocity = 0;
  const canvas = document.querySelector('#scene'), ctx = canvas.getContext('2d');
  const speedInput = () => Number(document.querySelector('#speed').value);
  function estimateSpin() {
    // Illustrative mapping: keep spin independent of velocity and ball size.
    angularVelocity = params.liftCoefficient * 25;
  }
  function reset() { heading = { x: 1, y: 0 }; state = { x: 0, y: 0, vx: speedInput(), vy: 0 }; elapsed = 0; trail = [{ x: 0, y: 0 }]; spinAngle = 0; angularVelocity = 0; estimateSpin(); last = null; update(); draw(); }
  const container = document.querySelector('#sliders');
  definitions.forEach(def => {
    const block = document.createElement('div'); block.className = 'slider';
    block.innerHTML = `<div class="slider-top"><label for="${def.key}">${def.label}</label><strong id="${def.key}-value"></strong></div><small>${def.symbol}</small><input id="${def.key}" type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${def.initial}"><div class="ends"><span>${def.min}</span><span>${def.max}</span></div>`;
    container.appendChild(block);
    const input = block.querySelector('input'), output = block.querySelector('strong');
    function change() {
      const value = Number(input.value); output.textContent = value.toFixed(def.digits) + def.unit;
      if (def.key === 'speed') { const current = Math.hypot(state.vx, state.vy); if (current) heading = { x: state.vx / current, y: state.vy / current }; state.vx = heading.x * value; state.vy = heading.y * value; }
      else params[def.key] = value;
      estimateSpin(); update(); draw();
    }
    input.addEventListener('input', change);
    output.textContent = def.initial.toFixed(def.digits) + def.unit;
  });
  function update() {
    document.querySelector('#force').textContent = MagnusPhysics.force(state, params).magnitude.toFixed(2) + ' N';
    document.querySelector('#speed-readout').textContent = Math.hypot(state.vx, state.vy).toFixed(1) + ' m/s';
    document.querySelector('#time').textContent = elapsed.toFixed(1) + ' s';
  }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) { canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr); }
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const scale = 13, cx = w * .5, cy = h * .52;
    const point = p => ({ x: cx + (p.x-state.x)*scale, y: cy - (p.y-state.y)*scale });
    ctx.strokeStyle='#20342a'; ctx.lineWidth=1;
    const ox = ((cx-state.x*scale)%52+52)%52, oy = ((cy+state.y*scale)%52+52)%52;
    for(let x=ox;x<w;x+=52){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=oy;y<h;y+=52){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    if(trail.length>1){ctx.beginPath();trail.forEach((p,i)=>{const q=point(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.strokeStyle='#7ab589';ctx.lineWidth=2;ctx.stroke();}
    const speed = Math.hypot(state.vx,state.vy), f = MagnusPhysics.force(state,params);
    // The ball is enlarged, but its radius is proportional to sqrt(A/π).
    const ballRadius = Math.sqrt(params.area / Math.PI) * 90;
    function arrow(x,y,color,length){const n=Math.hypot(x,y);if(!n)return;const dx=x/n,dy=-y/n,ex=cx+dx*length,ey=cy+dy*length;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);ctx.stroke();ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-dx*8-dy*4,ey-dy*8+dx*4);ctx.lineTo(ex-dx*8+dy*4,ey-dy*8-dx*4);ctx.closePath();ctx.fill();}
    if(speed)arrow(state.vx,state.vy,'#b8edb8',ballRadius + speed * 4); if(f.magnitude)arrow(f.x,f.y,'#f4ac77',Math.min(80,25+f.magnitude*15));
    if(ballRadius > 0) { ctx.save();ctx.translate(cx,cy);ctx.rotate(-spinAngle);ctx.fillStyle='#e6eee0';ctx.beginPath();ctx.arc(0,0,ballRadius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#758d7e';ctx.lineWidth=Math.max(0.5,ballRadius/7);ctx.beginPath();ctx.arc(0,0,ballRadius*.65,-1.2,1.2);ctx.moveTo(-ballRadius*.35,-ballRadius*.85);ctx.lineTo(ballRadius*.35,ballRadius*.85);ctx.stroke();ctx.restore(); }
  }
  document.querySelector('#pause').addEventListener('click', e => { paused=!paused; e.target.textContent=paused?'Resume':'Pause';last=null; });
  document.querySelector('#reset').addEventListener('click', reset);
  window.addEventListener('resize',draw);
  function frame(timestamp){if(last!==null&&!paused){const dt=Math.min((timestamp-last)/1000,0.05);state=MagnusPhysics.step(state,params,dt);elapsed+=dt;spinAngle=(spinAngle+angularVelocity*dt)%(2*Math.PI);trail.push({x:state.x,y:state.y});if(trail.length>1000)trail.shift();update();}last=timestamp;draw();requestAnimationFrame(frame);}
  reset();requestAnimationFrame(frame);
})();
