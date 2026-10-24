// Genererar skisser för Station Aegis 5 från tables/aegis5.js.
//   node tools/build-aegis5-svg.js   → art/aegis5-reference.svg och art/aegis5-annotated.svg
const fs = require('fs');
const path = require('path');
const T = require('../tables/aegis5.js');

const outDir = path.join(__dirname, '..', 'art');
fs.mkdirSync(outDir, { recursive: true });

const f = n => Math.round(n * 10) / 10;
const pts = a => a.map(p => `${f(p[0])},${f(p[1])}`).join(' ');
const pathD = (a, closed) => 'M' + a.map(p => `${f(p[0])} ${f(p[1])}`).join(' L') + (closed ? ' Z' : '');
const domeD = `M${T.dome.cx - T.dome.r} ${T.dome.cy} A${T.dome.r} ${T.dome.r} 0 0 1 ${T.dome.cx + T.dome.r} ${T.dome.cy}`;

function flipperPoly(fl, restOrActive = 'rest') {
  const s = fl.side === 'L' ? 1 : -1;
  const a = fl[restOrActive];
  const [px, py] = fl.pivot;
  const dx = s * Math.cos(a), dy = Math.sin(a);
  const nx = -dy, ny = dx;
  const tx = px + dx * fl.len, ty = py + dy * fl.len;
  const h0 = 15, h1 = 9;
  return {
    poly: [[px + nx * h0, py + ny * h0], [tx + nx * h1, ty + ny * h1], [tx - nx * h1, ty - ny * h1], [px - nx * h0, py - ny * h0]],
    tip: [tx, ty], h0, h1, pivot: [px, py],
  };
}

function starPoints(cx, cy, r, n = 5) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + i * Math.PI / n;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

function arrow(x, y, r, rot, color, stroke) {
  return `<polygon points="${-r},${-r * 0.7} ${r},0 ${-r},${r * 0.7} ${-r * 0.4},0" fill="${color}" stroke="${stroke}" stroke-width="2" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"/>`;
}

