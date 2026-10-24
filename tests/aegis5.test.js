// Körs med: node tests/aegis5.test.js
const assert = require('assert');
const planck = require('../js/vendor/planck.min.js');
const E = require('../js/aegis5/engine.js');
const T = require('../tables/aegis5.js');
const v = (x, y) => planck.Vec2(x * 0.01, y * 0.01);
const fresh = () => { const s = E.create(T); s.newGame(); const b = s.balls[0]; return [s, b]; };
const run = (s, sec, fn) => { for (let i = 0; i < sec / s.tune.step; i++) { s.step(); if (fn) fn(); } };
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok  ', name); };

test('utskjutning tar bollen runt kupolen', () => {
  const [s, b] = fresh(); s.launch(0.3);
  let minY = 1e9; run(s, 3, () => { minY = Math.min(minY, s.posPx(b).y); });
  assert(minY < 200, `nådde bara y=${minY}`);
});

test('ramp: tillräcklig fart ger utgång, för låg fart rullar tillbaka', () => {
  for (const [speed, expectExit] of [[8, false], [16, true]]) {
    const [s, b] = fresh(); b.state = 'play'; s.game.state = 'play';
    const p0 = T.ramps[0].path[0], p1 = T.ramps[0].path[1];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    b.body.setPosition(v(p0[0] - dx / l * 60, p0[1] - dy / l * 60));
    b.body.setLinearVelocity(planck.Vec2(dx / l * speed, dy / l * speed));
    let exited = false;
    run(s, 4, () => s.takeEvents().forEach(e => { if (e.type === 'rampExit') exited = true; }));
    assert.strictEqual(exited, expectExit, `fart ${speed}`);
  }
});

test('Airlock låser bollen när den är tänd', () => {
  const [s, b] = fresh(); b.state = 'play'; s.game.state = 'play'; s.game.airlockLit = true;
  b.body.setPosition(v(472, 1000)); b.body.setLinearVelocity(planck.Vec2(0, -14));
  run(s, 3);
  assert.strictEqual(s.game.locked, 1);
  assert(s.balls.some(x => x.state === 'lane'), 'ny boll ska serveras');
});

test('fuzz: 6 spel, ingen boll lämnar bordet och spelen tar slut', () => {
  for (let g = 0; g < 6; g++) {
    const s = E.create(T); s.newGame(); let steps = 0, wait = 60;
    while (s.game.state !== 'over' && steps++ < 120 * 400) {
      if (s.balls.some(b => b.state === 'lane') && --wait <= 0) { s.launch(0.3 + Math.random() * 0.6); wait = 60 + Math.random() * 60; }
      let L = false, R = false;
      s.balls.forEach(b => {
        if (b.state !== 'play' || b.mode !== 'normal') return;
        const q = s.posPx(b), vy = b.body.getLinearVelocity().y;
        if (q.y > 2080 && q.y < 2290 && vy > -2) { if (q.x < 472 && q.x > 230) L = true; if (q.x >= 472 && q.x < 715) R = true; }
      });
      s.input.left = L; s.input.right = R;
      s.step();
      s.balls.forEach(b => { const q = s.posPx(b); assert(q.x > 0 && q.x < 1024 && q.y > -30 && q.y < 2620, `boll utanför bordet: ${q.x|0},${q.y|0}`); });
      s.takeEvents();
    }
    assert.strictEqual(s.game.state, 'over', 'spelet tog inte slut');
  }
});

console.log(`\n${n} tester klarade`);
