// Genererar mock-sprites (SVG) för Station Aegis 5. Storlekarna är 4× spelets ritstorlek.
//   node tools/build-aegis5-sprites.js   → art/mock/*.svg
// PNG-versionerna (genomskinliga och på magenta) renderas med: node tools/render-aegis5-sprites.js
const fs = require('fs');
const path = require('path');
const T = require('../tables/aegis5.js');

const dir = path.join(__dirname, '..', 'art', 'mock');
fs.mkdirSync(dir, { recursive: true });

const S = 4;                       // supersampling mot spelets ritstorlek
const INK = '#0d0c12';
const C = { ochre: '#c8923a', sand: '#d9c39a', rust: '#8a4b2a', cyan: '#3ec5ff', orange: '#ff9f43', pink: '#ff5d8f', green: '#3ddc97' };

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>`;
const f = n => Math.round(n * 10) / 10;

// Gemensamma gradienter (ljus från övre vänstra hörnet)
const gMetal = (id, a = '#f0cf8a', b = '#c8923a', c = '#6b3a22') =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".4" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
const gMetalV = (id, a = '#f0cf8a', b = '#c8923a', c = '#6b3a22') =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
const gSteel = id => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d8798"/><stop offset=".5" stop-color="#4a4452"/><stop offset="1" stop-color="#1d1b22"/></linearGradient>`;
const rivet = (x, y, r = 8) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="#2a2630" stroke="${INK}" stroke-width="3"/><circle cx="${f(x - r * .25)}" cy="${f(y - r * .25)}" r="${r * .45}" fill="${C.sand}" opacity=".6"/>`;

const sprites = {};

// ---------- Bumpers ----------
function bumper(color) {
  const w = 112 * S, c = w / 2;
  const defs = gMetal('m') + gSteel('s') +
    `<radialGradient id="cap" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#a39cb0"/><stop offset=".5" stop-color="#4a4452"/><stop offset="1" stop-color="#15131a"/></radialGradient>`;
  let b = `<circle cx="${c}" cy="${c}" r="${c - 4}" fill="url(#s)" stroke="${INK}" stroke-width="8"/>`;
  b += `<circle cx="${c}" cy="${c}" r="${c * .86}" fill="url(#m)" stroke="${INK}" stroke-width="6"/>`;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; b += rivet(c + Math.cos(a) * c * .72, c + Math.sin(a) * c * .72, 8); }
  b += `<circle cx="${c}" cy="${c}" r="${c * .6}" fill="#15131a" stroke="${INK}" stroke-width="5"/>`;
  b += `<circle cx="${c}" cy="${c}" r="${c * .6}" fill="none" stroke="${color}" stroke-width="22" opacity=".5"/>`;
  b += `<circle cx="${c}" cy="${c}" r="${c * .5}" fill="url(#cap)" stroke="${INK}" stroke-width="6"/>`;
  b += `<ellipse cx="${c - c * .18}" cy="${c - c * .22}" rx="${c * .2}" ry="${c * .12}" transform="rotate(-35 ${c - c * .18} ${c - c * .22})" fill="#fff" opacity=".4"/>`;
  b += `<circle cx="${c}" cy="${c}" r="${c * .17}" fill="url(#m)" stroke="${INK}" stroke-width="4"/><line x1="${c - c * .1}" y1="${c}" x2="${c + c * .1}" y2="${c}" stroke="${INK}" stroke-width="5"/>`;
  return svg(w, w, b, defs);
}
sprites.bumper1 = bumper(C.cyan);
sprites.bumper2 = bumper(C.orange);
sprites.bumper3 = bumper(C.pink);

