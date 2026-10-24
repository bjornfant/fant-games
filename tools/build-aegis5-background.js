// Renderar en layoutriktig bakgrunds-mockup för Station Aegis 5 från tables/aegis5.js.
//   node tools/build-aegis5-background.js  → art/aegis5-background-mock.svg  (PNG renderas separat)
// Bilden är ett tomt bord: väggar, plåtpaneler, uttag för lampor och gravyrer. Inga bumpers, flippers eller ramper.
const fs = require('fs');
const path = require('path');
const T = require('../tables/aegis5.js');

const W = T.size.w, H = T.size.h;
const out = path.join(__dirname, '..', 'art');
fs.mkdirSync(out, { recursive: true });

// Seedad slump så att bilden blir densamma varje gång.
let seed = 5;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const between = (a, b) => a + (b - a) * rnd();
const f = n => Math.round(n * 10) / 10;
const pts = a => a.map(p => `${f(p[0])},${f(p[1])}`).join(' ');

const C = { ink: '#0d0c12', basalt: '#2a2630', basalt2: '#221f27', ochre: '#c8923a', rust: '#8a4b2a', sand: '#d9c39a', cyan: '#3ec5ff', orange: '#ff9f43' };

const o = [];
const add = s => o.push(s);

add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
add(`<defs>
  <clipPath id="field"><path d="M30 540 A482 482 0 0 1 994 540 L994 ${H} L30 ${H} Z"/></clipPath>
  <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4a4452"/><stop offset=".45" stop-color="#3b3742"/><stop offset="1" stop-color="#443438"/>
  </linearGradient>
  <radialGradient id="vig" cx=".46" cy=".5" r=".75">
    <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/>
  </radialGradient>
  <linearGradient id="light" x1="0" y1="0" x2=".8" y2=".5">
    <stop offset="0" stop-color="#ffe6b8" stop-opacity=".22"/><stop offset=".6" stop-color="#ffe6b8" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="reactor" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${C.cyan}" stop-opacity=".30"/><stop offset=".6" stop-color="${C.cyan}" stop-opacity=".10"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="hazard" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="40" height="40" fill="#e8b630"/><rect width="20" height="40" fill="#15131a"/>
  </pattern>
  <pattern id="grate" width="22" height="22" patternUnits="userSpaceOnUse">
    <rect width="22" height="22" fill="#0b0a0e"/><rect x="3" y="3" width="16" height="16" rx="3" fill="#1a171d"/>
  </pattern>
  <filter id="blur8" color-interpolation-filters="sRGB" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="blur3" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="blotch" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".004 .006" numOctaves="4" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.3 -0.4" result="a"/>
    <feComposite in="SourceGraphic" in2="a" operator="in"/>
  </filter>
  <filter id="grain" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.18"/>
  </filter>
  <filter id="cel" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feComponentTransfer><feFuncR type="discrete" tableValues="0 .06 .12 .19 .27 .36 .45 .55 .65 .76 .88 1"/><feFuncG type="discrete" tableValues="0 .06 .12 .19 .27 .36 .45 .55 .65 .76 .88 1"/><feFuncB type="discrete" tableValues="0 .06 .12 .19 .27 .36 .45 .55 .65 .76 .88 1"/></feComponentTransfer>
  </filter>
</defs>`);

add(`<rect width="${W}" height="${H}" fill="#07060a"/>`);
add('<g>');
add('<g clip-path="url(#field)">');

// ---------- Basplåt ----------
add(`<rect width="${W}" height="${H}" fill="url(#base)"/>`);

