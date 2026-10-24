(() => {
  const W = 420, H = 660, R = 9;
  const SUB = 6, GRAV = 900, MAXV = 1500, DRAG = 0.9998;
  const FLIP_LEN = 70, FLIP_W = 7, FLIP_SPEED = 22;

  const cv = document.getElementById('board');
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const hud = { score: $('score'), balls: $('balls'), best: $('best') };
  const overlay = $('overlay'), ovTitle = $('ovTitle'), ovText = $('ovText'), startBtn = $('start');

  // Bågen högst upp: cirkel med mitt i (210, 210) som bollen studsar mot inifrån.
  const ARC = { x: W / 2, y: 210, r: W / 2 };

  // [x1, y1, x2, y2, tjocklek]
  const walls = [
    [0, 210, 0, H, 2],
    [W, 210, W, H, 2],
    [385, 250, 385, 632, 3],    // vägg mot startrännan
    [385, 632, W, 632, 2],      // botten i startrännan
    [0, 215, 75, 290, 4],       // ledskena som styr in bollen mot bumpers
    [0, 490, 105, 590, 4],      // vänster ramp
    [385, 490, 280, 590, 4],    // höger ramp
  ];

  const posts = [{ x: 70, y: 400, r: 7 }, { x: 340, y: 400, r: 7 }];

  const bumpers = [
    { x: 140, y: 240, r: 26, c: '#ff5d8f', flash: 0 },
    { x: 280, y: 240, r: 26, c: '#3ec5ff', flash: 0 },
    { x: 210, y: 150, r: 24, c: '#ffc93c', flash: 0 },
    { x: 210, y: 335, r: 22, c: '#3ddc97', flash: 0 },
  ];

  const flippers = [
    { px: 105, py: 590, s: 1, a: 0.5, rest: 0.5, act: -0.5, key: 'left' },
    { px: 280, py: 590, s: -1, a: 0.5, rest: 0.5, act: -0.5, key: 'right' },
  ];

  const input = { left: false, right: false, charging: false };
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let state = 'menu';       // menu | ready | play | over
  let score = 0, balls = 3, best = Store.get('pinball-best', 0);
  let charge = 0, idle = 0, last = 0;

  function show() {
    hud.score.textContent = score;
    hud.balls.textContent = balls;
    hud.best.textContent = best;
  }

  function resetBall() {
    ball.x = 402; ball.y = 632 - 2 - R; ball.vx = 0; ball.vy = 0;
    charge = 0; idle = 0;
    state = 'ready';
  }

  function newGame() {
    score = 0; balls = 3;
    resetBall();
    overlay.hidden = true;
    show();
  }

  function launch() {
    if (state !== 'ready') return;
    ball.vy = -(950 + 300 * charge);
    Sound.beep(220 + 300 * charge, 0.15, 'sawtooth');
    charge = 0;
    state = 'play';
  }

  function endGame() {
    state = 'over';
    if (score > best) { best = score; Store.set('pinball-best', best); }
    ovTitle.textContent = 'Game over!';
    ovText.textContent = `Du fick ${score} poäng.` + (score >= best && score > 0 ? ' Nytt rekord! 🎉' : '');
    startBtn.textContent = 'Spela igen';
    overlay.hidden = false;
    show();
    Sound.beep(160, 0.4, 'sawtooth');
  }

  // Cirkel mot linjesegment med tjocklek. Om omega != 0 rör sig segmentet (flipper).
  function hitSeg(x1, y1, x2, y2, th, e, omega = 0, px = 0, py = 0, s = 1) {
    const dx = x2 - x1, dy = y2 - y1;
    let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + dx * t, cy = y1 + dy * t;
    let nx = ball.x - cx, ny = ball.y - cy;
    const d = Math.hypot(nx, ny), min = R + th;
    if (d >= min || d === 0) return false;
    nx /= d; ny /= d;
    ball.x = cx + nx * min; ball.y = cy + ny * min;
    let sx = 0, sy = 0;
    if (omega) {
      sx = -s * omega * (cy - py);
      sy = s * omega * (cx - px);
    }
    const vn = (ball.vx - sx) * nx + (ball.vy - sy) * ny;
    if (vn < 0) {
      ball.vx -= (1 + e) * vn * nx;
      ball.vy -= (1 + e) * vn * ny;
    }
    return true;
  }

  function hitCircle(c, kick) {
    let nx = ball.x - c.x, ny = ball.y - c.y;
    const d = Math.hypot(nx, ny), min = R + c.r;
    if (d >= min || d === 0) return false;
    nx /= d; ny /= d;
    ball.x = c.x + nx * min; ball.y = c.y + ny * min;
    const vn = ball.vx * nx + ball.vy * ny;
    if (kick) {
      const sp = Math.max(520, Math.hypot(ball.vx, ball.vy) * 0.9);
      ball.vx = nx * sp; ball.vy = ny * sp;
    } else if (vn < 0) {
      ball.vx -= 1.6 * vn * nx; ball.vy -= 1.6 * vn * ny;
    }
    return true;
  }

  function step(dt) {
    // Flippers
    for (const f of flippers) {
      const target = input[f.key] && state !== 'over' ? f.act : f.rest;
      const diff = target - f.a;
      f.w = Math.abs(diff) < 0.001 ? 0 : Math.sign(diff) * FLIP_SPEED;
      f.a += f.w * dt;
      if ((f.w > 0 && f.a > target) || (f.w < 0 && f.a < target)) f.a = target;
    }

    if (state !== 'play') return;

    ball.vy += GRAV * dt;
    ball.vx *= DRAG; ball.vy *= DRAG;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > MAXV) { ball.vx *= MAXV / sp; ball.vy *= MAXV / sp; }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Bågen
    if (ball.y < ARC.y) {
      const dx = ball.x - ARC.x, dy = ball.y - ARC.y;
      const d = Math.hypot(dx, dy), lim = ARC.r - R;
      if (d > lim) {
        const nx = -dx / d, ny = -dy / d;
        ball.x = ARC.x + (dx / d) * lim;
        ball.y = ARC.y + (dy / d) * lim;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) { ball.vx -= vn * nx; ball.vy -= vn * ny; }
      }
    }

    for (const w of walls) hitSeg(w[0], w[1], w[2], w[3], w[4], 0.35);
    for (const p of posts) if (hitCircle(p, false)) Sound.beep(300, 0.04, 'triangle');
    for (const b of bumpers) {
      if (hitCircle(b, true)) {
        score += 100; b.flash = 1;
        Sound.beep(520 + Math.random() * 200, 0.08, 'square');
        hud.score.textContent = score;
      }
    }
    for (const f of flippers) {
      const x2 = f.px + f.s * FLIP_LEN * Math.cos(f.a);
      const y2 = f.py + FLIP_LEN * Math.sin(f.a);
      if (hitSeg(f.px, f.py, x2, y2, FLIP_W, 0.25, f.w, f.px, f.py, f.s) && f.w) {
        Sound.beep(180, 0.05, 'triangle');
      }
    }

    // Boll förlorad
    if (ball.y > H + 30) {
      balls--;
      show();
      if (balls <= 0) endGame(); else resetBall();
    }
  }

  function update(dt) {
    if (state === 'ready' && input.charging) charge = Math.min(1, charge + dt * 1.2);
    const h = dt / SUB;
    for (let i = 0; i < SUB; i++) step(h);
    for (const b of bumpers) b.flash = Math.max(0, b.flash - dt * 4);

    // Om bollen fastnat: ge den en liten knuff
    if (state === 'play') {
      idle = Math.hypot(ball.vx, ball.vy) < 8 ? idle + dt : 0;
      if (idle > 2.5) { ball.vx = (Math.random() - 0.5) * 300; ball.vy = -200; idle = 0; }
    }
  }

  // ---------- Ritning ----------
  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fff4d6');
    g.addColorStop(1, '#ffe0f0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 6;

    // Båge och väggar
    ctx.beginPath();
    ctx.arc(ARC.x, ARC.y, ARC.r - 2, Math.PI, 0);
    ctx.stroke();
    for (const w of walls) {
      ctx.lineWidth = w[4] * 2 + 2;
      ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(w[2], w[3]); ctx.stroke();
    }

    // Poster
    for (const p of posts) {
      ctx.fillStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.stroke();
    }

    // Bumpers
    for (const b of bumpers) {
      const grow = b.flash * 5;
      ctx.fillStyle = b.flash > 0.1 ? '#fff' : b.c;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + grow, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, 7); ctx.fill();
    }

    // Flippers
    for (const f of flippers) {
      const x2 = f.px + f.s * FLIP_LEN * Math.cos(f.a);
      const y2 = f.py + FLIP_LEN * Math.sin(f.a);
      ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = FLIP_W * 2 + 6;
      ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = '#ff5d8f'; ctx.lineWidth = FLIP_W * 2;
      ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // Fjäder i startrännan
    if (state === 'ready' || state === 'play') {
      const top = 632 - 24 + charge * 18;
      ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const y = top + (i / 6) * (632 - top);
        const x = 402 + (i % 2 ? 8 : -8);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (state === 'ready') {
        ctx.fillStyle = '#2b2d42';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SKJUT', 402, 650);
      }
    }

    // Boll
    if (state !== 'menu') {
      ctx.fillStyle = '#9aa3b2';
      ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ball.x - 3, ball.y - 3, 2.5, 0, 7); ctx.fill();
    }
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Input ----------
  const keyMap = {
    ArrowLeft: 'left', KeyZ: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyM: 'right', KeyD: 'right',
  };

  addEventListener('keydown', e => {
    if (e.code === 'Space' || keyMap[e.code]) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space') {
      if (state === 'menu' || state === 'over') newGame();
      else if (state === 'ready') input.charging = true;
    }
    const k = keyMap[e.code];
    if (k) input[k] = true;
    if (k) Sound.beep(140, 0.03, 'triangle', 0.03);
  });

  addEventListener('keyup', e => {
    const k = keyMap[e.code];
    if (k) input[k] = false;
    if (e.code === 'Space' && input.charging) { input.charging = false; launch(); }
  });

  function hold(id, on, off) {
    const el = $(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('down'); on(); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
      el.addEventListener(ev, () => { if (el.classList.contains('down')) { el.classList.remove('down'); off(); } });
    }
  }
  hold('tLeft', () => { input.left = true; }, () => { input.left = false; });
  hold('tRight', () => { input.right = true; }, () => { input.right = false; });
  hold('tLaunch',
    () => { if (state === 'ready') input.charging = true; else if (state !== 'play') newGame(); },
    () => { if (input.charging) { input.charging = false; launch(); } });

  startBtn.addEventListener('click', newGame);

  resetBall();
  state = 'menu';
  show();
  requestAnimationFrame(loop);
})();