// ---------- Flippers (pekar åt höger; högra flippern speglas i spelet) ----------
function flipper(len, h0, h1, height) {
  const w = (len + 30) * S, h = height * S, cy = h / 2, px = 15 * S, tx = px + len * S, r0 = h0 * S, r1 = h1 * S;
  const defs = gMetalV('mv') + gMetal('m');
  const poly = `${px},${cy - r0} ${tx},${cy - r1} ${tx},${cy + r1} ${px},${cy + r0}`;
  const shape = (extra) => `<polygon points="${poly}" ${extra}/><circle cx="${px}" cy="${cy}" r="${r0}" ${extra}/><circle cx="${tx}" cy="${cy}" r="${r1}" ${extra}/>`;
  let b = shape(`fill="${INK}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"`);
  b += shape('fill="url(#mv)"');
  // gummikant längs undersidan
  b += `<polygon points="${px},${cy + r0 * .55} ${tx},${cy + r1 * .5} ${tx},${cy + r1} ${px},${cy + r0}" fill="#1d1b22" opacity=".75"/>`;
  // inlägg med cyan list
  b += `<line x1="${px + r0 * 1.5}" y1="${cy - r0 * .1}" x2="${tx - r1 * 1.4}" y2="${cy - r1 * .1}" stroke="${INK}" stroke-width="${S * 5}" stroke-linecap="round"/>`;
  b += `<line x1="${px + r0 * 1.5}" y1="${cy - r0 * .1}" x2="${tx - r1 * 1.4}" y2="${cy - r1 * .1}" stroke="${C.cyan}" stroke-width="${S * 2.4}" stroke-linecap="round" opacity=".85"/>`;
  // ljuskant överst
  b += `<line x1="${px + r0 * .6}" y1="${cy - r0 * .85}" x2="${tx - r1 * .6}" y2="${cy - r1 * .85}" stroke="#fff" stroke-width="${S * 1.2}" opacity=".35" stroke-linecap="round"/>`;
  // pivot med bult
  b += `<circle cx="${px}" cy="${cy}" r="${r0 * .62}" fill="url(#m)" stroke="${INK}" stroke-width="6"/><circle cx="${px}" cy="${cy}" r="${r0 * .28}" fill="#2a2630" stroke="${INK}" stroke-width="4"/>`;
  return svg(w, h, b, defs);
}
sprites.flipper = flipper(165, 15, 9, 40);
sprites.flipper_mid = flipper(120, 13, 8, 34);

