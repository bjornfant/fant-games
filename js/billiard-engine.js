// Biljardmotor: fysik, 8-ball-regler och bot. Ingen DOM – kan köras i både webbläsare och Node.
const Billiard = (() => {
  'use strict';

  // Spelplan (pixlar). Bollarnas mittpunkter rör sig inom [L+R, RIGHT-R] x [T+R, BOTTOM-R].
  const R = 10.5;
  const L = 50, T = 50, RW = 700, RH = 350;
  const RIGHT = L + RW, BOTTOM = T + RH;
  const HEAD_X = L + 175, FOOT_X = L + 525, MID_Y = T + RH / 2;

  const DT = 1 / 240;
  const DECEL = 220;          // px/s² konstant rullfriktion
  const CUSHION_E = 0.78, BALL_E = 0.96;
  const MINV = 120, MAXV = 1500;

  const POCKETS = [
    { x: L, y: T, r: 24, ax: Math.SQRT1_2, ay: Math.SQRT1_2 },
    { x: RIGHT, y: T, r: 24, ax: -Math.SQRT1_2, ay: Math.SQRT1_2 },
    { x: L, y: BOTTOM, r: 24, ax: Math.SQRT1_2, ay: -Math.SQRT1_2 },
    { x: RIGHT, y: BOTTOM, r: 24, ax: -Math.SQRT1_2, ay: -Math.SQRT1_2 },
    { x: L + RW / 2, y: T, r: 20, ax: 0, ay: 1 },
    { x: L + RW / 2, y: BOTTOM, r: 20, ax: 0, ay: -1 },
  ];

  const LEVELS = {
    easy: { label: 'Lätt', sigma: 2.2, powerJitter: 0.25, pickTop: 4, randomShot: 0.25 },
    medium: { label: 'Medel', sigma: 0.55, powerJitter: 0.05, pickTop: 2, randomShot: 0 },
    hard: { label: 'Svår', sigma: 0.12, powerJitter: 0, sim: true },
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const groupOf = n => (n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solid' : 'stripe');
  const speedFromPower = p => MINV + (MAXV - MINV) * clamp(p, 0, 1);

  function randn() {
    return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Uppställning ----------
  function rack() {
    const balls = [];
    for (let n = 0; n < 16; n++) balls.push({ n, x: 0, y: 0, vx: 0, vy: 0, alive: true });
    balls[0].x = HEAD_X; balls[0].y = MID_Y;

    const dx = 2 * R * Math.cos(Math.PI / 6) + 0.4, dy = 2 * R + 0.4;
    const slots = [];
    for (let r = 0; r < 5; r++) {
      for (let i = 0; i <= r; i++) slots.push({ x: FOOT_X + r * dx, y: MID_Y + (i - r / 2) * dy });
    }
    const solids = shuffle([1, 2, 3, 4, 5, 6, 7]);
    const stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);
    const corners = shuffle([solids.pop(), stripes.pop()]);
    const rest = shuffle([...solids, ...stripes]);
    const order = new Array(15);
    order[4] = 8;
    order[10] = corners[0];
    order[14] = corners[1];
    for (let i = 0; i < 15; i++) if (order[i] === undefined) order[i] = rest.pop();
    order.forEach((n, i) => { balls[n].x = slots[i].x; balls[n].y = slots[i].y; });
    return balls;
  }

  // ---------- Fysik ----------
  function allStopped(bs) {
    for (const b of bs) if (b.alive && (b.vx || b.vy)) return false;
    return true;
  }

  function stepPhysics(bs, ev) {
    const dt = DT;
    for (const b of bs) {
      if (!b.alive || (!b.vx && !b.vy)) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const sp = Math.hypot(b.vx, b.vy), ns = sp - DECEL * dt;
      if (ns <= 0) { b.vx = b.vy = 0; } else { const k = ns / sp; b.vx *= k; b.vy *= k; }
    }

    // Hål
    for (const b of bs) {
      if (!b.alive || (!b.vx && !b.vy)) continue;
      for (const p of POCKETS) {
        const dx = b.x - p.x, dy = b.y - p.y;
        if (dx * dx + dy * dy < p.r * p.r) {
          b.alive = false; b.vx = b.vy = 0;
          ev.pocketed.push(b.n);
          if (b.n === 0) ev.cueIn = true;
          if (ev.onPocket) ev.onPocket(b);
          break;
        }
      }
    }

    // Kanter
    const minX = L + R, maxX = RIGHT - R, minY = T + R, maxY = BOTTOM - R;
    for (const b of bs) {
      if (!b.alive || (!b.vx && !b.vy)) continue;
      if (b.x < minX) { b.x = minX; if (b.vx < 0) { if (ev.onCushion) ev.onCushion(-b.vx); b.vx = -b.vx * CUSHION_E; b.vy *= 0.98; } }
      else if (b.x > maxX) { b.x = maxX; if (b.vx > 0) { if (ev.onCushion) ev.onCushion(b.vx); b.vx = -b.vx * CUSHION_E; b.vy *= 0.98; } }
      if (b.y < minY) { b.y = minY; if (b.vy < 0) { if (ev.onCushion) ev.onCushion(-b.vy); b.vy = -b.vy * CUSHION_E; b.vx *= 0.98; } }
      else if (b.y > maxY) { b.y = maxY; if (b.vy > 0) { if (ev.onCushion) ev.onCushion(b.vy); b.vy = -b.vy * CUSHION_E; b.vx *= 0.98; } }
    }

    // Boll mot boll
    const D2 = 4 * R * R;
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const b = bs[j];
        if (!b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= D2) continue;
        const d = Math.sqrt(d2) || 0.0001, nx = dx / d, ny = dy / d;
        const push = (2 * R - d) / 2;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          const j2 = (1 + BALL_E) / 2 * rel;
          a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny;
          if (ev.first === null && (a.n === 0 || b.n === 0)) ev.first = a.n === 0 ? b.n : a.n;
          if (ev.onHit) ev.onHit(rel, a.n === 0 || b.n === 0);
        }
      }
    }
  }

  function simulate(balls, cx, cy, angle, v, maxTime = 25) {
    const bs = balls.map(b => ({ ...b }));
    const cue = bs[0];
    cue.x = cx; cue.y = cy; cue.alive = true;
    cue.vx = Math.cos(angle) * v; cue.vy = Math.sin(angle) * v;
    const ev = { first: null, pocketed: [], cueIn: false };
    for (let i = 0, n = maxTime / DT; i < n; i++) {
      stepPhysics(bs, ev);
      if (allStopped(bs)) break;
    }
    return { ev, balls: bs };
  }

  // ---------- Regler (8-ball, förenklad: inga utpekade hål) ----------
  function countLeft(bs, group) {
    let c = 0;
    for (const b of bs) if (b.alive && groupOf(b.n) === group) c++;
    return c;
  }

  function judge(shooterGroup, isBreak, ownLeftBefore, ev) {
    const r = { foul: false, reason: '', cont: false, win: false, lose: false, respot8: false, assign: null, ownCount: 0 };
    const objs = ev.pocketed.filter(n => n !== 0);

    if (ev.cueIn) { r.foul = true; r.reason = 'vita bollen hamnade i hål'; }
    if (ev.first === null) {
      r.foul = true; r.reason = r.reason || 'ingen boll träffades';
    } else {
      const g = groupOf(ev.first);
      if (shooterGroup) {
        const target = ownLeftBefore > 0 ? shooterGroup : 'eight';
        if (g !== target) { r.foul = true; r.reason = r.reason || 'fel boll träffades först'; }
      } else if (g === 'eight') {
        r.foul = true; r.reason = r.reason || 'åttan träffades först';
      }
    }

    if (objs.includes(8)) {
      if (isBreak) r.respot8 = true;
      else if (shooterGroup && ownLeftBefore === 0 && !r.foul) r.win = true;
      else r.lose = true;
    }

    const own = shooterGroup
      ? objs.filter(n => groupOf(n) === shooterGroup)
      : objs.filter(n => n !== 8);
    r.ownCount = own.length;
    r.cont = !r.foul && own.length > 0 && !r.win && !r.lose;
    if (!shooterGroup && !isBreak && !r.foul && own.length > 0) r.assign = groupOf(own[0]);
    return r;
  }

  // ---------- Spelflöde ----------
  function createGame() {
    return { balls: rack(), groups: [null, null], turn: 0, isBreak: true, ballInHand: false, over: false, winner: null, event: null, shot: null };
  }

  function beginShot(g, angle, v, hooks = {}) {
    const cue = g.balls[0];
    cue.vx = Math.cos(angle) * v; cue.vy = Math.sin(angle) * v;
    const group = g.groups[g.turn];
    g.shot = {
      ev: { first: null, pocketed: [], cueIn: false, ...hooks },
      group,
      ownLeft: group ? countLeft(g.balls, group) : 0,
      isBreak: g.isBreak,
    };
  }

  function stepShot(g) {
    stepPhysics(g.balls, g.shot.ev);
    return allStopped(g.balls);
  }

  function respotEight(bs) {
    const eight = bs[8];
    let x = FOOT_X;
    const free = () => bs.every(b => b === eight || !b.alive || Math.hypot(b.x - x, b.y - MID_Y) > 2 * R + 0.5);
    while (!free() && x < RIGHT - R) x += 2 * R + 1;
    eight.x = x; eight.y = MID_Y; eight.vx = eight.vy = 0; eight.alive = true;
  }

  function finishShot(g) {
    const s = g.shot, shooter = g.turn, other = 1 - shooter;
    const r = judge(s.group, s.isBreak, s.ownLeft, s.ev);
    g.shot = null;
    g.isBreak = false;
    if (r.respot8) respotEight(g.balls);

    if (r.win || r.lose) {
      g.over = true;
      g.winner = r.win ? shooter : other;
      g.event = { type: r.win ? 'win' : 'lose', who: shooter };
      return r;
    }
    if (r.assign) {
      g.groups[shooter] = r.assign;
      g.groups[other] = r.assign === 'solid' ? 'stripe' : 'solid';
    }
    if (r.foul) {
      g.turn = other; g.ballInHand = true;
      g.balls[0].alive = false; g.balls[0].vx = g.balls[0].vy = 0;
      g.event = { type: 'foul', reason: r.reason, who: shooter, assign: r.assign };
    } else if (r.cont) {
      g.event = { type: 'continue', who: shooter, assign: r.assign };
    } else {
      g.turn = other;
      g.event = { type: 'switch', who: shooter, assign: r.assign };
    }
    return r;
  }

  function validPlacement(g, x, y) {
    if (x < L + R || x > RIGHT - R || y < T + R || y > BOTTOM - R) return false;
    if (g.isBreak && x > HEAD_X) return false;
    for (const b of g.balls) {
      if (b.n === 0 || !b.alive) continue;
      if (Math.hypot(b.x - x, b.y - y) < 2 * R + 1) return false;
    }
    return true;
  }

  function placeCue(g, x, y) {
    const c = g.balls[0];
    c.x = x; c.y = y; c.vx = c.vy = 0; c.alive = true;
    g.ballInHand = false;
  }

  // ---------- Sikte ----------
  function castRay(bs, x, y, ang) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const hit = { t: Infinity, ball: null };
    if (dx > 1e-9) hit.t = Math.min(hit.t, (RIGHT - R - x) / dx);
    else if (dx < -1e-9) hit.t = Math.min(hit.t, (L + R - x) / dx);
    if (dy > 1e-9) hit.t = Math.min(hit.t, (BOTTOM - R - y) / dy);
    else if (dy < -1e-9) hit.t = Math.min(hit.t, (T + R - y) / dy);
    for (const b of bs) {
      if (!b.alive || b.n === 0) continue;
      const fx = b.x - x, fy = b.y - y, proj = fx * dx + fy * dy;
      if (proj <= 0) continue;
      const perp2 = fx * fx + fy * fy - proj * proj;
      if (perp2 >= 4 * R * R) continue;
      const t = proj - Math.sqrt(4 * R * R - perp2);
      if (t < hit.t) { hit.t = t; hit.ball = b; }
    }
    hit.x = x + dx * hit.t; hit.y = y + dy * hit.t;
    return hit;
  }

  // ---------- Bot ----------
  function legalTargets(bs, g) {
    const alive = bs.filter(b => b.alive && b.n > 0);
    if (g) {
      const own = alive.filter(b => groupOf(b.n) === g);
      return own.length ? own.map(b => b.n) : [8];
    }
    const open = alive.filter(b => b.n !== 8);
    return open.length ? open.map(b => b.n) : [8];
  }

  function clear(bs, x1, y1, x2, y2, skip) {
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    for (const b of bs) {
      if (!b.alive || skip.includes(b.n)) continue;
      const t = len2 ? clamp(((b.x - x1) * dx + (b.y - y1) * dy) / len2, 0, 1) : 0;
      const px = x1 + dx * t - b.x, py = y1 + dy * t - b.y;
      if (px * px + py * py < 4 * R * R * 0.96) return false;
    }
    return true;
  }

  // Alla genomförbara "ghost ball"-skott mot hålen, sorterade från lättast till svårast.
  function planShots(bs, cp, targets) {
    const out = [];
    for (const n of targets) {
      const t = bs[n];
      if (!t.alive) continue;
      for (const p of POCKETS) {
        let ux = p.x - t.x, uy = p.y - t.y;
        const dTP = Math.hypot(ux, uy);
        ux /= dTP; uy /= dTP;
        const approach = -(ux * p.ax + uy * p.ay);
        if (approach < (p.ax && p.ay ? 0.3 : 0.45)) continue;

        const gx = t.x - ux * 2 * R, gy = t.y - uy * 2 * R;
        if (gx < L + R || gx > RIGHT - R || gy < T + R || gy > BOTTOM - R) continue;
        let cx = gx - cp.x, cy = gy - cp.y;
        const dCG = Math.hypot(cx, cy);
        if (dCG < 2) continue;
        cx /= dCG; cy /= dCG;
        const cos = cx * ux + cy * uy;
        if (cos < 0.22) continue;
        if (!clear(bs, cp.x, cp.y, gx, gy, [0, n]) || !clear(bs, t.x, t.y, p.x, p.y, [0, n])) continue;

        const v1 = (Math.sqrt(2 * DECEL * dTP) + 70) / (0.97 * cos);
        const v0 = Math.sqrt(v1 * v1 + 2 * DECEL * dCG) * 1.05;
        out.push({ n, angle: Math.atan2(cy, cx), v: clamp(v0, 220, MAXV), cost: dCG * 0.5 + dTP * 0.7 + (1 - cos) * 260 });
      }
    }
    return out.sort((a, b) => a.cost - b.cost);
  }

  function safeShot(bs, cp, targets, random) {
    const options = targets.map(n => {
      const t = bs[n];
      const blocked = !clear(bs, cp.x, cp.y, t.x, t.y, [0, n]);
      return { angle: Math.atan2(t.y - cp.y, t.x - cp.x), score: Math.hypot(t.x - cp.x, t.y - cp.y) + (blocked ? 1000 : 0) };
    });
    const pick = random ? options[Math.floor(Math.random() * options.length)] : options.sort((a, b) => a.score - b.score)[0];
    return { angle: pick.angle, v: random ? 300 + Math.random() * 600 : 500 };
  }

  function validPositions(bs) {
    const out = [];
    for (let x = L + R + 5; x < RIGHT - R; x += 35) {
      for (let y = T + R + 5; y < BOTTOM - R; y += 35) {
        if (bs.every(b => b.n === 0 || !b.alive || Math.hypot(b.x - x, b.y - y) > 2 * R + 2)) out.push({ x, y });
      }
    }
    return out;
  }

  function botPlace(g, group, lv) {
    const spots = validPositions(g.balls).filter(p => !g.isBreak || p.x <= HEAD_X);
    if (!spots.length) return { x: HEAD_X, y: MID_Y };
    if (lv === LEVELS.easy) return spots[Math.floor(Math.random() * spots.length)];
    const targets = legalTargets(g.balls, group);
    let best = null, bestCost = Infinity;
    for (const p of spots) {
      const shots = planShots(g.balls, p, targets);
      const c = shots.length ? shots[0].cost : Infinity;
      if (c < bestCost) { bestCost = c; best = p; }
    }
    return best || spots[Math.floor(Math.random() * spots.length)];
  }

  function scoreResult(r) {
    if (r.win) return 1000;
    if (r.lose) return -1000;
    let s = r.foul ? -60 : 0;
    if (r.cont) s += 100 + 15 * r.ownCount;
    return s;
  }

  // Svår: provkör kandidatskott i samma fysikmotor och välj det som ger bäst resultat.
  function hardChoose(g, cp, group, shots, targets) {
    const ownLeft = group ? countLeft(g.balls, group) : 0;
    const cands = [];
    for (const s of shots.slice(0, 12)) {
      for (const k of [1, 0.85, 1.25]) cands.push({ angle: s.angle, v: clamp(s.v * k, 200, MAXV) });
    }
    for (const n of targets) {
      const t = g.balls[n];
      const a = Math.atan2(t.y - cp.y, t.x - cp.x);
      for (const v of [350, 650]) cands.push({ angle: a, v });
    }
    let best = null, bestScore = -Infinity;
    for (const c of cands) {
      const sim = simulate(g.balls, cp.x, cp.y, c.angle, c.v);
      const r = judge(group, g.isBreak, ownLeft, sim.ev);
      let sc = scoreResult(r);
      if (r.cont) {
        const g2 = group || r.assign;
        const next = planShots(sim.balls, sim.balls[0], legalTargets(sim.balls, g2));
        if (next.length) sc += 25;
      }
      if (sc > bestScore) { bestScore = sc; best = c; }
    }
    return best || { angle: Math.atan2(MID_Y - cp.y, FOOT_X - cp.x), v: 500 };
  }

  // Returnerar { place: {x,y}|null, angle, v } för spelaren vars tur det är.
  function botThink(g, levelKey) {
    const lv = LEVELS[levelKey];
    const group = g.groups[g.turn];

    if (g.isBreak) {
      const place = g.balls[0].alive ? null : { x: HEAD_X, y: MID_Y };
      const cp = place || g.balls[0];
      return { place, angle: Math.atan2(MID_Y - cp.y, FOOT_X - cp.x) + randn() * 0.01, v: MAXV * 0.92 };
    }

    const place = g.balls[0].alive ? null : botPlace(g, group, lv);
    const cp = place || { x: g.balls[0].x, y: g.balls[0].y };
    const targets = legalTargets(g.balls, group);
    const shots = planShots(g.balls, cp, targets);

    let angle, v;
    if (lv.sim) {
      ({ angle, v } = hardChoose(g, cp, group, shots, targets));
    } else {
      let shot = null;
      if (shots.length && Math.random() >= (lv.randomShot || 0)) {
        shot = shots[Math.floor(Math.random() * Math.min(lv.pickTop, shots.length))];
      }
      if (shot) ({ angle, v } = shot);
      else ({ angle, v } = safeShot(g.balls, cp, targets, lv === LEVELS.easy));
    }
    angle += randn() * lv.sigma * Math.PI / 180;
    v *= 1 + (Math.random() * 2 - 1) * lv.powerJitter;
    return { place, angle, v: clamp(v, 150, MAXV) };
  }

  return {
    R, L, T, RW, RH, RIGHT, BOTTOM, HEAD_X, FOOT_X, MID_Y, POCKETS, LEVELS, MAXV, MINV,
    groupOf, speedFromPower, createGame, beginShot, stepShot, finishShot, validPlacement, placeCue,
    castRay, botThink, countLeft, simulate, judge, allStopped, legalTargets,
  };
})();

if (typeof module !== 'undefined') module.exports = Billiard;
