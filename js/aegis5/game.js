// Station Aegis 5 – gränssnitt: rendering (Canvas 2D, med krokar för bildfiler), kamera, ljud och styrning.
(() => {
  const T = TableAegis5, E = Aegis5Engine;
  const W = T.size.w, H = T.size.h, VIEW_H = T.camera.viewH;

  const cv = document.getElementById('board');
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = { score: $('score'), ball: $('ballInfo'), best: $('best'), msg: $('msg'), overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), start: $('start') };

  const sim = E.create(T);
  let best = Store.get('aegis5-best', 0);
  let charge = 0, charging = false, camY = H - VIEW_H / 2, last = 0, started = false;
  const flash = {};                         // id → tid då blixten tar slut

  // ---------- Bildfiler (valfria): art/source/*.png ersätter placeholder-formerna när de finns ----------
  const IMAGES = {};
  ['background', 'ball', 'bumper1', 'bumper2', 'bumper3', 'flipper', 'flipper_mid', 'sling', 'drop', 'standup', 'spinner', 'airlock', 'emblem', 'plunger']
    .forEach(n => {
      const img = new Image();
      img.onload = () => { IMAGES[n] = img; };
      img.src = `../art/source/${n}.png`;
    });
  function sprite(name, x, y, w, h, angle = 0, flipX = false) {
    const img = IMAGES[name];
    if (!img) return false;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle); if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  // ---------- Ljud ----------
  const snd = {
    bumper: () => Sound.beep(520 + Math.random() * 260, 0.09, 'square', 0.05),
    sling: () => Sound.beep(300, 0.05, 'sawtooth', 0.04),
    flipper: () => Sound.beep(110, 0.04, 'triangle', 0.05),
    launch: () => Sound.beep(90, 0.25, 'sawtooth', 0.06),
    drop: () => Sound.beep(420, 0.08, 'triangle', 0.06),
    standup: () => Sound.beep(660, 0.05, 'triangle', 0.05),
    lane: () => Sound.beep(880, 0.08, 'sine', 0.06),
    rampEnter: () => Sound.beep(360, 0.18, 'sawtooth', 0.04),
    rampExit: () => { Sound.beep(700, 0.1, 'square', 0.05); setTimeout(() => Sound.beep(940, 0.14, 'square', 0.05), 90); },
    spinner: () => Sound.beep(1200, 0.02, 'square', 0.02),
    lock: () => { Sound.beep(200, 0.2, 'sawtooth', 0.06); setTimeout(() => Sound.beep(300, 0.2, 'sawtooth', 0.06), 150); },
    multiball: () => [440, 554, 659, 880].forEach((f, i) => setTimeout(() => Sound.beep(f, 0.2, 'triangle', 0.07), i * 110)),
    jackpot: () => [660, 880, 1100].forEach((f, i) => setTimeout(() => Sound.beep(f, 0.15, 'square', 0.06), i * 80)),
    kickback: () => Sound.beep(160, 0.2, 'sawtooth', 0.07),
    aegis: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => Sound.beep(f, 0.18, 'triangle', 0.07), i * 100)),
    drain: () => Sound.beep(130, 0.5, 'sawtooth', 0.06),
    tilt: () => Sound.beep(80, 0.6, 'square', 0.07),
    eject: () => Sound.beep(240, 0.1, 'triangle', 0.05),
    saved: () => Sound.beep(740, 0.3, 'sine', 0.06),
    bonus: () => Sound.beep(600, 0.3, 'triangle', 0.05),
    inlane: () => Sound.beep(500, 0.04, 'sine', 0.03),
    outlane: () => Sound.beep(180, 0.15, 'sine', 0.05),
    nudge: () => Sound.beep(70, 0.08, 'square', 0.04),
  };

  function handleEvents() {
    for (const e of sim.takeEvents()) {
      if (snd[e.type]) snd[e.type]();
      if (e.type === 'bumper') flash[e.ref.id] = sim.game.time + 0.15;
      if (e.type === 'sling') flash[e.ref.id] = sim.game.time + 0.12;
      if (e.type === 'drop') flash['drop' + (e.idx + 1)] = sim.game.time + 0.2;
      if (e.type === 'standup') flash[e.ref.id] = sim.game.time + 0.2;
      if (e.type === 'gameOver') finish(e.score);
    }
  }

  function finish(score) {
    const record = score > best;
    if (record) { best = score; Store.set('aegis5-best', best); }
    ui.ovTitle.textContent = 'Game over';
    ui.ovText.textContent = `${score.toLocaleString('sv-SE')} poäng.` + (record ? ' Nytt rekord! 🎉' : '');
    ui.start.textContent = 'Spela igen';
    ui.overlay.hidden = false;
  }

  function startGame() {
    ui.overlay.hidden = true;
    started = true;
    sim.newGame();
    camY = H - VIEW_H / 2;
  }

  // ---------- Input ----------
  const keys = { left: ['ArrowLeft', 'KeyZ'], right: ['ArrowRight', 'KeyM'] };
  const down = new Set();
  const refresh = () => {
    sim.input.left = keys.left.some(k => down.has(k)) || down.has('touchL');
    sim.input.right = keys.right.some(k => down.has(k)) || down.has('touchR');
  };
  addEventListener('keydown', e => {
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space') {
      if (!started || sim.game.state === 'over') { if (!ui.overlay.hidden) startGame(); return; }
      charging = true;
    }
    if (e.code === 'KeyA') sim.nudge([-1, 0]);
    if (e.code === 'KeyD') sim.nudge([1, 0]);
    if (e.code === 'KeyW') sim.nudge([0, -1]);
    down.add(e.code); refresh();
  });
  addEventListener('keyup', e => {
    down.delete(e.code); refresh();
    if (e.code === 'Space' && charging) { charging = false; sim.launch(charge); charge = 0; }
  });
  addEventListener('blur', () => { down.clear(); refresh(); });

  const hold = (id, on, off) => {
    const el = $(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('down'); on(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => { if (el.classList.contains('down')) { el.classList.remove('down'); off(); } }));
  };
  hold('tLeft', () => { down.add('touchL'); refresh(); }, () => { down.delete('touchL'); refresh(); });
  hold('tRight', () => { down.add('touchR'); refresh(); }, () => { down.delete('touchR'); refresh(); });
  hold('tLaunch', () => { if (!started || sim.game.state === 'over') startGame(); else charging = true; }, () => { if (charging) { charging = false; sim.launch(charge); charge = 0; } });
  // Tryck på vänster/höger halva av banan = flipper (mobil)
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect();
    down.add(e.clientX - r.left < r.width / 2 ? 'touchL' : 'touchR'); refresh();
    cv.setPointerCapture(e.pointerId); cv.dataset.side = e.clientX - r.left < r.width / 2 ? 'touchL' : 'touchR';
  });
  ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { down.delete('touchL'); down.delete('touchR'); refresh(); }));
  ui.start.addEventListener('click', startGame);

  // ---------- Lampor ----------
  function lit(id, t) {
    const g = sim.game;
    const chase = (n, speed = 4) => Math.floor(t * speed) % n;
    if (/^light[AEGIS]$/.test(id)) return g.lanes['AEGIS'.indexOf(id.slice(-1))];
    if (/^dropLight/.test(id)) return g.drops[+id.slice(-1) - 1];
    if (/^standLightL/.test(id)) return g.standL[+id.slice(-1) - 1];
    if (/^standLightR/.test(id)) return g.standR[+id.slice(-1) - 1];
    if (/^lock/.test(id)) return g.locked >= +id.slice(-1) || (g.airlockLit && Math.floor(t * 3) % 2 === 0);
    if (id === 'kickbackLight') return g.kickbackArmed;
    if (id === 'saverLight') return g.saver > 0 && Math.floor(t * 4) % 2 === 0;
    if (/^bonus/.test(id)) return g.bonusMult >= parseInt(id.slice(5), 10);
    if (/Arrow(\d)$/.test(id)) return chase(3, 5) === +id.slice(-1) - 1 && (g.state === 'play');
    if (/^jackpot/.test(id) || id === 'emblem') return g.multiball && Math.floor(t * 4) % 2 === 0;
    if (/^(orbit|spin)Light/.test(id)) return chase(2, 2) === 0 && g.state === 'play';
    if (/^inlane/.test(id)) return true;
    return false;
  }

  // ---------- Rendering ----------
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(cv.getBoundingClientRect().width * dpr) || W;
    cv.width = w; cv.height = Math.round(w * VIEW_H / W);
  }
  addEventListener('resize', resize);

  const path = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); };

  function drawLight(i, t) {
    const on = lit(i.id, t);
    ctx.save();
    ctx.translate(i.x, i.y);
    if (i.shape === 'arrow') ctx.rotate(i.rot * Math.PI / 180);
    ctx.globalAlpha = on ? 1 : 0.28;
    if (on) { ctx.shadowColor = i.color; ctx.shadowBlur = 26; }
    ctx.fillStyle = i.color; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
    if (i.shape === 'arrow') {
      const r = i.r; ctx.beginPath(); ctx.moveTo(-r, -r * 0.7); ctx.lineTo(r, 0); ctx.lineTo(-r, r * 0.7); ctx.lineTo(-r * 0.4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (i.shape === 'star') {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const rr = k % 2 ? i.r * 0.45 : i.r, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, i.r, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    if (i.label && i.label.length <= 2 && i.r >= 14) {
      ctx.fillStyle = on ? '#14141b' : '#d9c39a'; ctx.font = `800 ${i.r}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i.label, i.x, i.y + 1);
    }
  }

  function drawFlipper(f) {
    const p = f.body.getPosition(), a = f.body.getAngle(), px = p.x * 100, py = p.y * 100;
    const mid = f.ref.group === 'mid';
    if (sprite(mid ? 'flipper_mid' : 'flipper', px + Math.cos(a) * f.s * f.ref.len / 2, py + Math.sin(a) * f.s * f.ref.len / 2, f.ref.len + 30, mid ? 34 : 40, a, f.s === -1)) return;
    const h0 = mid ? 13 : 15, h1 = mid ? 8 : 9;
    const ux = f.s === 1 ? Math.cos(a) : -Math.cos(a), uy = Math.sin(a) * (f.s === 1 ? 1 : -1);
    const nx = -uy, ny = ux, L = f.ref.len;
    const tx = px + ux * L, ty = py + uy * L;
    ctx.fillStyle = '#2b2d42'; ctx.beginPath();
    ctx.moveTo(px + nx * (h0 + 3), py + ny * (h0 + 3)); ctx.lineTo(tx + nx * (h1 + 3), ty + ny * (h1 + 3));
    ctx.lineTo(tx - nx * (h1 + 3), ty - ny * (h1 + 3)); ctx.lineTo(px - nx * (h0 + 3), py - ny * (h0 + 3)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f.pressed ? '#ffd0e0' : '#ff5d8f'; ctx.beginPath();
    ctx.moveTo(px + nx * h0, py + ny * h0); ctx.lineTo(tx + nx * h1, ty + ny * h1);
    ctx.lineTo(tx - nx * h1, ty - ny * h1); ctx.lineTo(px - nx * h0, py - ny * h0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, h0, 0, 7); ctx.arc(tx, ty, h1, 0, 7); ctx.fill();
  }

  function drawBall(b) {
    const q = sim.posPx(b), R = T.ball.r, onRamp = b.mode === 'ramp';
    if (b.state === 'held') return;
    const sc = onRamp ? 1.12 : 1;
    if (onRamp) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(q.x + 10, q.y + 14, R, 0, 7); ctx.fill(); }
    if (sprite('ball', q.x, q.y, R * 2 * sc, R * 2 * sc)) return;
    const g = ctx.createRadialGradient(q.x - R * 0.35, q.y - R * 0.35, 2, q.x, q.y, R * sc);
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#c4cbdc'); g.addColorStop(1, '#4b5168');
    ctx.fillStyle = g; ctx.strokeStyle = '#14141b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(q.x, q.y, R * sc, 0, 7); ctx.fill(); ctx.stroke();
  }

  function drawWorld(t) {
    const g = sim.game;
    // Bakgrund
    if (IMAGES.background) ctx.drawImage(IMAGES.background, 0, 0, W, H);
    else {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#2b2430'); bg.addColorStop(0.5, '#262330'); bg.addColorStop(1, '#2f2326');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(200,146,58,.12)'; ctx.lineWidth = 2;                   // rutnät som placeholder
      for (let x = 0; x < W; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.save();                                                                       // mörka hörn utanför kupolen
      ctx.beginPath(); ctx.rect(0, 0, W, T.dome.cy); ctx.clip();
      ctx.fillStyle = '#0b0a10'; ctx.beginPath(); ctx.rect(0, 0, W, T.dome.cy);
      ctx.moveTo(T.dome.cx + T.dome.r, T.dome.cy); ctx.arc(T.dome.cx, T.dome.cy, T.dome.r, 0, Math.PI * 2);
      ctx.fill('evenodd'); ctx.restore();
    }
    // Startränna
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(920, 1100, 74, 1370);

    // Lampor
    T.inserts.forEach(i => { if (i.shape !== 'arrow') drawLight(i, t); });

    // Väggar (när bakgrundsbilden finns är väggarna redan målade i den)
    if (!IMAGES.background) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#c8923a'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(T.dome.cx, T.dome.cy, T.dome.r, Math.PI, 0); ctx.stroke();
      T.walls.forEach(w => {
        path(w.pts, w.closed);
        if (w.closed) { ctx.fillStyle = '#6e5a3a'; ctx.fill(); }
        ctx.strokeStyle = w.kind === 'outer' ? '#c8923a' : '#d9c39a'; ctx.lineWidth = w.thick; ctx.stroke();
      });
      T.posts.forEach(p => { ctx.fillStyle = '#d9c39a'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });
    }

    // Slingshots
    T.slings.forEach(s => {
      const on = (flash[s.id] || 0) > g.time;
      path(s.pts, true); ctx.fillStyle = on ? '#ffd0e0' : '#7a4a3a'; ctx.fill();
      ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = on ? '#fff' : '#ff5d8f'; ctx.lineWidth = 8; path(s.kick); ctx.stroke();
    });

    // Bumpers
    T.bumpers.forEach((b, i) => {
      const on = (flash[b.id] || 0) > g.time, r = b.r + (on ? 6 : 0);
      if (!sprite('bumper' + (i + 1), b.x, b.y, r * 2.4, r * 2.4)) {
        ctx.save(); if (on) { ctx.shadowColor = b.color; ctx.shadowBlur = 40; }
        ctx.fillStyle = on ? '#fff' : b.color; ctx.strokeStyle = '#14141b'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(b.x - r * 0.3, b.y - r * 0.3, r * 0.22, 0, 7); ctx.fill();
      }
    });

    // Airlock
    T.saucers.forEach(s => {
      if (!sprite('airlock', s.x, s.y, s.r * 2.6, s.r * 2.6)) {
        ctx.fillStyle = '#05050a'; ctx.strokeStyle = g.airlockLit ? '#ff9f43' : '#d9c39a'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); ctx.stroke();
      }
    });

    // Mål
    T.drops.forEach((d, i) => {
      const dn = g.drops[i];
      if (!sprite('drop', d.x, d.y, d.w, d.h * (dn ? 0.4 : 1))) {
        ctx.fillStyle = dn ? '#2b3a45' : '#3ec5ff'; ctx.strokeStyle = '#14141b'; ctx.lineWidth = 4;
        const h = dn ? 6 : d.h; ctx.fillRect(d.x - d.w / 2, d.y - h / 2, d.w, h); ctx.strokeRect(d.x - d.w / 2, d.y - h / 2, d.w, h);
      }
    });
    T.standups.forEach(s => {
      const on = (flash[s.id] || 0) > g.time;
      if (!sprite('standup', s.x, s.y, s.w, s.h)) { ctx.fillStyle = on ? '#fff' : '#3ddc97'; ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h); }
    });
    T.spinners.forEach(s => { if (!sprite('spinner', s.x, s.y, s.w, s.h * 2)) { ctx.fillStyle = '#8b5cf6'; ctx.fillRect(s.x - s.w / 2, s.y - 4, s.w, 8); } });
    T.kickers.forEach(k => { ctx.fillStyle = g.kickbackArmed ? '#ff9f43' : '#5a4a3a'; ctx.fillRect(k.x - k.w / 2, k.y - k.h / 2, k.w, k.h); });
    T.gates.forEach(gt => { ctx.strokeStyle = '#ff9f43'; ctx.lineWidth = 6; ctx.setLineDash([12, 8]); path([gt.p1, gt.p2]); ctx.stroke(); ctx.setLineDash([]); });
    T.inserts.filter(i => i.id === 'emblem').forEach(i => { if (IMAGES.emblem) sprite('emblem', i.x, i.y, 120, 120); });

    // Ramper (under bollar i normalt läge)
    T.ramps.forEach(r => {
      path(r.path); ctx.strokeStyle = 'rgba(20,20,27,.9)'; ctx.lineWidth = r.width + 14; ctx.stroke();
      ctx.strokeStyle = r.color; ctx.globalAlpha = 0.28; ctx.lineWidth = r.width; ctx.stroke(); ctx.globalAlpha = 1;
    });
    T.inserts.forEach(i => { if (i.shape === 'arrow') drawLight(i, t); });

    // Flippers
    sim.flippers.forEach(drawFlipper);

    // Bollar: normala först, rampbollar ovanpå
    sim.balls.filter(b => b.mode === 'normal').forEach(b => drawBall(b));
    T.ramps.forEach(r => {
      E.rampRails(r).forEach(line => { path(line); ctx.strokeStyle = r.color; ctx.lineWidth = 8; ctx.stroke(); });
    });
    sim.balls.filter(b => b.mode === 'ramp').forEach(b => drawBall(b));

    // Fjäder
    const laneBall = sim.balls.find(b => b.state === 'lane');
    const compress = laneBall ? charge * 50 : 0;
    ctx.strokeStyle = '#d9c39a'; ctx.lineWidth = 5; ctx.beginPath();
    for (let k = 0; k <= 8; k++) { const y = 2420 + compress + (k / 8) * (2466 - 2420 - compress); ctx.lineTo(955 + (k % 2 ? 14 : -14), y); k === 0 && ctx.moveTo(955, y); }
    ctx.stroke();
    if (!sprite('plunger', 955, 2442 + compress, 44, 90)) { ctx.fillStyle = '#c8923a'; ctx.fillRect(935, 2440 + compress, 40, 14); }
  }

  function render(t) {
    const scale = cv.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0a10'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(scale, 0, 0, scale, 0, -(camY - VIEW_H / 2) * scale);
    drawWorld(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sim.game.tilt) { ctx.fillStyle = 'rgba(255,60,60,.25)'; ctx.fillRect(0, 0, cv.width, cv.height); }
  }

  function updateCamera(dt) {
    const balls = sim.balls.filter(b => b.state !== 'held');
    let target = H - VIEW_H / 2;
    if (balls.length && sim.game.state !== 'serve') {
      const ys = balls.map(b => sim.posPx(b).y);
      target = Math.min(...ys) < 700 && Math.max(...ys) < 1400 ? Math.min(...ys) + 300 : Math.max(...ys) - 150;
      if (balls.length > 1) target = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
    target = Math.max(VIEW_H / 2, Math.min(H - VIEW_H / 2, target));
    camY += (target - camY) * Math.min(1, dt * 5);
  }

  function updateDmd() {
    const g = sim.game;
    ui.score.textContent = g.score.toLocaleString('sv-SE');
    ui.ball.innerHTML = `BOLL ${Math.min(g.ball, g.balls)}/${g.balls}${g.multiball ? ' · MULTIBALL' : ''}<br>REKORD <span id="best">${Math.max(best, g.score).toLocaleString('sv-SE')}</span>`;
    const msg = g.messageUntil > g.time ? g.message : (g.state === 'serve' ? 'HÅLL MELLANSLAG – SLÄPP FÖR ATT SKJUTA' : g.saver > 0 && g.state === 'play' ? 'BALL SAVER' : '');
    ui.msg.textContent = msg || ' ';
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (charging) charge = Math.min(1, charge + dt / 1.1);
    if (started) sim.update(dt);
    handleEvents();
    updateCamera(dt);
    render(ts / 1000);
    updateDmd();
    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();