// ---------- Slingshot (vänster; höger speglas) ----------
{
  const pts = T.slings[0].pts, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = (Math.max(...xs) - x0) * S, h = (Math.max(...ys) - y0) * S;
  const P = pts.map(p => [(p[0] - x0) * S, (p[1] - y0) * S]);
  const [A, B, Cc] = P;                                          // A–C är sparkytan
  const ins = 14;
  const tri = [[A[0] + ins * 2, A[1] + ins * 2.6], [B[0] + ins * 2, B[1] - ins * 2], [Cc[0] - ins * 3.2, Cc[1] - ins * 1.6]];
  const defs = gMetal('m', '#a56a4a', '#7a4a3a', '#3b2220');
  let b = `<polygon points="${pts2(tri)}" fill="${INK}" stroke="${INK}" stroke-width="30" stroke-linejoin="round"/>`;
  b += `<polygon points="${pts2(tri)}" fill="url(#m)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
  // rubberlist längs sparkytan
  b += `<line x1="${tri[0][0]}" y1="${tri[0][1]}" x2="${tri[2][0]}" y2="${tri[2][1]}" stroke="${INK}" stroke-width="54" stroke-linecap="round"/>`;
  b += `<line x1="${tri[0][0]}" y1="${tri[0][1]}" x2="${tri[2][0]}" y2="${tri[2][1]}" stroke="#2b2d42" stroke-width="40" stroke-linecap="round"/>`;
  b += `<line x1="${tri[0][0]}" y1="${tri[0][1]}" x2="${tri[2][0]}" y2="${tri[2][1]}" stroke="${C.pink}" stroke-width="10" stroke-linecap="round" opacity=".85"/>`;
  [[.25, .45], [.2, .75], [.55, .82]].forEach(([u, v]) => { b += rivet(A[0] + (Cc[0] - A[0]) * u * .5 + 30, A[1] + (B[1] - A[1]) * v, 9); });
  b += `<path d="M${tri[0][0] + 20} ${tri[0][1] + 60} L${tri[1][0] + 20} ${tri[1][1] - 20}" stroke="#000" stroke-opacity=".35" stroke-width="5" fill="none"/>`;
  sprites.sling = svg(w, h, b, defs);
  function pts2(a) { return a.map(p => `${f(p[0])},${f(p[1])}`).join(' '); }
}

// ---------- Mål, spinner, Airlock, kula, plunger ----------
function target(w, h, color, vertical) {
  const W2 = w * S, H2 = h * S, defs = gSteel('s') + gMetal('m');
  let b = `<rect x="3" y="3" width="${W2 - 6}" height="${H2 - 6}" rx="${Math.min(W2, H2) * .22}" fill="url(#s)" stroke="${INK}" stroke-width="7"/>`;
  const m = Math.min(W2, H2) * .26;
  b += vertical
    ? `<rect x="${W2 * .3}" y="${m * 1.4}" width="${W2 * .4}" height="${H2 - m * 2.8}" rx="6" fill="${INK}"/><rect x="${W2 * .36}" y="${m * 1.6}" width="${W2 * .28}" height="${H2 - m * 3.2}" rx="5" fill="${color}" opacity=".85"/>`
    : `<rect x="${m * 1.4}" y="${H2 * .3}" width="${W2 - m * 2.8}" height="${H2 * .4}" rx="6" fill="${INK}"/><rect x="${m * 1.6}" y="${H2 * .36}" width="${W2 - m * 3.2}" height="${H2 * .28}" rx="5" fill="${color}" opacity=".85"/>`;
  b += vertical
    ? `<rect x="6" y="6" width="${W2 - 12}" height="${H2 * .09}" fill="url(#m)" opacity=".8"/><rect x="6" y="${H2 - 6 - H2 * .09}" width="${W2 - 12}" height="${H2 * .09}" fill="url(#m)" opacity=".8"/>`
    : `<rect x="6" y="6" width="${W2 * .06}" height="${H2 - 12}" fill="url(#m)" opacity=".8"/><rect x="${W2 - 6 - W2 * .06}" y="6" width="${W2 * .06}" height="${H2 - 12}" fill="url(#m)" opacity=".8"/>`;
  return svg(W2, H2, b, defs);
}
sprites.drop = target(56, 16, C.cyan, false);
sprites.standup = target(14, 44, C.green, true);

{
  const w = 70 * S, h = 16 * S, defs = gMetal('m') + gSteel('s');
  let b = `<rect x="6" y="${h * .25}" width="${w * .1}" height="${h * .5}" rx="6" fill="url(#s)" stroke="${INK}" stroke-width="5"/><rect x="${w - 6 - w * .1}" y="${h * .25}" width="${w * .1}" height="${h * .5}" rx="6" fill="url(#s)" stroke="${INK}" stroke-width="5"/>`;
  b += `<line x1="${w * .08}" y1="${h / 2}" x2="${w * .92}" y2="${h / 2}" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><line x1="${w * .08}" y1="${h / 2}" x2="${w * .92}" y2="${h / 2}" stroke="url(#m)" stroke-width="12" stroke-linecap="round"/>`;
  b += `<rect x="${w * .16}" y="${h * .12}" width="${w * .68}" height="${h * .76}" rx="8" fill="url(#m)" stroke="${INK}" stroke-width="6"/><line x1="${w * .2}" y1="${h * .3}" x2="${w * .8}" y2="${h * .3}" stroke="#fff" stroke-width="3" opacity=".4"/>`;
  b += `<circle cx="${w * .5}" cy="${h / 2}" r="${h * .14}" fill="#2a2630" stroke="${INK}" stroke-width="3"/>`;
  sprites.spinner = svg(w, h, b, defs);
}

{
  const w = 99 * S, c = w / 2, defs = gMetal('m') + `<pattern id="hz" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="48" height="48" fill="#e8b630"/><rect width="24" height="48" fill="#15131a"/></pattern>` +
    `<radialGradient id="pit" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".7" stop-color="#0a0910"/><stop offset="1" stop-color="#26232b"/></radialGradient>`;
  let b = `<circle cx="${c}" cy="${c}" r="${c - 4}" fill="${INK}"/>`;
  b += `<circle cx="${c}" cy="${c}" r="${c * .88}" fill="none" stroke="url(#hz)" stroke-width="${c * .2}"/>`;
  b += `<circle cx="${c}" cy="${c}" r="${c * .72}" fill="url(#m)" stroke="${INK}" stroke-width="7"/>`;
  b += `<circle cx="${c}" cy="${c}" r="${c * .6}" fill="url(#pit)" stroke="${INK}" stroke-width="6"/>`;
  for (let k = 0; k < 8; k++) {                                   // irisblad
    const a = k * Math.PI / 4;
    const p = [[0, 0], [Math.cos(a - .26) * c * .6, Math.sin(a - .26) * c * .6], [Math.cos(a + .26) * c * .6, Math.sin(a + .26) * c * .6]].map(q => `${f(c + q[0])},${f(c + q[1])}`).join(' ');
    b += `<polygon points="${p}" fill="#2a2630" stroke="${INK}" stroke-width="4" opacity=".9"/>`;
  }
  b += `<circle cx="${c}" cy="${c}" r="${c * .24}" fill="#000"/>`;
  sprites.airlock = svg(w, w, b, defs);
}

{
  const w = 44 * S, c = w / 2;
  const defs = `<radialGradient id="ball" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#d6dbe8"/><stop offset=".6" stop-color="#7c8398"/><stop offset=".9" stop-color="#2b2d3d"/><stop offset="1" stop-color="#14141b"/></radialGradient>`;
  let b = `<circle cx="${c}" cy="${c}" r="${c - 3}" fill="url(#ball)" stroke="${INK}" stroke-width="5"/>`;
  b += `<ellipse cx="${c + c * .18}" cy="${c + c * .42}" rx="${c * .5}" ry="${c * .22}" fill="${C.orange}" opacity=".25"/>`;
  b += `<ellipse cx="${c + c * .2}" cy="${c - c * .5}" rx="${c * .38}" ry="${c * .12}" fill="${C.cyan}" opacity=".3"/>`;
  b += `<ellipse cx="${c - c * .34}" cy="${c - c * .4}" rx="${c * .16}" ry="${c * .1}" transform="rotate(-35 ${c - c * .34} ${c - c * .4})" fill="#fff" opacity=".9"/>`;
  sprites.ball = svg(w, w, b, defs);
}