// Paneler med skarvar, fasade kanter och nitar
const xs = [30]; while (xs[xs.length - 1] < W - 150) xs.push(xs[xs.length - 1] + between(190, 300)); xs.push(W + 10);
const ys = [0]; while (ys[ys.length - 1] < H - 120) ys.push(ys[ys.length - 1] + between(170, 260)); ys.push(H + 10);
const tints = [C.ochre, C.rust, C.sand, '#4a5568', '#000000', '#000000'];
for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
  const x = xs[i], y = ys[j], w = xs[i + 1] - x, h = ys[j + 1] - y;
  add(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${tints[Math.floor(rnd() * tints.length)]}" opacity="${f(between(0.06, 0.2))}"/>`);
  add(`<rect x="${f(x + 2)}" y="${f(y + 2)}" width="${f(w - 4)}" height="${f(h - 4)}" fill="none" stroke="#000" stroke-width="4" opacity=".55"/>`);
  add(`<path d="M${f(x + 5)} ${f(y + h - 5)} L${f(x + 5)} ${f(y + 5)} L${f(x + w - 5)} ${f(y + 5)}" fill="none" stroke="#fff" stroke-width="2" opacity=".10"/>`);
  for (const [rx, ry] of [[x + 16, y + 16], [x + w - 16, y + 16], [x + 16, y + h - 16], [x + w - 16, y + h - 16]]) {
    add(`<circle cx="${f(rx)}" cy="${f(ry)}" r="5" fill="#15131a" opacity=".85"/><circle cx="${f(rx - 1)}" cy="${f(ry - 1)}" r="3" fill="${C.sand}" opacity=".35"/>`);
  }
}

// Oxid- och rostfläckar (mer vid kanterna än i mitten)
add(`<g filter="url(#blotch)" opacity=".45"><rect width="${W}" height="${H}" fill="#000"/></g>`);
add(`<g filter="url(#blotch)" opacity=".10" transform="translate(300 400)"><rect width="${W}" height="${H}" fill="${C.rust}"/></g>`);

// ---------- Gravyrer ----------
// Reaktorn bakom bumperna
const rcx = 472, rcy = 510;
add(`<circle cx="${rcx}" cy="${rcy}" r="300" fill="url(#reactor)"/>`);
[110, 165, 215, 265].forEach((r, k) => add(`<circle cx="${rcx}" cy="${rcy}" r="${r}" fill="none" stroke="${C.cyan}" stroke-width="${k % 2 ? 3 : 6}" opacity="${k % 2 ? .28 : .38}" ${k === 1 ? 'stroke-dasharray="18 12"' : ''}/>`));
for (let k = 0; k < 12; k++) {
  const a = k * Math.PI / 6;
  add(`<line x1="${f(rcx + Math.cos(a) * 118)}" y1="${f(rcy + Math.sin(a) * 118)}" x2="${f(rcx + Math.cos(a) * 262)}" y2="${f(rcy + Math.sin(a) * 262)}" stroke="${C.cyan}" stroke-width="3" opacity=".22"/>`);
}
add(`<text font-family="Impact, Arial Black, sans-serif" font-size="34" letter-spacing="10" fill="${C.ochre}" opacity=".5"><textPath href="#titleArc" startOffset="50%" text-anchor="middle">STATION AEGIS 5</textPath></text>`);
add(`<path id="titleArc" d="M92 540 A420 420 0 0 1 932 540" fill="none"/>`);

// Orbit-banor
[[36, 104], [840, 912]].forEach(([x0, x1]) => {
  add(`<rect x="${x0}" y="700" width="${x1 - x0}" height="600" fill="#000" opacity=".30"/>`);
  for (let y = 780; y < 1280; y += 120) add(`<path d="M${(x0 + x1) / 2 - 18} ${y + 18} L${(x0 + x1) / 2} ${y - 10} L${(x0 + x1) / 2 + 18} ${y + 18}" fill="none" stroke="${C.ochre}" stroke-width="6" opacity=".45"/>`);
});

// Startränna
add(`<rect x="920" y="1100" width="74" height="1366" fill="#000" opacity=".35"/>`);
for (let y = 1250; y < 2400; y += 150) add(`<path d="M938 ${y + 22} L957 ${y - 6} L976 ${y + 22}" fill="none" stroke="#e8b630" stroke-width="7" opacity=".4"/>`);

// Skuggor under ramperna (själva ramperna ritas i spelet)
T.ramps.forEach(r => add(`<polyline points="${pts(r.path)}" fill="none" stroke="#000" stroke-width="${r.width + 36}" stroke-linecap="round" stroke-linejoin="round" opacity=".5" filter="url(#blur8)" transform="translate(8 10)"/>`));
T.ramps.forEach(r => add(`<polyline points="${pts(r.path)}" fill="none" stroke="${C.ochre}" stroke-width="${r.width + 22}" stroke-linecap="round" stroke-linejoin="round" opacity=".16"/>`));

