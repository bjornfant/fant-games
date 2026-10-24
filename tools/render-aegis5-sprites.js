// Renderar art/mock/*.svg till PNG:
//   art/mock/<namn>.png           genomskinlig (till spelet, kopieras till art/source/)
//   art/mock/magenta/<namn>.png   på platt magenta (till Midjourney)
//   art/mock/contact-sheet.png    översikt
// Kräver Playwright (npm i -D playwright) och en installerad Chromium.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const dir = path.join(__dirname, '..', 'art', 'mock');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
fs.mkdirSync(path.join(dir, 'magenta'), { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, m] of Object.entries(manifest)) {
    const svg = fs.readFileSync(path.join(dir, name + '.svg'), 'utf8');
    await page.setViewportSize({ width: Math.ceil(m.w), height: Math.ceil(m.h) });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await page.screenshot({ path: path.join(dir, name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: m.w, height: m.h } });
    await page.setContent(`<style>html,body{margin:0;background:#ff00ff}svg{display:block}</style>${svg}`);
    await page.screenshot({ path: path.join(dir, 'magenta', name + '.png'), clip: { x: 0, y: 0, width: m.w, height: m.h } });
  }
  // Översikt
  const cards = Object.entries(manifest).map(([name, m]) => {
    const scale = Math.min(1, 360 / Math.max(m.w, m.h) * (m.w > 400 ? 1 : 1));
    return `<figure style="margin:0;text-align:center"><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, name + '.png')).toString('base64')}" style="width:${Math.round(m.w * scale)}px;height:${Math.round(m.h * scale)}px;display:block;margin:auto"><figcaption style="font:600 18px system-ui;color:#fff;margin-top:8px">${name}<br><span style="font-weight:400;font-size:14px;opacity:.85">${m.gameW}×${m.gameH} px i spelet</span></figcaption></figure>`;
  }).join('');
  await page.setViewportSize({ width: 1700, height: 1200 });
  await page.setContent(`<body style="margin:0;background:#ff00ff;padding:30px;display:flex;flex-wrap:wrap;gap:36px;align-items:flex-end">${cards}</body>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, 'contact-sheet.png'), fullPage: true });
  await browser.close();
  console.log('Renderade', Object.keys(manifest).length, 'sprites');
})();