{
  const w = 44 * S, h = 64 * S, c = w / 2, defs = gMetalV('m') + gSteel('s');
  let b = `<rect x="${c - 14}" y="${h * .38}" width="28" height="${h * .62}" rx="8" fill="url(#s)" stroke="${INK}" stroke-width="6"/>`;
  b += `<rect x="${c - 30}" y="${h * .2}" width="60" height="${h * .22}" rx="12" fill="url(#m)" stroke="${INK}" stroke-width="7"/>`;
  b += `<ellipse cx="${c}" cy="${h * .1}" rx="${c * .8}" ry="${h * .1}" fill="url(#m)" stroke="${INK}" stroke-width="7"/><ellipse cx="${c - 14}" cy="${h * .08}" rx="${c * .3}" ry="${h * .035}" fill="#fff" opacity=".4"/>`;
  b += `<rect x="${c - 8}" y="${h * .28}" width="16" height="${h * .09}" rx="4" fill="${C.cyan}" opacity=".7"/>`;
  sprites.plunger = svg(w, h, b, defs);
}

// ---------- Skriv filer och manifest ----------
const manifest = {};
for (const [name, s] of Object.entries(sprites)) {
  fs.writeFileSync(path.join(dir, name + '.svg'), s);
  const m = s.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
  manifest[name] = { w: +m[1], h: +m[2], gameW: +m[1] / S, gameH: +m[2] / S };
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Skrev', Object.keys(sprites).length, 'sprites till art/mock/');
