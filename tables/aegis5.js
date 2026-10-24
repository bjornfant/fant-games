// Station Aegis 5 – bordslayout.
// Koordinater i pixlar: bordet är 1024 × 2560, y växer nedåt, bollens radie är 22.
// Det nedre bordet är symmetriskt kring x = 472 (mellan vänster vägg och startrännans vägg).
(function (root, factory) {
  const table = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = table;
  else root.TableAegis5 = table;
})(typeof self !== 'undefined' ? self : this, () => {
  const W = 1024, H = 2560, R = 22, CX = 472;
  const mx = x => 2 * CX - x;
  const mp = ([x, y]) => [mx(x), y];

  const dome = { cx: 512, cy: 540, r: 482 };

  // ---------- Väggar (linjer och polygoner som bollen studsar mot) ----------
  const walls = [];
  const wall = (id, pts, o = {}) => walls.push({ id, pts, thick: o.thick ?? 8, closed: !!o.closed, kind: o.kind || 'wall' });
  const pairWall = (id, pts, o) => { wall(id + 'L', pts, o); wall(id + 'R', pts.map(mp), o); };

  wall('leftWall', [[30, 540], [30, H]], { thick: 12, kind: 'outer' });
  wall('rightWall', [[994, 540], [994, H]], { thick: 12, kind: 'outer' });
  wall('laneWall', [[915, 1100], [915, 2440]], { thick: 10, kind: 'outer' });
  wall('laneFloor', [[915, 2470], [994, 2470]], { thick: 8, kind: 'outer' });
  pairWall('orbitGuide', [[108, 700], [108, 1300]]);
  pairWall('midHousing', [[30, 1490], [116, 1515], [116, 1545], [30, 1600]], { closed: true });
  pairWall('outlaneGuide', [[110, 1950], [110, 2090]]);
  pairWall('incline', [[110, 2090], [262, 2200]], { thick: 10 });
  for (let i = 0; i < 6; i++) wall('lanePost' + i, [[234 + 111 * i, 230], [234 + 111 * i, 335]], { thick: 8, kind: 'post' });

  // ---------- Fasta stolpar ----------
  const posts = [
    { id: 'postL', x: 200, y: 860, r: 14 },
    { id: 'postR', x: 744, y: 860, r: 14 },
  ];

  // ---------- Aktiva element ----------
  const bumpers = [
    { id: 'bumper1', x: 330, y: 470, r: 46, color: '#ffc93c', points: 100 },
    { id: 'bumper2', x: 614, y: 470, r: 46, color: '#3ec5ff', points: 100 },
    { id: 'bumper3', x: 472, y: 590, r: 46, color: '#ff5d8f', points: 100 },
  ];

  const saucers = [{ id: 'airlock', x: 472, y: 790, r: 38, role: 'Multiball-lås' }];

  const spinners = [
    { id: 'spinnerL', x: 69, y: 980, w: 70, h: 8 },
    { id: 'spinnerR', x: mx(69), y: 980, w: 70, h: 8 },
  ];

  const kickers = [{ id: 'kickback', x: 70, y: 2010, w: 60, h: 34, role: 'Kickback i vänster utlane' }];

  const gates = [{ id: 'laneGate', p1: [915, 1090], p2: [994, 1030], role: 'Enkelriktad grind ut från startrännan' }];

  const drops = [];
  for (let i = 0; i < 4; i++) drops.push({ id: 'drop' + (i + 1), x: 367 + 70 * i, y: 1150, w: 56, h: 16, points: 500 });

  const standups = [];
  [1700, 1760, 1820].forEach((y, i) => {
    standups.push({ id: 'standL' + (i + 1), x: 37, y, w: 14, h: 44, side: 'L' });
    standups.push({ id: 'standR' + (i + 1), x: mx(37), y, w: 14, h: 44, side: 'R' });
  });

  const slings = [
    { id: 'slingL', pts: [[190, 1860], [190, 2020], [300, 2070]], kick: [[190, 1860], [300, 2070]] },
    { id: 'slingR', pts: [[754, 1860], [754, 2020], [644, 2070]], kick: [[754, 1860], [644, 2070]] },
  ];

  const flippers = [
    { id: 'flipLowL', group: 'lower', side: 'L', pivot: [262, 2200], len: 165, rest: 0.5, active: -0.45 },
    { id: 'flipLowR', group: 'lower', side: 'R', pivot: [682, 2200], len: 165, rest: 0.5, active: -0.45 },
    { id: 'flipMidL', group: 'mid', side: 'L', pivot: [112, 1520], len: 120, rest: 0.45, active: -0.5 },
    { id: 'flipMidR', group: 'mid', side: 'R', pivot: [832, 1520], len: 120, rest: 0.45, active: -0.5 },
  ];

  // Ramper: ordnade punkter från ingång till utgång.
  const rampL = [[270, 1400], [254, 1260], [254, 1010], [330, 850], [360, 700]];
  const ramps = [
    { id: 'rampDocking', name: 'Dockningsrampen', width: 84, path: rampL, color: '#ff5d8f' },
    { id: 'rampReactor', name: 'Reaktorrampen', width: 84, path: rampL.map(mp), color: '#3ec5ff' },
  ];

  const lanes = ['A', 'E', 'G', 'I', 'S'].map((ch, i) => ({ id: 'lane' + ch, letter: ch, x: 289.5 + 111 * i, y0: 235, y1: 330 }));

  // ---------- Lampor (inserts) ----------
  const inserts = [];
  const ins = (id, x, y, color, label, shape = 'round', r = 14, rot = 0) => inserts.push({ id, x, y, r, color, label, shape, rot });
  lanes.forEach(l => ins('light' + l.letter, l.x, 285, '#3ec5ff', l.letter, 'round', 18));
  [0, 1, 2].forEach(i => ins('lock' + (i + 1), 412 + 60 * i, 870, '#ff9f43', 'LOCK ' + (i + 1), 'round', 14));
  ramps.forEach(rp => {
    for (let i = 0; i < 3; i++) {
      const [a, b] = [rp.path[i], rp.path[i + 1]];
      const rot = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      ins(rp.id + 'Arrow' + (i + 1), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, rp.color, '', 'arrow', 16, rot);
    }
  });
  drops.forEach((d, i) => ins('dropLight' + (i + 1), d.x, 1112, '#ffc93c', 'D' + (i + 1), 'round', 11));
  [1700, 1760, 1820].forEach((y, i) => {
    ins('standLightL' + (i + 1), 80, y, '#3ddc97', '', 'round', 11);
    ins('standLightR' + (i + 1), mx(80), y, '#3ddc97', '', 'round', 11);
  });
  ins('inlaneL1', 150, 1990, '#ffc93c', 'IN', 'round', 12); ins('inlaneL2', 150, 2050, '#ffc93c', '', 'round', 12);
  ins('inlaneR1', mx(150), 1990, '#ffc93c', 'IN', 'round', 12); ins('inlaneR2', mx(150), 2050, '#ffc93c', '', 'round', 12);
  ins('kickbackLight', 70, 1950, '#ff5d8f', 'KICK', 'round', 14);
  ins('saverLight', mx(70), 1950, '#ff5d8f', 'SAVE', 'round', 14);
  ins('orbitLightL', 69, 1180, '#8b5cf6', '', 'round', 12); ins('orbitLightR', mx(69), 1180, '#8b5cf6', '', 'round', 12);
  ins('spinLightL', 69, 900, '#8b5cf6', '', 'round', 12); ins('spinLightR', mx(69), 900, '#8b5cf6', '', 'round', 12);
  ins('emblem', 472, 1560, '#ff9f43', 'AEGIS 5', 'star', 34);
  ['2X', '3X', '4X', '5X', '6X'].forEach((t, i) => ins('bonus' + t, 372 + 50 * i, 1900, '#ff9f43', t, 'round', 14));
  ins('jackpotL', 360, 650, '#ffc93c', 'JACKPOT', 'round', 14);
  ins('jackpotR', mx(360), 650, '#ffc93c', 'JACKPOT', 'round', 14);

  // ---------- Zoner (för konstbrief och kamera) ----------
  const zones = [
    { id: 'dome', name: 'Reaktorkupolen', y0: 40, y1: 560, note: 'AEGIS-banor och tre pop-bumpers kring en glödande reaktorkärna' },
    { id: 'bridge', name: 'Kommandobryggan', y0: 560, y1: 1000, note: 'Rampernas utgångar, Airlock-låset och orbit-spinners' },
    { id: 'bulkhead', name: 'Skottdäcket', y0: 1000, y1: 1400, note: 'Dropmål-bank, rampingångar och orbit-banor' },
    { id: 'hangar', name: 'Hangaren', y0: 1400, y1: 1880, note: 'Mid-flippers, emblem och stand-up-mål' },
    { id: 'drain', name: 'Nödslussen', y0: 1880, y1: 2480, note: 'Slingshots, in- och utlanes, kickback och nedre flippers' },
  ];

  return {
    name: 'Station Aegis 5',
    size: { w: W, h: H },
    ball: { r: R },
    axis: CX,
    dome, walls, posts, bumpers, saucers, spinners, kickers, gates, drops, standups, slings, flippers, ramps, lanes, inserts, zones,
    launch: { x: 955, y: 2448 },
    drainY: 2490,
    camera: { viewH: 1400 },
  };
});
