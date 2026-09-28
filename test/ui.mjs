// Test de interfață (Chromium fără ecran, telefon 390×844) cu date de test (GASFIND_MOCK=1).
// Rulare: GLYPHS=/cale/catre/0-255.pbf node test/ui.mjs  (necesită pachetul playwright)
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = process.env.OUT || 'test-output';
mkdirSync(OUT, { recursive: true });
const PORT = 3123;
const BASE = `http://localhost:${PORT}`;
const glyph = readFileSync(process.env.GLYPHS);

const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), GASFIND_MOCK: '1' }, stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes('rulează') && r()));

const results = [];
const check = (name, cond, extra = '') => { results.push([cond ? 'OK ' : 'ERR', name, extra]); };

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    geolocation: { latitude: 47.6514, longitude: 26.2556 }, permissions: ['geolocation'], locale: 'ro-RO',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.route((u) => u.pathname === '/__style.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({
    version: 8, glyphs: `http://127.0.0.1:${PORT}/__glyphs/{fontstack}/{range}.pbf`, sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e8eef0' } }],
  }) }));
  await page.route((u) => u.pathname.startsWith('/__glyphs/'), (r) => r.fulfill({ contentType: 'application/x-protobuf', body: glyph }));

  await page.goto(`${BASE}/?style=/__style.json`);
  await page.waitForFunction(() => window.__gasfind && window.__gasfind.state.user, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__gasfind.map.jumpTo({ zoom: 11.5 }));
  await page.waitForFunction(() => window.__gasfind.state.stations.size > 60 && !window.__gasfind.state.active, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => ({ n: window.__gasfind.state.stations.size, zoom: window.__gasfind.map.getZoom(), center: window.__gasfind.map.getCenter(), user: window.__gasfind.state.user }));
  check('stații încărcate (mock)', st.n > 20, JSON.stringify(st));
  check('centrat pe utilizator', st.user && Math.abs(st.center.lat - 47.65) < 0.2, JSON.stringify(st.center));
  check('chip Motorină activ implicit', await page.getAttribute('.chip[data-fuel="diesel"]', 'aria-checked') === 'true');
  await page.screenshot({ path: `${OUT}/1-harta.png` });

  const pills = await page.evaluate(() => window.__gasfind.map.queryRenderedFeatures({ layers: ['st-pill'] }).length);
  check('etichete de preț desenate', pills > 5, `pills=${pills}`);

  // Atingem cea mai ieftină stație vizibilă
  const target = await page.evaluate(() => {
    const { map } = window.__gasfind;
    const f = map.queryRenderedFeatures({ layers: ['st-pill'] }).sort((a, b) => a.properties.r - b.properties.r)[0];
    const p = map.project(f.geometry.coordinates);
    return { id: f.properties.id, x: p.x, y: p.y, lbl: f.properties.lbl, c: f.properties.c };
  });
  check('cea mai ieftină e verde', target.c === 0, JSON.stringify(target));
  await page.touchscreen.tap(target.x, target.y - 12);
  await page.waitForSelector('#card:not([hidden])', { timeout: 5000 });
  await page.waitForTimeout(350);
  const card = await page.evaluate(() => ({ title: document.querySelector('#card-title').textContent, href: document.querySelector('#card-nav').href, prices: document.querySelectorAll('#card-prices .price').length, sel: document.querySelector('#card-prices .price.sel .v')?.textContent }));
  check('fișa stației se deschide', card.title.length > 0, card.title);
  check('link Google Maps corect', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=[\d.-]+,[\d.-]+&travelmode=driving&dir_action=navigate$/.test(card.href), card.href);
  check('prețul selectat e evidențiat', Boolean(card.sel) && card.sel.startsWith(target.lbl), `${card.sel} vs ${target.lbl}`);
  await page.screenshot({ path: `${OUT}/2-fisa.png` });

  // Schimbăm carburantul
  await page.tap('#card [data-close]');
  await page.tap('.chip[data-fuel="lpg"]');
  await page.waitForTimeout(400);
  const lpg = await page.evaluate(() => ({ fuel: window.__gasfind.state.fuel, pills: window.__gasfind.map.queryRenderedFeatures({ layers: ['st-pill'] }).length }));
  check('schimbare carburant', lpg.fuel === 'lpg' && lpg.pills > 0, JSON.stringify(lpg));
  await page.tap('.chip[data-fuel="diesel"]');

  // Lista celor mai ieftine
  await page.tap('#btn-list');
  await page.waitForSelector('#list:not([hidden])');
  await page.waitForTimeout(350);
  const list = await page.evaluate(() => [...document.querySelectorAll('#list-items li .p')].map((e) => e.textContent));
  const nums = list.map((t) => parseFloat(t.replace(',', '.')));
  check('lista e sortată crescător', nums.length > 3 && nums.every((v, i) => i === 0 || v >= nums[i - 1] - 1e-9), list.slice(0, 5).join(' | '));
  await page.screenshot({ path: `${OUT}/3-lista.png` });
  await page.tap('#list-items li button');
  await page.waitForSelector('#card:not([hidden])');
  check('din listă se deschide fișa', true);
  await page.tap('#card [data-close]');

  // Informații
  await page.tap('#btn-info');
  await page.waitForSelector('#info:not([hidden])');
  await page.waitForTimeout(350);
  const nSrc = await page.evaluate(() => document.querySelectorAll('#info-sources li').length);
  check('lista surselor', nSrc >= 10, `surse=${nSrc}`);
  await page.screenshot({ path: `${OUT}/4-info.png` });
  await page.tap('#info [data-close]');

  // Zoom mic -> mesaj
  await page.evaluate(() => window.__gasfind.map.jumpTo({ zoom: 7 }));
  await page.waitForTimeout(600);
  const hint = await page.textContent('#status');
  check('mesaj la zoom mic', /Apropie harta/.test(hint || ''), hint);
  await page.screenshot({ path: `${OUT}/5-zoom-mic.png` });

  // Prețuri de referință: într-o zonă fără sursă de prețuri pe stație (stațiile OSM false sunt „în Ungaria”)
  await page.evaluate(() => window.__gasfind.map.jumpTo({ center: [21.0, 52.2], zoom: 12 })); // Varșovia: doar OSM (mock)
  await page.waitForFunction(() => window.__gasfind.state.ref && !window.__gasfind.state.active && !window.__gasfind.state.queue.length && [...window.__gasfind.state.stations.values()].some((s) => s._src === 'osm' && s.lng > 20.5), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const band = await page.evaluate(() => { const el = document.querySelector('#refband'); return el && !el.hidden ? el.textContent : null; });
  check('banda cu prețul de referință al țării', Boolean(band) && /Ungaria: fără prețuri pe stație · medie motorină/.test(band), band);
  const osmTarget = await page.evaluate(() => {
    const s = [...window.__gasfind.state.stations.values()].find((x) => x._src === 'osm' && x.lng > 20.5);
    return s ? { id: s.id } : null;
  });
  if (osmTarget) {
    await page.evaluate((id) => window.__gasfind.openCard(id), osmTarget.id);
    await page.waitForSelector('#card:not([hidden])', { timeout: 5000 });
    await page.waitForTimeout(300);
    const ref = await page.evaluate(() => document.querySelector('#card-prices .ref')?.textContent || '');
    check('fișa stației fără preț arată prețul de referință', /Preț de referință: medie națională, motorină .* \(Buletinul petrolier UE, 21\.09\) · prețul la această stație poate diferi/.test(ref), ref);
    await page.screenshot({ path: `${OUT}/6-referinta.png` });
    await page.tap('#card [data-close]');
  } else check('stație OSM de deschis', false, 'nu am găsit stații OSM pe hartă');

  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await navigator.serviceWorker.ready; const keys = await caches.keys(); return { active: Boolean(r && r.active), caches: keys }; });
  check('service worker activ (aplicație instalabilă, merge offline)', sw.active && sw.caches.some((k) => k.startsWith('gasfind-')), JSON.stringify(sw));
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  check('manifest PWA', manifest.display === 'standalone' && manifest.icons.length >= 3, manifest.name);
  check('fără erori în consolă', errors.length === 0, errors.slice(0, 3).join(' || '));
} finally {
  await browser.close();
  server.kill();
}
for (const r of results) console.log(r.join('  '));
process.exit(results.some((r) => r[0] === 'ERR') ? 1 : 0);
