// Station Aegis 5 – fysik och spelregler (Planck.js / Box2D). Ingen DOM: kan köras i både webbläsare och Node.
// Världen använder meter (1 m = 100 px i tabelldatan), y växer nedåt.
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const planck = isNode ? require('../vendor/planck.min.js') : root.planck;
  const api = factory(planck);
  if (isNode) module.exports = api; else root.Aegis5Engine = api;
})(typeof self !== 'undefined' ? self : this, planck => {
  'use strict';

  const S = 0.01;                                   // px → m
  const vec = (x, y) => planck.Vec2(x * S, y * S);
  const CAT = { PLAY: 1, RAMP: 2, BALL: 4, SENSOR: 8, BALLR: 16 };
  const MASK_BALL = CAT.PLAY | CAT.SENSOR | CAT.BALL;
  const MASK_BALLR = CAT.RAMP | CAT.SENSOR | CAT.BALLR;

  const TUNE = {
    gravity: 16,               // m/s² nedåt
    step: 1 / 120,
    flipperSpeed: 18,          // rad/s
    flipperTorque: 9000,
    launchMin: 27, launchMax: 38,   // m/s
    rampGravity: 0.22, rampDamping: 0.45,
    bumperKick: 11,            // m/s
    slingKick: 9,
    kickback: 30,
    ballSaver: 10,             // sekunder efter utskjutning
    ballsPerGame: 3,
  };

  // ---------- Geometrihjälp ----------
  const norm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };

  // Förskjuter en polylinje i sidled (d > 0 åt ena hållet, d < 0 åt andra), med mitring i hörnen.
  function offsetPath(path, d) {
    return path.map((p, i) => {
      const ns = [];
      if (i > 0) ns.push(norm(path[i - 1], p));
      if (i < path.length - 1) ns.push(norm(p, path[i + 1]));
      let nx = 0, ny = 0;
      ns.forEach(n => { nx += n[0]; ny += n[1]; });
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      let k = 1;
      if (ns.length === 2) k = 1 / Math.max(0.5, Math.sqrt((1 + ns[0][0] * ns[1][0] + ns[0][1] * ns[1][1]) / 2));
      return [p[0] + nx * d * k, p[1] + ny * d * k];
    });
  }
  const rampRails = ramp => [offsetPath(ramp.path, ramp.width / 2), offsetPath(ramp.path, -ramp.width / 2)];

  function domePoints(dome, n = 96) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + Math.PI * i / n;
      pts.push([dome.cx + dome.r * Math.cos(a), dome.cy + dome.r * Math.sin(a)]);
    }
    return pts;
  }

  // ---------- Motorn ----------
  function create(table, opts = {}) {
    const tune = { ...TUNE, ...(opts.tune || {}) };
    const R = table.ball.r;
    const world = new planck.World({ gravity: planck.Vec2(0, tune.gravity) });
    const ground = world.createBody();
    const events = [];
    const emit = (type, data) => events.push({ type, ...data });
    const pending = [];                              // åtgärder som inte får göras mitt i ett fysiksteg
    const lostBalls = new Set();

    const game = {
      state: 'attract',        // attract | serve | play | over
      time: 0, score: 0, ball: 1, balls: tune.ballsPerGame,
      bonus: 0, bonusMult: 1,
      lanes: [false, false, false, false, false],
      drops: [false, false, false, false], dropsResetAt: 0,
      standL: [false, false, false], standR: [false, false, false],
      kickbackArmed: false, saver: 0,
      airlockLit: false, locked: 0, multiball: false, jackpot: false,
      tilt: false, nudges: [],
      message: '', messageUntil: 0,
    };
    const input = { left: false, right: false };
    const ballList = [];
    let nextBallId = 1;
    const ejectQueue = [];                            // { at, ball }

    const say = (text, dur = 2.5) => { game.message = text; game.messageUntil = game.time + dur; emit('message', { text }); };
    const addScore = (n, why) => { game.score += n; emit('score', { n, why }); };

    // ---------- Statiska former ----------
    const play = { filterCategoryBits: CAT.PLAY, filterMaskBits: CAT.BALL };
    const sensorDef = { isSensor: true, filterCategoryBits: CAT.SENSOR, filterMaskBits: CAT.BALL | CAT.BALLR };

    function addSeg(body, a, b, thick, fix) {
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len > 0.01) {
        body.createFixture({ shape: planck.Box(len / 2 * S, thick / 2 * S, vec((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), Math.atan2(dy, dx)), ...fix });
      }
      body.createFixture({ shape: planck.Circle(vec(a[0], a[1]), thick / 2 * S), ...fix });
      body.createFixture({ shape: planck.Circle(vec(b[0], b[1]), thick / 2 * S), ...fix });
    }
    const addPolyline = (body, pts, thick, fix) => { for (let i = 0; i < pts.length - 1; i++) addSeg(body, pts[i], pts[i + 1], thick, fix); };
    // Kedja: släta skarvar (inga "spökkollisioner"), används för kurvor där bollen glider längs väggen.
    const addChain = (body, pts, fix) => body.createFixture({ shape: planck.Chain(pts.map(p => vec(p[0], p[1])), false), ...fix });
    const sensorBox = (cx, cy, w, h, angle, data) =>
      ground.createFixture({ shape: planck.Box(w / 2 * S, h / 2 * S, vec(cx, cy), angle || 0), ...sensorDef, userData: data });

    const walls = world.createBody();
    const wallFix = { ...play, friction: 0.1, restitution: 0.35 };
    addChain(walls, domePoints({ ...table.dome, r: table.dome.r - 7 }, 128), wallFix);   // innerkant = ritad innerkant
    table.walls.forEach(w => {
      if (w.closed) walls.createFixture({ shape: planck.Polygon(w.pts.map(p => vec(p[0], p[1]))), ...wallFix });
      else addPolyline(walls, w.pts, w.thick, wallFix);
    });
    table.posts.forEach(p => walls.createFixture({ shape: planck.Circle(vec(p.x, p.y), p.r * S), ...wallFix, userData: { kind: 'post' } }));

    // Pop-bumpers
    table.bumpers.forEach(b => walls.createFixture({
      shape: planck.Circle(vec(b.x, b.y), b.r * S), ...play, restitution: 0.3, userData: { kind: 'bumper', ref: b },
    }));

    // Slingshots: hela triangeln är solid, sparkriktningen är normalen på sparkytan.
    const slingInfo = table.slings.map(s => {
      const [a, c] = s.kick;
      const third = s.pts.find(p => p !== a && p !== c && !(p[0] === a[0] && p[1] === a[1]) && !(p[0] === c[0] && p[1] === c[1]));
      let n = norm(a, c);
      if ((third[0] - a[0]) * n[0] + (third[1] - a[1]) * n[1] > 0) n = [-n[0], -n[1]];   // peka bort från triangeln
      const info = { ref: s, a, c, n };
      walls.createFixture({ shape: planck.Polygon(s.pts.map(p => vec(p[0], p[1]))), ...play, restitution: 0.3, userData: { kind: 'sling', info } });
      return info;
    });

    // Stand-up-mål
    table.standups.forEach(s => walls.createFixture({
      shape: planck.Box(s.w / 2 * S, s.h / 2 * S, vec(s.x, s.y)), ...play, restitution: 0.3, userData: { kind: 'standup', ref: s },
    }));

    // Dropmål (egna kroppar så att de kan stängas av)
    const dropBodies = table.drops.map((d, i) => {
      const body = world.createBody({ position: vec(d.x, d.y) });
      body.createFixture({ shape: planck.Box(d.w / 2 * S, d.h / 2 * S), ...play, restitution: 0.3, userData: { kind: 'drop', idx: i } });
      return body;
    });

    // Enkelriktad grind: bollen får passera uppåt men inte nedåt.
    table.gates.forEach(g => {
      const body = world.createBody();
      addSeg(body, g.p1, g.p2, 6, { ...play, userData: { kind: 'gate' } });
    });

    // Rampkanaler
    table.ramps.forEach(r => {
      const body = world.createBody();
      const rail = { filterCategoryBits: CAT.RAMP, filterMaskBits: CAT.BALLR, friction: 0.05, restitution: 0.25 };
      const inner = (r.width - 8) / 2;                                // räckets innerkant = ritad innerkant
      [offsetPath(r.path, inner), offsetPath(r.path, -inner)].forEach(line => addChain(body, line, rail));
    });

    // Sensorer
    table.lanes.forEach((l, i) => sensorBox(l.x, 290, 70, 50, 0, { kind: 'lane', idx: i }));
    table.spinners.forEach((s, i) => sensorBox(s.x, s.y, s.w, 30, 0, { kind: 'spinner', idx: i }));
    table.saucers.forEach(s => ground.createFixture({ shape: planck.Circle(vec(s.x, s.y), 16 * S), ...sensorDef, userData: { kind: 'airlock', ref: s } }));
    table.kickers.forEach(k => sensorBox(k.x, k.y, k.w, k.h, 0, { kind: 'kickback' }));
    sensorBox(70, 2075, 60, 40, 0, { kind: 'outlane', side: 'L' });
    sensorBox(table.axis * 2 - 70, 2075, 60, 40, 0, { kind: 'outlane', side: 'R' });
    sensorBox(150, 2080, 60, 40, 0, { kind: 'inlane', side: 'L' });
    sensorBox(table.axis * 2 - 150, 2080, 60, 40, 0, { kind: 'inlane', side: 'R' });
    sensorBox(table.size.w / 2, table.drainY + 30, table.size.w, 60, 0, { kind: 'drain' });

    // ---------- Flippers ----------
    const flippers = table.flippers.map(f => {
      const s = f.side === 'L' ? 1 : -1;
      const h0 = f.group === 'mid' ? 13 : 15, h1 = f.group === 'mid' ? 8 : 9;
      const body = world.createBody({ type: 'dynamic', position: vec(f.pivot[0], f.pivot[1]), angle: s * f.rest, allowSleep: false });
      const fix = { ...play, density: 4, friction: 0.2, restitution: 0.1, userData: { kind: 'flipper' } };
      body.createFixture({ shape: planck.Polygon([vec(0, -h0), vec(s * f.len, -h1), vec(s * f.len, h1), vec(0, h0)]), ...fix });
      body.createFixture({ shape: planck.Circle(vec(0, 0), h0 * S), ...fix });
      body.createFixture({ shape: planck.Circle(vec(s * f.len, 0), h1 * S), ...fix });
      const lower = s === 1 ? f.active : -f.rest, upper = s === 1 ? f.rest : -f.active;
      const joint = world.createJoint(planck.RevoluteJoint({
        enableLimit: true, lowerAngle: lower, upperAngle: upper,
        enableMotor: true, maxMotorTorque: tune.flipperTorque, motorSpeed: 0,
      }, ground, body, body.getPosition()));
      return { ref: f, s, body, joint, pressed: false };
    });

    // ---------- Bollar ----------
    function spawnBall(x, y, state) {
      const body = world.createBody({ type: 'dynamic', position: vec(x, y), bullet: true, linearDamping: 0.05, allowSleep: false });
      const fixture = body.createFixture({
        shape: planck.Circle(R * S), density: 1, friction: 0.1, restitution: 0,
        filterCategoryBits: CAT.BALL, filterMaskBits: MASK_BALL,
      });
      const ball = { id: nextBallId++, body, fixture, state, mode: 'normal', ramp: null, still: 0 };
      fixture.setUserData({ kind: 'ball', ball });
      ballList.push(ball);
      return ball;
    }

    function removeBall(ball) {
      const i = ballList.indexOf(ball);
      if (i >= 0) ballList.splice(i, 1);
      world.destroyBody(ball.body);
    }

    function setMode(ball, mode, ramp) {
      ball.mode = mode; ball.ramp = ramp || null;
      if (mode === 'ramp') {
        ball.fixture.setFilterData({ groupIndex: 0, categoryBits: CAT.BALLR, maskBits: MASK_BALLR });
        ball.body.setGravityScale(tune.rampGravity);
        ball.body.setLinearDamping(tune.rampDamping);
      } else {
        ball.fixture.setFilterData({ groupIndex: 0, categoryBits: CAT.BALL, maskBits: MASK_BALL });
        ball.body.setGravityScale(1);
        ball.body.setLinearDamping(0.05);
      }
    }

    const speedOf = ball => { const v = ball.body.getLinearVelocity(); return Math.hypot(v.x, v.y); };
    const posPx = ball => { const p = ball.body.getPosition(); return { x: p.x / S, y: p.y / S }; };
    const inLane = ball => { const p = posPx(ball); return p.x > 925 && p.y > 2000; };

    function serveBall() {
      const existing = ballList.find(b => b.state === 'lane');
      if (existing) return existing;                  // rännan är upptagen
      const b = spawnBall(table.launch.x, 2466 - R, 'lane');
      game.state = 'serve';
      emit('serve', {});
      return b;
    }


    // ---------- Ramper: in-/utgång kontrolleras per steg (bollens mittpunkt måste vara i kanalens mynning) ----------
    const rampGeo = table.ramps.map(r => {
      const p = r.path, last = p.length - 1;
      const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
      return { ref: r, p0: p[0], d0: unit(p[0], p[1]), p1: p[last], d1: unit(p[last - 1], p[last]), half: r.width / 2 - 6 };
    });
    const zone = (pt, d, pos, lo, hi, half) => {
      const dx = pos.x - pt[0], dy = pos.y - pt[1];
      const along = dx * d[0] + dy * d[1], lat = -dx * d[1] + dy * d[0];
      return along >= lo && along <= hi && Math.abs(lat) <= half;
    };
    function distToPath(path, pos) {
      let best = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, ay] = path[i], [bx, by] = path[i + 1], dx = bx - ax, dy = by - ay;
        const t = Math.max(0, Math.min(1, ((pos.x - ax) * dx + (pos.y - ay) * dy) / (dx * dx + dy * dy)));
        best = Math.min(best, Math.hypot(pos.x - ax - dx * t, pos.y - ay - dy * t));
      }
      return best;
    }
    function rampCheck(ball) {
      const pos = posPx(ball), v = ball.body.getLinearVelocity();
      if (ball.mode === 'normal') {
        if (ball.state !== 'play') return;
        for (const g of rampGeo) {
          if (zone(g.p0, g.d0, pos, -10, 30, g.half) && v.x * g.d0[0] + v.y * g.d0[1] > 1.5) {
            setMode(ball, 'ramp', g.ref); emit('rampEnter', { ramp: g.ref }); return;
          }
        }
        return;
      }
      const g = rampGeo.find(q => q.ref === ball.ramp);
      if (zone(g.p1, g.d1, pos, -34, 14, g.half + 6)) {
        setMode(ball, 'normal');
        if (game.multiball) { addScore(10000, 'jackpot'); say('JACKPOT 10000'); emit('jackpot', {}); }
        else addScore(2000, 'ramp');
        game.bonus += 1000;
        emit('rampExit', { ramp: g.ref });
      } else if (zone(g.p0, g.d0, pos, -40, 30, g.half + 6) && v.x * g.d0[0] + v.y * g.d0[1] < -0.3) {
        setMode(ball, 'normal');                                 // rullade tillbaka ut
      } else if (distToPath(g.ref.path, pos) > g.ref.width) {
        setMode(ball, 'normal');                                 // säkerhetsventil
      }
    }

    // ---------- Kontakter ----------
    function contactBall(ud, other) {
      const ball = ud.ball;
      const o = other;
      switch (o.kind) {
        case 'bumper': {
          const p = ball.body.getPosition();
          const bp = vec(o.ref.x, o.ref.y);
          let nx = p.x - bp.x, ny = p.y - bp.y; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
          const sp = Math.max(tune.bumperKick, speedOf(ball) * 0.9);
          ball.body.setLinearVelocity(planck.Vec2(nx * sp, ny * sp));
          addScore(100, 'bumper'); game.bonus += 100;
          emit('bumper', { ref: o.ref });
          break;
        }
        case 'sling': {
          const info = o.info, p = posPx(ball), v = ball.body.getLinearVelocity();
          const side = (p.x - info.a[0]) * info.n[0] + (p.y - info.a[1]) * info.n[1];
          const vn = v.x * info.n[0] + v.y * info.n[1];
          if (side > 0 && vn < -0.5) {
            const rx = v.x - 2 * vn * info.n[0], ry = v.y - 2 * vn * info.n[1];
            ball.body.setLinearVelocity(planck.Vec2(rx * 0.5 + info.n[0] * tune.slingKick, ry * 0.5 + info.n[1] * tune.slingKick));
            addScore(10, 'sling');
            emit('sling', { ref: info.ref });
          }
          break;
        }
        case 'standup': {
          if (speedOf(ball) < 0.5) break;
          const arr = o.ref.side === 'L' ? game.standL : game.standR;
          const i = parseInt(o.ref.id.slice(-1), 10) - 1;
          addScore(250, 'standup'); game.bonus += 250;
          emit('standup', { ref: o.ref });
          if (!arr[i]) {
            arr[i] = true;
            if (arr.every(Boolean)) {
              arr.fill(false);
              addScore(1000, 'standupBank');
              if (o.ref.side === 'L') { game.kickbackArmed = true; say('KICKBACK READY'); }
              else { game.saver = Math.max(game.saver, 0) + 10; say('BALL SAVER +10'); }
            }
          }
          break;
        }
        case 'drop': {
          if (game.drops[o.idx]) break;
          game.drops[o.idx] = true;
          addScore(500, 'drop'); game.bonus += 500;
          emit('drop', { idx: o.idx });
          pending.push(() => dropBodies[o.idx].setActive(false));
          if (game.drops.every(Boolean)) {
            addScore(5000, 'dropBank');
            game.airlockLit = true; game.dropsResetAt = game.time + 2;
            say('AIRLOCK OPEN');
          }
          break;
        }
        case 'lane': {
          if (ball.body.getLinearVelocity().y <= 0 || game.lanes[o.idx]) break;
          game.lanes[o.idx] = true;
          addScore(500, 'lane'); game.bonus += 500;
          emit('lane', { idx: o.idx });
          if (game.lanes.every(Boolean)) {
            game.lanes.fill(false);
            game.bonusMult = Math.min(6, game.bonusMult + 1);
            addScore(10000, 'aegis');
            say(`AEGIS COMPLETE  BONUS ${game.bonusMult}X`);
            emit('aegis', {});
          }
          break;
        }
        case 'spinner': {
          addScore(50, 'spinner');
          emit('spinner', { idx: o.idx, speed: speedOf(ball) });
          break;
        }
        case 'airlock': {
          if (ball.mode !== 'normal' || ball.state !== 'play') break;
          pending.push(() => lockBall(ball));
          break;
        }
        case 'kickback': {
          if (game.kickbackArmed) {
            game.kickbackArmed = false;
            pending.push(() => ball.body.setLinearVelocity(planck.Vec2((Math.random() - 0.5) * 2, -tune.kickback)));
            say('KICKBACK!'); emit('kickback', {});
          }
          break;
        }
        case 'outlane': addScore(500, 'outlane'); emit('outlane', { side: o.side }); break;
        case 'inlane': addScore(100, 'inlane'); emit('inlane', { side: o.side }); break;
        case 'drain': lostBalls.add(ball); break;
        default: break;
      }
    }

    world.on('begin-contact', c => {
      const a = c.getFixtureA().getUserData(), b = c.getFixtureB().getUserData();
      if (a && a.kind === 'ball' && b) contactBall(a, b);
      else if (b && b.kind === 'ball' && a) contactBall(b, a);
    });

    world.on('pre-solve', c => {
      const a = c.getFixtureA().getUserData(), b = c.getFixtureB().getUserData();
      const gate = (a && a.kind === 'gate') ? a : (b && b.kind === 'gate') ? b : null;
      if (!gate) return;
      const ball = (a && a.kind === 'ball') ? a.ball : (b && b.kind === 'ball') ? b.ball : null;
      if (ball && ball.body.getLinearVelocity().y < 0) c.setEnabled(false);
    });

    // ---------- Airlock och multiball ----------
    const held = [];
    function lockBall(ball) {
      if (ball.state !== 'play') return;
      const s = table.saucers[0];
      ball.body.setLinearVelocity(planck.Vec2(0, 0));
      ball.body.setPosition(vec(s.x, s.y));
      ball.body.setActive(false);
      ball.state = 'held';
      held.push(ball);
      if (!game.airlockLit) {
        addScore(1000, 'airlock');
        ejectQueue.push({ at: game.time + 0.7, ball });
        held.splice(held.indexOf(ball), 1);
        return;
      }
      game.locked++;
      emit('lock', { n: game.locked });
      if (game.locked < 3) {
        say(`BALL ${game.locked} LOCKED`);
        game.airlockLit = false;
        if (!ballList.some(b => b.state === 'lane')) serveBall();
      } else {
        say('MULTIBALL!', 3);
        game.multiball = true; game.airlockLit = false; game.locked = 0;
        game.saver = Math.max(game.saver, 15);
        held.splice(0).forEach((b, i) => ejectQueue.push({ at: game.time + 0.6 + i * 0.55, ball: b }));
        emit('multiball', {});
      }
    }

    function eject(ball) {
      if (!ballList.includes(ball)) return;
      const s = table.saucers[0];
      ball.body.setPosition(vec(s.x, s.y + 52));
      ball.body.setActive(true);
      ball.state = 'play';
      ball.body.setLinearVelocity(planck.Vec2((Math.random() - 0.5) * 6, 9 + Math.random() * 2));
      emit('eject', {});
    }

    // ---------- Förlorad boll ----------
    function ballLost(ball) {
      emit('drain', {});
      const wasMulti = game.multiball && ballList.length > 1;
      removeBall(ball);
      if (game.tilt) { if (!ballList.some(b => b.state !== 'held')) endBall(); return; }
      if (wasMulti) {
        if (game.saver > 0) { serveBall(); say('BALL SAVED'); emit('saved', {}); }
        if (ballList.filter(b => b.state === 'play').length <= 1) { game.multiball = false; }
        return;
      }
      if (ballList.some(b => b.state === 'play' || b.state === 'lane')) return;
      if (game.saver > 0) { game.saver = 0; serveBall(); say('BALL SAVED'); emit('saved', {}); return; }
      endBall();
    }

    function endBall() {
      const bonus = game.bonus * game.bonusMult;
      if (!game.tilt && bonus) { addScore(bonus, 'bonus'); say(`BONUS ${bonus}`, 3); emit('bonus', { n: bonus }); }
      // Håll alla bollar borta; rensa fastlåsta
      ballList.slice().forEach(removeBall);
      held.length = 0; ejectQueue.length = 0;
      game.locked = 0; game.multiball = false; game.airlockLit = false;
      game.bonus = 0; game.bonusMult = 1; game.saver = 0; game.tilt = false; game.nudges.length = 0;
      game.ball++;
      if (game.ball > game.balls) {
        game.state = 'over';
        say('GAME OVER', 999);
        emit('gameOver', { score: game.score });
      } else {
        serveBall();
      }
    }

    // ---------- Spelflöde ----------
    function newGame() {
      ballList.slice().forEach(removeBall);
      held.length = 0; ejectQueue.length = 0; lostBalls.clear();
      Object.assign(game, {
        score: 0, ball: 1, bonus: 0, bonusMult: 1,
        lanes: [false, false, false, false, false],
        drops: [false, false, false, false], dropsResetAt: 0,
        standL: [false, false, false], standR: [false, false, false],
        kickbackArmed: false, saver: 0, airlockLit: false, locked: 0, multiball: false, tilt: false, nudges: [],
      });
      dropBodies.forEach(b => b.setActive(true));
      serveBall();
      say('STATION AEGIS 5', 2);
    }

    function launch(power) {
      if (game.state !== 'serve' && game.state !== 'play') return false;
      const ball = ballList.find(b => b.state === 'lane' && inLane(b) && speedOf(b) < 0.5);
      if (!ball || game.tilt) return false;
      const p = Math.max(0, Math.min(1, power));
      ball.body.setLinearVelocity(planck.Vec2(0, -(tune.launchMin + (tune.launchMax - tune.launchMin) * p)));
      ball.state = 'play';
      if (game.state === 'serve') game.saver = tune.ballSaver;
      game.state = 'play';
      emit('launch', { power: p });
      return true;
    }

    function nudge(dir) {
      if (game.state !== 'play' || game.tilt) return;
      const now = game.time;
      game.nudges = game.nudges.filter(t => now - t < 4);
      game.nudges.push(now);
      ballList.forEach(b => {
        if (b.state !== 'play') return;
        b.body.applyLinearImpulse(planck.Vec2(dir[0] * 0.5, dir[1] * 0.5), b.body.getWorldCenter(), true);
      });
      emit('nudge', {});
      if (game.nudges.length > 4) { game.tilt = true; say('TILT!', 3); emit('tilt', {}); }
      else if (game.nudges.length === 4) say('DANGER', 1.5);
    }

    // ---------- Steg ----------
    function step() {
      const h = tune.step;
      flippers.forEach(f => {
        const want = f.ref.side === 'L' ? input.left : input.right;
        const down = want && !game.tilt && game.state !== 'over';
        if (down && !f.pressed) emit('flipper', { id: f.ref.id });
        f.pressed = down;
        const dir = f.s === 1 ? -1 : 1;                  // mot "aktiv"
        f.joint.setMotorSpeed(dir * tune.flipperSpeed * (down ? 1 : -1));
      });

      world.step(h, 8, 3);
      game.time += h;
      pending.splice(0).forEach(fn => fn());
      ballList.forEach(rampCheck);

      if (game.saver > 0 && game.state === 'play') game.saver = Math.max(0, game.saver - h);
      if (game.dropsResetAt && game.time >= game.dropsResetAt) {
        game.dropsResetAt = 0;
        game.drops.fill(false);
        dropBodies.forEach(b => b.setActive(true));
        emit('dropsReset', {});
      }
      for (let i = ejectQueue.length - 1; i >= 0; i--) {
        if (game.time >= ejectQueue[i].at) { const q = ejectQueue.splice(i, 1)[0]; eject(q.ball); }
      }

      // Fastnade bollar: ge en liten knuff
      ballList.forEach(b => {
        if (b.state !== 'play' || b.mode !== 'normal') { b.still = 0; return; }
        b.still = speedOf(b) < 0.15 ? b.still + h : 0;
        if (b.still > 3) { b.body.applyLinearImpulse(planck.Vec2((Math.random() - 0.5) * 0.3, -0.25), b.body.getWorldCenter(), true); b.still = 0; }
      });
      // Boll som landat i startrännan igen kan skjutas ut på nytt
      ballList.forEach(b => { if (b.state === 'play' && inLane(b) && speedOf(b) < 0.3 && posPx(b).y > 2400) b.state = 'lane'; });

      if (lostBalls.size) { const arr = [...lostBalls]; lostBalls.clear(); arr.forEach(b => { if (ballList.includes(b)) ballLost(b); }); }
    }

    let acc = 0;
    function update(dt) {
      acc += Math.min(dt, 0.05);
      while (acc >= tune.step) { step(); acc -= tune.step; }
    }

    return {
      table, world, game, input, balls: ballList, flippers, dropBodies, tune,
      update, step, newGame, launch, nudge, serveBall, spawnBall, setMode,
      posPx, speedOf, events,
      takeEvents() { return events.splice(0); },
    };
  }

  return { create, TUNE, rampRails, offsetPath, domePoints, CAT };
});
