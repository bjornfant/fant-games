(() => {
  const B = Billiard;
  const { R, L, T, RW, RH, RIGHT, BOTTOM, HEAD_X, FOOT_X, MID_Y, POCKETS } = B;
  const DT = 1 / 240;

  const cv = document.getElementById('board');
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const overlay = $('overlay'), ovTitle = $('ovTitle'), ovText = $('ovText'), ovWins = $('ovWins');
  const powerEl = $('power'), shootBtn = $('shoot'), statusEl = $('status');

  const COLORS = [null, '#ffc93c', '#3e7bff', '#ff4d4d', '#8b5cf6', '#ff9f43', '#2fbf71', '#a0332b'];
  const colorOf = n => (n === 8 ? '#1b1b2b' : COLORS[n > 8 ? n - 8 : n]);

  let g = null, level = 'easy', state = 'menu';   // menu | placing | aim | rolling | over
  let aim = 0, humanPower = 0.6, drawPower = 0.6;
  let pointer = { x: HEAD_X + 120, y: MID_Y };
  let plan = null, botWait = 0, rollTime = 0;
  let acc = 0, last = 0;
  const lastSound = {};

  const name = i => (i === 0 ? 'Du' : 'Boten');
  const groupLabel = grp => (grp === 'solid' ? 'hela' : 'halva');

  // ---------- Ljud ----------
  function sfx(kind, freq, dur, type, vol, gap = 0.04) {
    const now = performance.now() / 1000;
    if (lastSound[kind] && now - lastSound[kind] < gap) return;
    lastSound[kind] = now;
    Sound.beep(freq, dur, type, vol);
  }
  const hooks = {
    onHit: (v, cue) => sfx('hit', 260 + Math.min(v, 900) * 0.4, 0.04, 'triangle', Math.min(0.08, 0.02 + v / 12000)),
    onCushion: v => sfx('cush', 120 + Math.min(v, 800) * 0.05, 0.05, 'sine', 0.05),
    onPocket: () => { Sound.beep(520, 0.08, 'sine', 0.06); setTimeout(() => Sound.beep(330, 0.14, 'sine', 0.06), 70); },
  };

  // ---------- HUD ----------
  function setStatus(t) { statusEl.textContent = t; }

  function renderHud() {
    for (let i = 0; i < 2; i++) {
      const grp = g.groups[i];
      $('n' + i).textContent = (i === 0 ? 'Du' : `Boten (${B.LEVELS[level].label})`) + (grp ? ` – ${groupLabel(grp)}` : '');
      $('p' + i).classList.toggle('active', g.turn === i && !g.over);
      const el = $('g' + i);
      el.innerHTML = '';
      if (!grp) { el.textContent = 'Öppet bord'; continue; }
      const nums = grp === 'solid' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
      for (const n of nums) el.appendChild(mini(n, !g.balls[n].alive));
      if (B.countLeft(g.balls, grp) === 0) el.appendChild(mini(8, !g.balls[8].alive));
    }
  }

  function mini(n, out) {
    const s = document.createElement('span');
    s.className = 'mb' + (n > 8 ? ' stripe' : '') + (out ? ' out' : '');
    s.style.setProperty('--c', colorOf(n));
    return s;
  }

  // ---------- Matchflöde ----------
  function newMatch(lv) {
    level = lv;
    g = B.createGame();
    state = 'aim'; plan = null; botWait = 0;
    aim = 0; drawPower = humanPower;
    overlay.hidden = true;
    renderHud();
    setStatus('Din tur – spräng trianglen! Sikta med musen.');
  }

  function showMenu(title, text) {
    state = 'menu';
    ovTitle.textContent = title || 'Biljard';
    ovText.textContent = text || 'Åttabollsbiljard mot en bot. Potta alla dina bollar (hela eller halva) och därefter åttan. Välj svårighetsgrad:';
    const w = Store.get('billiard-wins', {});
    ovWins.textContent = `Dina vinster – Lätt: ${w.easy || 0} · Medel: ${w.medium || 0} · Svår: ${w.hard || 0}`;
    overlay.hidden = false;
  }

  function shoot(angle, v) {
    B.beginShot(g, angle, v, hooks);
    Sound.beep(110, 0.07, 'square', 0.06);
    state = 'rolling'; rollTime = 0; acc = 0;
  }

  function afterShot() {
    B.finishShot(g);
    const e = g.event;
    renderHud();
    if (g.over) {
      const humanWon = g.winner === 0;
      if (humanWon) {
        const w = Store.get('billiard-wins', {});
        w[level] = (w[level] || 0) + 1;
        Store.set('billiard-wins', w);
        Store.set('billiard-total', (Store.get('billiard-total', 0)) + 1);
        Sound.beep(660, 0.3, 'triangle', 0.07);
      } else Sound.beep(150, 0.4, 'sawtooth', 0.06);
      const how = e.type === 'win'
        ? `${name(e.who)} pottade åttan!`
        : `${name(e.who)} pottade åttan för tidigt eller med foul.`;
      state = 'over';
      showMenu(humanWon ? 'Du vann! 🎉' : 'Boten vann!', `${how} Spela igen – välj nivå:`);
      setStatus(humanWon ? 'Grattis, du vann matchen!' : 'Boten vann matchen.');
      return;
    }

    let msg = '';
    const who = g.turn;
    if (e.assign) msg += `${name(e.who)} har ${groupLabel(g.groups[e.who])} bollar. `;
    if (e.type === 'foul') {
      msg += `Foul (${e.reason}). ${who === 0 ? 'Du har' : 'Boten har'} bollen i hand.`;
    } else if (e.type === 'continue') {
      msg += `${name(e.who)} fortsätter.`;
    } else {
      msg += who === 0 ? 'Din tur.' : 'Botens tur.';
    }
    setStatus(msg);

    plan = null; botWait = 0;
    if (g.ballInHand) {
      state = 'placing';
      if (who === 0) setStatus(msg + ' Klicka för att placera vita bollen.');
    } else state = 'aim';
    if (who === 0 && state === 'aim') drawPower = humanPower;
  }

  // ---------- Bot ----------
  function updateBot(dt) {
    if (g.turn !== 1 || g.over || (state !== 'aim' && state !== 'placing')) return;
    botWait += dt;
    if (!plan) {
      if (botWait < 0.6) return;
      plan = B.botThink(g, level);
      plan.t = 0;
      plan.from = aim; plan.fromPower = drawPower;
      if (plan.place) { B.placeCue(g, plan.place.x, plan.place.y); state = 'aim'; setStatus('Boten placerar vita bollen.'); }
      const c = g.balls[0];
      plan.from = Math.atan2(MID_Y - c.y, RIGHT - c.x);
      aim = plan.from;
      plan.power = Math.max(0.05, Math.min(1, (plan.v - B.MINV) / (B.MAXV - B.MINV)));
      return;
    }
    plan.t += dt;
    const k = Math.min(1, Math.max(0, (plan.t - 0.2) / 0.8));
    const e = k * k * (3 - 2 * k);
    let d = plan.angle - plan.from;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    aim = plan.from + d * e;
    drawPower = plan.fromPower + (plan.power - plan.fromPower) * e;
    if (plan.t > 1.4) {
      aim = plan.angle;
      const v = plan.v;
      plan = null;
      shoot(aim, v);
    }
  }

  // ---------- Input ----------
  function toCanvas(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height };
  }

  function updateAim() {
    if (state !== 'aim' || g.turn !== 0) return;
    const c = g.balls[0];
    if (Math.hypot(pointer.x - c.x, pointer.y - c.y) > 8) aim = Math.atan2(pointer.y - c.y, pointer.x - c.x);
  }

  function ghostSpot() {
    return {
      x: Math.max(L + R, Math.min(g.isBreak ? HEAD_X : RIGHT - R, pointer.x)),
      y: Math.max(T + R, Math.min(BOTTOM - R, pointer.y)),
    };
  }

  function humanFire() {
    if (state !== 'aim' || g.turn !== 0) return;
    shoot(aim, B.speedFromPower(humanPower));
  }

  cv.addEventListener('pointermove', e => { pointer = toCanvas(e); updateAim(); });
  cv.addEventListener('pointerdown', e => { pointer = toCanvas(e); updateAim(); });
  cv.addEventListener('pointerup', e => {
    pointer = toCanvas(e);
    if (!g || g.turn !== 0) return;
    if (state === 'placing') {
      const s = ghostSpot();
      if (B.validPlacement(g, s.x, s.y)) {
        B.placeCue(g, s.x, s.y);
        state = 'aim'; updateAim();
        setStatus('Din tur – sikta och skjut.');
      }
    } else if (state === 'aim' && e.pointerType === 'mouse') {
      humanFire();
    }
  });

  powerEl.addEventListener('input', () => { humanPower = powerEl.value / 100; if (g && g.turn === 0) drawPower = humanPower; });
  shootBtn.addEventListener('click', humanFire);
  $('newMatch').addEventListener('click', () => showMenu());
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => newMatch(b.dataset.level)));

  addEventListener('keydown', e => {
    if (!g || state === 'menu') return;
    const keys = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (keys.includes(e.code)) e.preventDefault();
    if (state !== 'aim' || g.turn !== 0) return;
    if (e.code === 'Space' && !e.repeat) humanFire();
    if (e.code === 'ArrowLeft') aim -= e.shiftKey ? 0.0015 : 0.006;
    if (e.code === 'ArrowRight') aim += e.shiftKey ? 0.0015 : 0.006;
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      humanPower = Math.max(0.05, Math.min(1, humanPower + (e.code === 'ArrowUp' ? 0.04 : -0.04)));
      drawPower = humanPower; powerEl.value = Math.round(humanPower * 100);
    }
  });

  // ---------- Ritning ----------
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  function drawTable() {
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 5; ctx.strokeStyle = '#2b2d42';
    ctx.fillStyle = '#c0703a'; rr(6, 6, 788, 438, 34); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1d8f5a'; rr(L - 16, T - 16, RW + 32, RH + 32, 10); ctx.fill();
    ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#37c985'; ctx.fillRect(L, T, RW, RH);

    // Diamanter
    ctx.fillStyle = '#ffe9a8';
    for (let i = 1; i < 8; i++) {
      if (i === 4) continue;
      const x = L + RW * i / 8;
      for (const y of [T - 28, BOTTOM + 28]) { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
    }
    for (let i = 1; i < 4; i++) {
      const y = T + RH * i / 4;
      for (const x of [L - 28, RIGHT + 28]) { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
    }

    // Startlinje och spotar
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(HEAD_X, T); ctx.lineTo(HEAD_X, BOTTOM); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (const x of [HEAD_X, FOOT_X]) { ctx.beginPath(); ctx.arc(x, MID_Y, 3, 0, 7); ctx.fill(); }

    // Hål
    ctx.fillStyle = '#1b1b2b'; ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 3;
    for (const p of POCKETS) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.stroke(); }
  }

  function drawBall(b, x = b.x, y = b.y, alpha = 1) {
    const n = b.n;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.arc(x + 2, y + 3, R, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.save(); ctx.clip();
    ctx.fillStyle = n === 0 || n > 8 ? '#fff' : colorOf(n);
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
    if (n > 8) { ctx.fillStyle = colorOf(n); ctx.fillRect(x - R, y - R * 0.6, 2 * R, R * 1.2); }
    if (n > 0) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, R * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.font = '800 8px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n, x, y + 0.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.arc(x - R * 0.38, y - R * 0.4, R * 0.2, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
    ctx.restore();
  }

  function drawGuide() {
    const c = g.balls[0];
    const hit = B.castRay(g.balls, c.x, c.y, aim);
    ctx.save();
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(hit.x, hit.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(hit.x, hit.y, R, 0, 7); ctx.stroke();
    if (hit.ball) {
      let nx = hit.ball.x - hit.x, ny = hit.ball.y - hit.y;
      const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
      ctx.strokeStyle = '#ffc93c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hit.ball.x, hit.ball.y); ctx.lineTo(hit.ball.x + nx * 70, hit.ball.y + ny * 70); ctx.stroke();
      const dx = Math.cos(aim), dy = Math.sin(aim), dot = dx * nx + dy * ny;
      const tx = dx - dot * nx, ty = dy - dot * ny;
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hit.x, hit.y); ctx.lineTo(hit.x + tx * 45, hit.y + ty * 45); ctx.stroke();
    }
    ctx.restore();
  }

  function drawCue() {
    const c = g.balls[0];
    const ca = Math.cos(aim), sa = Math.sin(aim);
    const s0 = R + 4 + 8 + drawPower * 80, s1 = s0 + 240;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(c.x - ca * s0, c.y - sa * s0); ctx.lineTo(c.x - ca * s1, c.y - sa * s1); ctx.stroke();
    ctx.strokeStyle = '#f2c785'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(c.x - ca * s0, c.y - sa * s0); ctx.lineTo(c.x - ca * s1, c.y - sa * s1); ctx.stroke();
    ctx.strokeStyle = '#3ec5ff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(c.x - ca * s0, c.y - sa * s0); ctx.lineTo(c.x - ca * (s0 + 9), c.y - sa * (s0 + 9)); ctx.stroke();
  }

  function draw() {
    drawTable();
    if (!g) return;
    for (const b of g.balls) if (b.alive && b.n !== 0) drawBall(b);
    const cue = g.balls[0];
    if (cue.alive) drawBall(cue);

    if (state === 'aim') {
      if (g.turn === 0) drawGuide();
      drawCue();
    } else if (state === 'placing' && g.turn === 0) {
      const s = ghostSpot(), ok = B.validPlacement(g, s.x, s.y);
      drawBall(cue, s.x, s.y, ok ? 0.8 : 0.35);
      if (!ok) { ctx.strokeStyle = '#ff5d8f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, R + 3, 0, 7); ctx.stroke(); }
      if (g.isBreak) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(L, T, HEAD_X - L, RH); }
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (g) {
      if (state === 'rolling') {
        acc += dt;
        while (acc >= DT && state === 'rolling') {
          acc -= DT; rollTime += DT;
          if (B.stepShot(g) || rollTime > 40) { afterShot(); break; }
        }
        renderHudIfPocketed();
      } else updateBot(dt);
    }
    draw();
    requestAnimationFrame(loop);
  }

  let lastAlive = 16;
  function renderHudIfPocketed() {
    const alive = g.balls.reduce((s, b) => s + (b.alive ? 1 : 0), 0);
    if (alive !== lastAlive) { lastAlive = alive; renderHud(); }
  }

  showMenu();
  requestAnimationFrame(loop);
})();
