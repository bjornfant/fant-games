(() => {
  const W = 480, H = 600;
  const COLS = 8, ROWS = 6, BRICK_H = 22, GAP = 6, MARGIN = 20, TOP = 70;
  const BRICK_W = (W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;
  const COLORS = ['#ff5d8f', '#ff9f43', '#ffc93c', '#3ddc97', '#3ec5ff', '#8b5cf6'];
  const R = 8, PADDLE_Y = H - 44, MAX_SPEED = 720;

  const cv = document.getElementById('board');
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const hud = { score: $('score'), lives: $('lives'), level: $('level'), best: $('best') };
  const overlay = $('overlay'), ovTitle = $('ovTitle'), ovText = $('ovText'), startBtn = $('start');

  const paddle = { w: 96, h: 14, x: W / 2 };   // x = mittpunkt
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };
  const keys = { left: false, right: false };
  let bricks = [], particles = [];
  let state = 'menu';   // menu | ready | play | over
  let score = 0, lives = 3, level = 1, speed = 340;
  let best = Store.get('breakout-best', 0);
  let last = 0;

  function show() {
    hud.score.textContent = score;
    hud.lives.textContent = lives;
    hud.level.textContent = level;
    hud.best.textContent = best;
  }

  function buildBricks() {
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: MARGIN + c * (BRICK_W + GAP),
          y: TOP + r * (BRICK_H + GAP),
          color: COLORS[r % COLORS.length],
          pts: (ROWS - r) * 10,
        });
      }
    }
  }

  function resetBall() {
    state = 'ready';
    speed = 340 + (level - 1) * 40;
    ball.vx = ball.vy = 0;
    placeBall();
  }

  function placeBall() {
    ball.x = paddle.x;
    ball.y = PADDLE_Y - R - 1;
  }

  function newGame() {
    score = 0; lives = 3; level = 1;
    buildBricks();
    resetBall();
    overlay.hidden = true;
    show();
  }

  function launch() {
    if (state === 'menu' || state === 'over') return newGame();
    if (state !== 'ready') return;
    const angle = (Math.random() * 40 - 20) * Math.PI / 180;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
    state = 'play';
    Sound.beep(330, 0.08, 'triangle');
  }

  function endGame() {
    state = 'over';
    if (score > best) { best = score; Store.set('breakout-best', best); }
    ovTitle.textContent = 'Game over!';
    ovText.textContent = `Du fick ${score} poäng.` + (score >= best && score > 0 ? ' Nytt rekord! 🎉' : '');
    startBtn.textContent = 'Spela igen';
    overlay.hidden = false;
    show();
    Sound.beep(150, 0.4, 'sawtooth');
  }

  function burst(x, y, color) {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x, y, color,
        vx: (Math.random() - 0.5) * 280,
        vy: (Math.random() - 0.7) * 280,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  function setBallSpeed(vx, vy) {
    const m = Math.hypot(vx, vy) || 1;
    ball.vx = (vx / m) * speed;
    ball.vy = (vy / m) * speed;
  }

  function update(dt) {
    // Plattan
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) paddle.x += dir * 560 * dt;
    paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));

    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    if (state === 'ready') { placeBall(); return; }
    if (state !== 'play') return;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Väggar
    if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); Sound.beep(260, 0.03, 'triangle'); }
    if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); Sound.beep(260, 0.03, 'triangle'); }
    if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); Sound.beep(260, 0.03, 'triangle'); }

    // Platta
    const px = paddle.x - paddle.w / 2;
    if (ball.vy > 0 && ball.y + R >= PADDLE_Y && ball.y - R <= PADDLE_Y + paddle.h
        && ball.x >= px - R && ball.x <= px + paddle.w + R) {
      const rel = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)));
      const a = rel * 62 * Math.PI / 180;
      setBallSpeed(Math.sin(a), -Math.cos(a));
      ball.y = PADDLE_Y - R;
      Sound.beep(440, 0.05, 'square');
    }

    // Block
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      const cx = Math.max(b.x, Math.min(ball.x, b.x + BRICK_W));
      const cy = Math.max(b.y, Math.min(ball.y, b.y + BRICK_H));
      const dx = ball.x - cx, dy = ball.y - cy;
      if (dx * dx + dy * dy >= R * R) continue;

      if (dx === 0 && dy === 0) ball.vy = -ball.vy;
      else if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
        ball.x = cx + Math.sign(dx) * R;
      } else {
        ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
        ball.y = cy + Math.sign(dy) * R;
      }

      score += b.pts;
      burst(b.x + BRICK_W / 2, b.y + BRICK_H / 2, b.color);
      bricks.splice(i, 1);
      speed = Math.min(MAX_SPEED, speed * 1.01);
      setBallSpeed(ball.vx, ball.vy);
      Sound.beep(600 + (ROWS * 10 - b.pts) * 6, 0.06, 'square');
      hud.score.textContent = score;
      break;
    }

    if (!bricks.length) {
      level++;
      buildBricks();
      resetBall();
      Sound.beep(880, 0.25, 'triangle');
      show();
      return;
    }

    // Missad boll
    if (ball.y > H + R) {
      lives--;
      show();
      Sound.beep(200, 0.25, 'sawtooth');
      if (lives <= 0) endGame(); else resetBall();
    }
  }

  // ---------- Ritning ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b2d42');
    g.addColorStop(1, '#4a3f7a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2b2d42';
    for (const b of bricks) {
      ctx.fillStyle = b.color;
      roundRect(b.x, b.y, BRICK_W, BRICK_H, 7);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      roundRect(b.x + 4, b.y + 3, BRICK_W - 8, 5, 3);
      ctx.fill();
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;

    // Platta
    ctx.fillStyle = '#ffc93c';
    roundRect(paddle.x - paddle.w / 2, PADDLE_Y, paddle.w, paddle.h, 8);
    ctx.fill(); ctx.stroke();

    // Boll
    if (state !== 'menu') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 7); ctx.fill(); ctx.stroke();
    }

    if (state === 'ready') {
      ctx.fillStyle = '#fff';
      ctx.font = '900 20px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Nivå ${level} – tryck för att skjuta`, W / 2, H / 2 + 70);
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
  addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space' && !e.repeat) launch();
  });
  addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  });

  function movePaddle(e) {
    const rect = cv.getBoundingClientRect();
    paddle.x = ((e.clientX - rect.left) / rect.width) * W;
  }
  cv.addEventListener('pointermove', movePaddle);
  cv.addEventListener('pointerdown', e => {
    movePaddle(e);
    if (state === 'ready') launch();
  });

  startBtn.addEventListener('click', newGame);

  buildBricks();
  placeBall();
  show();
  requestAnimationFrame(loop);
})();
