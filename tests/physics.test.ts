import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { buildRun, sample, configuration } from '../src/physics/treadmill.js';
import { initialParameters, magnusForce, parameters, parameterOrder, visualMapping } from '../src/physics/formula.ts';

test('ported treadmill model preserves the approved prototype at every permitted setting', async () => {
  const sandbox: Record<string, any> = {};
  runInNewContext(await readFile('prototype/treadmill-model.js', 'utf8'), sandbox);
  for (let i = 0; i <= 8; i++) for (const direction of [-1, 1]) {
    const options = { beltSpeed: 6 + i * .5, direction };
    const run = buildRun(options), original = sandbox.TreadmillModel.buildRun(options);
    assert.equal(run.duration, original.duration);
    for (const time of [0, run.dropTime, run.separationTime, run.pauseTime, run.duration]) {
      assert.deepEqual(JSON.parse(JSON.stringify(sample(run, time))), JSON.parse(JSON.stringify(sandbox.TreadmillModel.sample(original, time))));
    }
  }
});
test('all permitted treadmill speeds curve continuously, mirror, and stay within the viewport', () => {
  for (let i = 0; i <= 40; i++) {
    const speed = 6 + i / 10, right = buildRun({ beltSpeed: speed }), left = buildRun({ beltSpeed: speed, direction: -1 });
    for (const run of [right, left]) {
      const start = run.ascent[0], end = run.ascent.at(-1)!;
      assert.ok(start.vx * run.direction > 0 && end.vx * run.direction < 0);
      assert.equal(end.vy, 0);
      const energy = (start.vx ** 2 + start.vy ** 2) / 2 + configuration.gravity * start.y;
      for (const point of run.ascent) {
        assert.ok(Object.values(point).every(Number.isFinite));
        assert.ok(Math.abs((point.vx ** 2 + point.vy ** 2) / 2 + configuration.gravity * point.y - energy) < .0003);
        const x = 380 + 190 * point.x, y = 418 - 76 * (point.y - configuration.radius);
        assert.ok(x > 30 && x < 730 && y > 30 && y < 430);
      }
    }
    right.ascent.forEach((p, index) => { assert.equal(p.x, -left.ascent[index].x); assert.equal(p.y, left.ascent[index].y); });
    assert.equal(sample(right, right.dropTime - .001).spinFraction, 0);
    assert.equal(sample(right, right.separationTime).spinFraction, 1);
  }
});
test('the formula is exact, including squared velocity, and all corner combinations remain usable', () => {
  const base = initialParameters();
  assert.equal(magnusForce(base), base.cl * .5 * base.rho * base.v ** 2 * base.area);
  assert.equal(magnusForce({ ...base, v: 8 }), 4 * magnusForce({ ...base, v: 4 }));
  for (let combination = 0; combination < 16; combination++) {
    const values = { ...base };
    parameterOrder.forEach((id, index) => values[id] = combination & (1 << index) ? parameters[id].max : parameters[id].min);
    const visual = visualMapping(values);
    assert.ok(magnusForce(values) > 0 && magnusForce(values) <= 3.24 + 1e-10);
    assert.ok(visual.radius >= 32 && visual.radius <= 62.00001);
    assert.ok(visual.forceLength >= 26 && visual.forceLength <= 138.00001);
    assert.ok(visual.angularSpeed > 0 && visual.airflowSpeed > 0);
    assert.ok(Object.values(visual).every(Number.isFinite));
  }
  const properties = { cl: 'angularSpeed', rho: 'lineCount', v: 'airflowSpeed', area: 'radius' } as const;
  for (const id of parameterOrder) assert.notEqual(visualMapping({ ...base, [id]: parameters[id].min })[properties[id]], visualMapping({ ...base, [id]: parameters[id].max })[properties[id]]);
});