// Airlock: ring med hasardrand
T.saucers.forEach(s => {
  add(`<circle cx="${s.x}" cy="${s.y}" r="78" fill="#000" opacity=".4" filter="url(#blur8)"/>`);
  add(`<circle cx="${s.x}" cy="${s.y}" r="66" fill="none" stroke="url(#hazard)" stroke-width="18"/>`);
  add(`<circle cx="${s.x}" cy="${s.y}" r="56" fill="none" stroke="${C.ink}" stroke-width="5"/>`);
  add(`<circle cx="${s.x}" cy="${s.y}" r="48" fill="#050408" stroke="${C.ochre}" stroke-width="5"/>`);
  add(`<text x="${s.x}" y="${s.y - 92}" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="22" letter-spacing="4" fill="${C.ochre}" opacity=".6">AIRLOCK</text>`);
});

// Dropmålsbank: urtag
add(`<rect x="330" y="1128" width="284" height="44" rx="8" fill="#000" opacity=".5"/><rect x="330" y="1128" width="284" height="44" rx="8" fill="none" stroke="${C.ochre}" stroke-width="4" opacity=".6"/>`);

// Stand-up-mål: urtag längs väggarna
T.standups.forEach(s => add(`<rect x="${s.x - 16}" y="${s.y - 28}" width="${s.side === 'L' ? 40 : 40}" height="56" rx="6" fill="#000" opacity=".4" transform="translate(${s.side === 'L' ? 0 : -24} 0)"/>`));

// Slingshots: urtag
T.slings.forEach(s => add(`<polygon points="${pts(s.pts)}" fill="#000" opacity=".4" filter="url(#blur3)" transform="translate(8 10)"/>`));

// Flipperfästen
T.flippers.forEach(fl => add(`<circle cx="${fl.pivot[0]}" cy="${fl.pivot[1]}" r="${fl.group === 'mid' ? 26 : 30}" fill="#000" opacity=".45"/><circle cx="${fl.pivot[0]}" cy="${fl.pivot[1]}" r="${fl.group === 'mid' ? 26 : 30}" fill="none" stroke="${C.ochre}" stroke-width="5" opacity=".7"/>`));

// Hasardband och grillat avlopp längst ner
add(`<rect x="36" y="2392" width="880" height="34" fill="url(#hazard)" opacity=".62"/>`);
add(`<rect x="30" y="2426" width="964" height="${H - 2426}" fill="url(#grate)"/>`);
add(`<text x="472" y="2500" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="34" letter-spacing="14" fill="#c4452f" opacity=".7">DRAIN</text>`);

// Lamputtag (sockel för varje insert)
T.inserts.forEach(i => {
  if (i.shape === 'arrow') {
    add(`<polygon points="${-i.r - 5},${-i.r * .7 - 5} ${i.r + 7},0 ${-i.r - 5},${i.r * .7 + 5} ${-i.r * .4 - 4},0" fill="#000" opacity=".5" stroke="${C.ochre}" stroke-width="3" transform="translate(${i.x} ${i.y}) rotate(${f(i.rot)})"/>`);
  } else if (i.shape === 'star') {
    add(`<circle cx="${i.x}" cy="${i.y}" r="64" fill="none" stroke="${C.ochre}" stroke-width="6" opacity=".6"/><circle cx="${i.x}" cy="${i.y}" r="54" fill="none" stroke="${C.ochre}" stroke-width="2" stroke-dasharray="10 8" opacity=".6"/>`);
    add(`<polygon points="${[...Array(10)].map((_, k) => { const rr = k % 2 ? i.r * .45 : i.r, a = -Math.PI / 2 + k * Math.PI / 5; return `${f(i.x + Math.cos(a) * rr)},${f(i.y + Math.sin(a) * rr)}`; }).join(' ')}" fill="#000" opacity=".5" stroke="${C.ochre}" stroke-width="3"/>`);
  } else {
    add(`<circle cx="${i.x}" cy="${i.y}" r="${i.r + 7}" fill="#000" opacity=".55"/><circle cx="${i.x}" cy="${i.y}" r="${i.r + 7}" fill="none" stroke="${C.ochre}" stroke-width="3" opacity=".75"/>`);
  }
});
// AEGIS-bokstäver ovanför banorna
T.lanes.forEach(l => add(`<text x="${l.x}" y="214" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="44" fill="${C.ochre}" opacity=".6">${l.letter}</text>`));