// ---------- 1. Referensbild: rena former utan text, för bildreferens i Midjourney ----------
function reference() {
  const c = { bg: '#14141b', field: '#262633', wall: '#c9c9d4', ramp: '#8a8a9a', rampEdge: '#e8e8f0', bump: '#e8e8f0', flip: '#f2f2f7', mid: '#5a5a6a' };
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T.size.w} ${T.size.h}" width="${T.size.w}" height="${T.size.h}">`);
  o.push(`<rect width="${T.size.w}" height="${T.size.h}" fill="${c.bg}"/>`);
  // Spelplan
  o.push(`<path d="${domeD} L${T.size.w - 30} ${T.size.h} L30 ${T.size.h} Z" fill="${c.field}"/>`);
  // Startränna
  o.push(`<rect x="915" y="1100" width="79" height="1370" fill="${c.mid}" opacity=".35"/>`);
  // Ramper
  T.ramps.forEach(r => {
    o.push(`<polyline points="${pts(r.path)}" fill="none" stroke="${c.rampEdge}" stroke-width="${r.width + 10}" stroke-linecap="round" stroke-linejoin="round"/>`);
    o.push(`<polyline points="${pts(r.path)}" fill="none" stroke="${c.ramp}" stroke-width="${r.width}" stroke-linecap="round" stroke-linejoin="round"/>`);
  });
  // Väggar
  o.push(`<path d="${domeD}" fill="none" stroke="${c.wall}" stroke-width="14"/>`);
  T.walls.forEach(w => {
    o.push(`<path d="${pathD(w.pts, w.closed)}" fill="${w.closed ? c.mid : 'none'}" stroke="${c.wall}" stroke-width="${w.thick + (w.kind === 'outer' ? 2 : 4)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  });
  T.posts.forEach(p => o.push(`<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${c.wall}"/>`));
  // Slingshots
  T.slings.forEach(s => o.push(`<polygon points="${pts(s.pts)}" fill="${c.mid}" stroke="${c.wall}" stroke-width="6" stroke-linejoin="round"/>`));
  // Bumpers
  T.bumpers.forEach(b => {
    o.push(`<circle cx="${b.x}" cy="${b.y}" r="${b.r + 8}" fill="none" stroke="${c.bump}" stroke-width="5"/>`);
    o.push(`<circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${c.mid}" stroke="${c.bump}" stroke-width="5"/>`);
    o.push(`<circle cx="${b.x}" cy="${b.y}" r="${b.r * 0.45}" fill="${c.bump}"/>`);
  });
  // Airlock
  T.saucers.forEach(s => {
    o.push(`<circle cx="${s.x}" cy="${s.y}" r="${s.r + 8}" fill="none" stroke="${c.wall}" stroke-width="6"/>`);
    o.push(`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="#0b0b10"/>`);
  });
  // Mål
  T.drops.forEach(d => o.push(`<rect x="${d.x - d.w / 2}" y="${d.y - d.h / 2}" width="${d.w}" height="${d.h}" rx="4" fill="${c.bump}"/>`));
  T.standups.forEach(s => o.push(`<rect x="${s.x - s.w / 2}" y="${s.y - s.h / 2}" width="${s.w}" height="${s.h}" rx="3" fill="${c.bump}"/>`));
  T.spinners.forEach(s => o.push(`<rect x="${s.x - s.w / 2}" y="${s.y - s.h / 2}" width="${s.w}" height="${s.h}" rx="4" fill="${c.bump}"/>`));
  T.kickers.forEach(k => o.push(`<rect x="${k.x - k.w / 2}" y="${k.y - k.h / 2}" width="${k.w}" height="${k.h}" rx="6" fill="${c.mid}" stroke="${c.wall}" stroke-width="4"/>`));
  // Flippers
  T.flippers.forEach(fl => {
    const g = flipperPoly(fl);
    o.push(`<polygon points="${pts(g.poly)}" fill="${c.flip}"/>`);
    o.push(`<circle cx="${g.pivot[0]}" cy="${g.pivot[1]}" r="${g.h0}" fill="${c.flip}"/><circle cx="${f(g.tip[0])}" cy="${f(g.tip[1])}" r="${g.h1}" fill="${c.flip}"/>`);
  });
  // Lampor som svaga ringar (visar var inserts ska sitta)
  T.inserts.forEach(i => {
    if (i.shape === 'star') o.push(`<polygon points="${pts(starPoints(i.x, i.y, i.r))}" fill="none" stroke="${c.rampEdge}" stroke-width="3" opacity=".55"/>`);
    else if (i.shape === 'round') o.push(`<circle cx="${i.x}" cy="${i.y}" r="${i.r}" fill="none" stroke="${c.rampEdge}" stroke-width="3" opacity=".45"/>`);
  });
  // Startfjäder
  o.push(`<rect x="935" y="2410" width="40" height="40" rx="6" fill="${c.wall}"/>`);
  o.push('</svg>');
  return o.join('\n');
}

// ---------- 2. Annoterad skiss: mått, zoner, etiketter och teckenförklaring ----------
function annotated() {
  const MARGIN = 420, W = T.size.w + MARGIN, H = T.size.h;
  const ink = '#2b2d42';
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, system-ui, sans-serif" font-weight="700">`);
  o.push(`<rect width="${W}" height="${H}" fill="#fff4d6"/>`);
  o.push(`<path d="${domeD} L${T.size.w - 30} ${T.size.h} L30 ${T.size.h} Z" fill="#fffdf5" stroke="${ink}" stroke-width="3"/>`);

  // Zoner
  const zc = ['#3ec5ff', '#8b5cf6', '#ffc93c', '#3ddc97', '#ff5d8f'];
  T.zones.forEach((z, i) => {
    o.push(`<rect x="30" y="${z.y0}" width="${T.size.w - 60}" height="${z.y1 - z.y0}" fill="${zc[i]}" opacity=".10"/>`);
    o.push(`<line x1="30" y1="${z.y0}" x2="${T.size.w + 20}" y2="${z.y0}" stroke="${zc[i]}" stroke-width="3" stroke-dasharray="14 10"/>`);
  });

  // Rutnät var 256:e px
  for (let x = 256; x < T.size.w; x += 256) o.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#2b2d42" stroke-opacity=".12" stroke-width="2"/><text x="${x + 6}" y="26" font-size="20" fill="${ink}" opacity=".5">x ${x}</text>`);
  for (let y = 256; y < H; y += 256) o.push(`<line x1="0" y1="${y}" x2="${T.size.w}" y2="${y}" stroke="#2b2d42" stroke-opacity=".12" stroke-width="2"/><text x="38" y="${y - 8}" font-size="20" fill="${ink}" opacity=".5">y ${y}</text>`);

  // Symmetriaxel
  o.push(`<line x1="${T.axis}" y1="1300" x2="${T.axis}" y2="${H}" stroke="${ink}" stroke-opacity=".25" stroke-width="2" stroke-dasharray="4 10"/>`);

  // Startränna
  o.push(`<rect x="915" y="1100" width="79" height="1370" fill="#cfd3e0" opacity=".6"/>`);

  // Ramper
  T.ramps.forEach(r => {
    o.push(`<polyline points="${pts(r.path)}" fill="none" stroke="${ink}" stroke-width="${r.width + 8}" stroke-linecap="round" stroke-linejoin="round"/>`);
    o.push(`<polyline points="${pts(r.path)}" fill="none" stroke="${r.color}" stroke-opacity=".55" stroke-width="${r.width}" stroke-linecap="round" stroke-linejoin="round"/>`);
    const a = r.path[0], b = r.path[r.path.length - 1];
    o.push(`<text x="${a[0]}" y="${a[1] + 56}" font-size="22" text-anchor="middle" fill="${ink}">INGÅNG</text>`);
    o.push(`<text x="${b[0]}" y="${b[1] - 84}" font-size="22" text-anchor="middle" fill="${ink}">UTGÅNG</text>`);
  });

  // Väggar
  o.push(`<path d="${domeD}" fill="none" stroke="${ink}" stroke-width="14"/>`);
  T.walls.forEach(w => o.push(`<path d="${pathD(w.pts, w.closed)}" fill="${w.closed ? '#9aa0b8' : 'none'}" stroke="${ink}" stroke-width="${w.thick}" stroke-linecap="round" stroke-linejoin="round"/>`));
  T.posts.forEach(p => o.push(`<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#9aa0b8" stroke="${ink}" stroke-width="4"/>`));

  // Slingshots
  T.slings.forEach(s => {
    o.push(`<polygon points="${pts(s.pts)}" fill="#ffd9e4" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`);
    o.push(`<line x1="${s.kick[0][0]}" y1="${s.kick[0][1]}" x2="${s.kick[1][0]}" y2="${s.kick[1][1]}" stroke="#ff5d8f" stroke-width="8" stroke-linecap="round"/>`);
  });

  // Bumpers
  T.bumpers.forEach((b, i) => {
    o.push(`<circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${b.color}" stroke="${ink}" stroke-width="5"/>`);
    o.push(`<circle cx="${b.x}" cy="${b.y}" r="${b.r * 0.5}" fill="#fff" opacity=".7"/>`);
    o.push(`<text x="${b.x}" y="${b.y + 8}" font-size="26" text-anchor="middle" fill="${ink}">${i + 1}</text>`);
  });
  T.saucers.forEach(s => {
    o.push(`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="#1b1b2b" stroke="${ink}" stroke-width="5"/>`);
    o.push(`<text x="${s.x}" y="${s.y - 56}" font-size="22" text-anchor="middle" fill="${ink}">AIRLOCK</text>`);
  });

  // Mål
  T.drops.forEach(d => o.push(`<rect x="${d.x - d.w / 2}" y="${d.y - d.h / 2}" width="${d.w}" height="${d.h}" rx="4" fill="#3ec5ff" stroke="${ink}" stroke-width="4"/>`));
  o.push(`<text x="${T.axis}" y="1190" font-size="22" text-anchor="middle" fill="${ink}">DROPMÅL-BANK</text>`);
  T.standups.forEach(s => o.push(`<rect x="${s.x - s.w / 2}" y="${s.y - s.h / 2}" width="${s.w}" height="${s.h}" rx="3" fill="#3ddc97" stroke="${ink}" stroke-width="3"/>`));
  T.spinners.forEach(s => o.push(`<rect x="${s.x - s.w / 2}" y="${s.y - s.h / 2}" width="${s.w}" height="${s.h}" rx="4" fill="#8b5cf6" stroke="${ink}" stroke-width="3"/><text x="${s.x}" y="${s.y - 18}" font-size="15" text-anchor="middle" fill="${ink}">SPINNER</text>`));
  T.kickers.forEach(k => o.push(`<rect x="${k.x - k.w / 2}" y="${k.y - k.h / 2}" width="${k.w}" height="${k.h}" rx="6" fill="#ff9f43" stroke="${ink}" stroke-width="4"/><text x="${k.x}" y="${k.y + 40}" font-size="15" text-anchor="middle" fill="${ink}">KICKBACK</text>`));
  T.gates.forEach(g => o.push(`<line x1="${g.p1[0]}" y1="${g.p1[1]}" x2="${g.p2[0]}" y2="${g.p2[1]}" stroke="#ff9f43" stroke-width="7" stroke-linecap="round" stroke-dasharray="14 8"/>`));

  // Lampor
  T.inserts.forEach(i => {
    if (i.shape === 'arrow') o.push(arrow(i.x, i.y, i.r, i.rot, i.color, ink));
    else if (i.shape === 'star') {
      o.push(`<polygon points="${pts(starPoints(i.x, i.y, i.r))}" fill="${i.color}" stroke="${ink}" stroke-width="3"/>`);
      o.push(`<text x="${i.x}" y="${i.y + 62}" font-size="20" text-anchor="middle" fill="${ink}">${i.label}</text>`);
    } else {
      o.push(`<circle cx="${i.x}" cy="${i.y}" r="${i.r}" fill="${i.color}" stroke="${ink}" stroke-width="3"/>`);
      if (i.label) o.push(`<text x="${i.x}" y="${i.y + (i.r > 16 ? 8 : 5)}" font-size="${i.r > 16 ? 22 : 12}" text-anchor="middle" fill="${ink}">${i.label.length <= 2 ? i.label : ''}</text>`);
    }
  });

  // Flippers (vila: fylld, aktiv: streckad kontur)
  T.flippers.forEach(fl => {
    const g = flipperPoly(fl), a = flipperPoly(fl, 'active');
    o.push(`<polygon points="${pts(a.poly)}" fill="none" stroke="#ff5d8f" stroke-width="3" stroke-dasharray="8 6"/>`);
    o.push(`<polygon points="${pts(g.poly)}" fill="#ff5d8f" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`);
    o.push(`<circle cx="${g.pivot[0]}" cy="${g.pivot[1]}" r="9" fill="${ink}"/>`);
  });

  // Startfjäder och kula
  o.push(`<rect x="935" y="2410" width="40" height="40" rx="6" fill="#9aa0b8" stroke="${ink}" stroke-width="4"/>`);
  o.push(`<circle cx="${T.launch.x}" cy="${T.launch.y - 44}" r="${T.ball.r}" fill="#c0c6d8" stroke="${ink}" stroke-width="3"/>`);
  o.push(`<text x="955" y="2400" font-size="20" text-anchor="middle" fill="${ink}">START</text>`);
  o.push(`<text x="472" y="2540" font-size="26" text-anchor="middle" fill="#ff5d8f">▼ DRAIN ▼</text>`);

  // AEGIS-banor
  T.lanes.forEach(l => o.push(`<text x="${l.x}" y="225" font-size="30" text-anchor="middle" fill="${ink}">${l.letter}</text>`));

  // Zonetiketter + teckenförklaring i högermarginalen
  const mx0 = T.size.w + 30;
  o.push(`<text x="${mx0 + 24}" y="70" font-size="40" fill="${ink}">${T.name}</text>`);
  o.push(`<text x="${mx0 + 24}" y="104" font-size="20" fill="${ink}" opacity=".7">${T.size.w} × ${T.size.h} px · kula Ø ${T.ball.r * 2} px</text>`);
  T.zones.forEach((z, i) => {
    o.push(`<rect x="${mx0}" y="${z.y0 + 4}" width="8" height="${z.y1 - z.y0 - 8}" rx="4" fill="${zc[i]}"/>`);
    const off = z.y0 < 100 ? 90 : 0;   // gör plats för titeln
    o.push(`<text x="${mx0 + 24}" y="${z.y0 + 40 + off}" font-size="28" fill="${ink}">${i + 1}. ${z.name}</text>`);
    const words = z.note.split(' ');
    let line = '', y = z.y0 + 72 + off;
    words.forEach(w => {
      if ((line + ' ' + w).length > 30) { o.push(`<text x="${mx0 + 24}" y="${y}" font-size="19" font-weight="600" fill="${ink}" opacity=".8">${line.trim()}</text>`); line = w; y += 26; } else line += ' ' + w;
    });
    o.push(`<text x="${mx0 + 24}" y="${y}" font-size="19" font-weight="600" fill="${ink}" opacity=".8">${line.trim()}</text>`);
  });

  // Teckenförklaring
  const ly = 2150;
  const legend = [
    ['#ffc93c', 'Pop-bumper (3)'], ['#3ec5ff', 'Dropmål (4)'], ['#3ddc97', 'Stand-up-mål (6)'],
    ['#8b5cf6', 'Spinner (2)'], ['#ff5d8f', 'Flipper (4) · streckad = aktiv'], ['#ff9f43', 'Kickback / grind'],
  ];
  o.push(`<text x="${mx0}" y="${ly}" font-size="26" fill="${ink}">Teckenförklaring</text>`);
  legend.forEach(([c, t], i) => {
    o.push(`<circle cx="${mx0 + 12}" cy="${ly + 38 + i * 36}" r="11" fill="${c}" stroke="${ink}" stroke-width="3"/>`);
    o.push(`<text x="${mx0 + 34}" y="${ly + 45 + i * 36}" font-size="20" font-weight="600" fill="${ink}">${t}</text>`);
  });
  o.push('</svg>');
  return o.join('\n');
}

fs.writeFileSync(path.join(outDir, 'aegis5-reference.svg'), reference());
fs.writeFileSync(path.join(outDir, 'aegis5-annotated.svg'), annotated());
console.log('Skrev', path.join(outDir, 'aegis5-reference.svg'), 'och aegis5-annotated.svg');