// Repor och slitage
for (let k = 0; k < 160; k++) {
  const x = between(40, W - 40), y = between(20, H - 20), l = between(8, 60), a = between(-.5, .5);
  add(`<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * l)}" y2="${f(y + Math.sin(a) * l)}" stroke="${rnd() > .5 ? '#fff' : '#000'}" stroke-width="${f(between(1, 2.4))}" opacity="${f(between(.06, .2))}"/>`);
}

// ---------- Väggar (matchar fysiken) ----------
const wallSet = T.walls.filter(w => w.kind !== 'post');
add(`<g filter="url(#blur8)" opacity=".65" transform="translate(7 9)"><path d="M30 540 A482 482 0 0 1 994 540" fill="none" stroke="#000" stroke-width="20"/>` +
  wallSet.map(w => `<polyline points="${pts(w.pts)}" fill="${w.closed ? '#000' : 'none'}" stroke="#000" stroke-width="${w.thick + 8}" stroke-linecap="round"/>`).join('') + '</g>');
const rim = (d, wdt, closed) => {
  add(`<${closed ? 'polygon' : 'polyline'} points="${d}" fill="${closed ? '#7a5a2a' : 'none'}" stroke="${C.ink}" stroke-width="${wdt + 8}" stroke-linecap="round" stroke-linejoin="round"/>`);
  add(`<${closed ? 'polygon' : 'polyline'} points="${d}" fill="${closed ? '#8a6a34' : 'none'}" stroke="${C.ochre}" stroke-width="${wdt}" stroke-linecap="round" stroke-linejoin="round"/>`);
  add(`<${closed ? 'polygon' : 'polyline'} points="${d}" fill="none" stroke="${C.sand}" stroke-width="${Math.max(2, wdt * .22)}" stroke-linecap="round" stroke-linejoin="round" opacity=".5" transform="translate(-1.5 -1.5)"/>`);
};
add(`<path d="M30 540 A482 482 0 0 1 994 540" fill="none" stroke="${C.ink}" stroke-width="22"/>`);
add(`<path d="M30 540 A482 482 0 0 1 994 540" fill="none" stroke="${C.ochre}" stroke-width="14"/>`);
add(`<path d="M30 540 A482 482 0 0 1 994 540" fill="none" stroke="${C.sand}" stroke-width="3" opacity=".5" transform="translate(-1.5 -1.5)"/>`);
wallSet.forEach(w => rim(pts(w.pts), w.thick + (w.kind === 'outer' ? 2 : 0), w.closed));
T.walls.filter(w => w.kind === 'post').forEach(w => rim(pts(w.pts), w.thick, false));
T.posts.forEach(p => add(`<circle cx="${p.x}" cy="${p.y}" r="${p.r + 4}" fill="${C.ink}"/><circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${C.sand}"/><circle cx="${p.x - 3}" cy="${p.y - 3}" r="${p.r * .4}" fill="#fff" opacity=".6"/>`));

add('</g>');            // clip
add('</g>');            // cel

// ---------- Ljus, vinjett och korn (ovanpå allt) ----------
add('<g clip-path="url(#field)">');
add(`<rect width="${W}" height="${H}" fill="url(#light)"/>`);
add(`<rect width="${W}" height="${H}" fill="url(#vig)"/>`);
add(`<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".35"/>`);
add('</g>');
add('</svg>');

fs.writeFileSync(path.join(out, 'aegis5-background-mock.svg'), o.join('\n'));
console.log('Skrev art/aegis5-background-mock.svg');
