// GasFind — harta benzinăriilor din Europa cu prețuri la zi.
import { Map as MapLibreMap, GeolocateControl, AttributionControl } from '/vendor/maplibre-gl.mjs';

// ---------------------------------------------------------------------------
// Setări
// ---------------------------------------------------------------------------
const MIN_ZOOM = 10; // sub acest zoom nu mai cerem date (ar fi prea multe)
const MAX_PARALLEL = 6; // cereri simultane către server
const OSM_MAX_PARALLEL = 2; // din acestea, cel mult atâtea pentru OSM (lent, fără prețuri); restul dalelor OSM așteaptă în coadă
// Germania (Tankerkönig): o singură cerere pe minut per cheie. O cerere DE în curs cel mult, și minimum
// 61 s între două cereri care ajung la Tankerkönig (un răspuns din cache-ul CDN nu consumă din limită).
const DE_MIN_INTERVAL_MS = 61000;
const STALE_DAYS = 7; // prețurile mai vechi sunt afișate gri
// O stație OSM (fără preț) e considerată dublura uneia cu preț dacă e la < 80 m de ea,
// sau la < 300 m și are aceeași marcă (coordonatele surselor oficiale sunt uneori aproximative).
const DEDUPE_NEAR_M = 80;
const DEDUPE_BRAND_M = 300;
const FUEL_LABEL = { diesel: 'Motorină', e5: 'Benzină 95', e10: 'Benzină E10', e98: 'Benzină 98+', lpg: 'GPL', dp: 'Motorină premium' };
const FUEL_ORDER = ['diesel', 'dp', 'e5', 'e10', 'e98', 'lpg'];
const CUR_SYMBOL = { EUR: '€', RON: 'lei', MDL: 'MDL', DKK: 'kr', RSD: 'din', MKD: 'den', GBP: '£' };
const COLORS = ['#15803d', '#4d7c0f', '#b45309', '#c2410c', '#b91c1c', '#6b7280'];
const SOURCE_NOTE = { ro: 'rețelele mari', at: 'doar cele mai ieftine', osm: 'fără prețuri' };
const params = new URLSearchParams(location.search);

// localStorage poate lipsi (mod privat) -> totul e opțional
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignorat */ } },
};

const state = {
  fuel: FUEL_LABEL[store.get('gf.fuel')] ? store.get('gf.fuel') : 'diesel',
  sources: [],
  sourceById: {},
  fx: { EUR: 1, RON: 5.28, MDL: 20.0 },
  stations: new Map(),
  tiles: new Map(),
  fails: new Map(),
  queue: [],
  active: 0,
  activeOsm: 0,
  deBusy: false, // o cerere DE e în curs
  deNextAt: 0, // cel mai devreme moment pentru următoarea cerere DE
  deTimer: 0,
  user: null,
  selected: null,
  errors: new Map(),
};

// ---------------------------------------------------------------------------
// Utilitare
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

/** Creează elemente DOM fără innerHTML (textele vin din surse externe). */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

function fmtPrice(v, cur) {
  return v.toFixed(cur === 'EUR' ? 3 : 2).replace('.', ',');
}

function fmtKm(km) {
  if (km < 1) return `${Math.round(km * 1000 / 10) * 10} m`;
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}

function ago(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const min = (Date.now() - t) / 60000;
  if (min < 1) return 'chiar acum';
  if (min < 60) return `acum ${Math.round(min)} min`;
  const hrs = min / 60;
  if (hrs < 24) return `acum ${Math.round(hrs)} h`;
  const days = hrs / 24;
  if (days < 2) return 'ieri';
  if (days < 7) return `acum ${Math.floor(days)} zile`;
  return `pe ${new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' }).format(new Date(t))}`;
}

function distKm(a, b) {
  const R = 6371, d = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * d) / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(((b.lng - a.lng) * d) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

const toEur = (v, cur) => v / (state.fx[cur] || 1);

const normBrand = (s) => (s.brand || s.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
function sameBrand(a, b) {
  const x = normBrand(a), y = normBrand(b);
  if (x.length < 2 || y.length < 2) return false;
  return x.includes(y) || y.includes(x) || (x.length >= 4 && y.length >= 4 && x.slice(0, 4) === y.slice(0, 4));
}

function priceTime(s, fuel) {
  return (s.t && s.t[fuel]) || s.u || null;
}

function isStale(s, fuel) {
  if (s.uf) return false; // sursa nu dă ora prețului
  const t = Date.parse(priceTime(s, fuel));
  return Number.isFinite(t) && Date.now() - t > STALE_DAYS * 86400e3;
}

function intersects(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function tilesFor([dx, dy], [w, s, e, n]) {
  const out = [];
  for (let y = Math.floor(s / dy); y <= Math.floor((n - 1e-9) / dy); y++) {
    for (let x = Math.floor(w / dx); x <= Math.floor((e - 1e-9) / dx); x++) out.push([x, y]);
  }
  return out;
}

function viewBbox(pad = 0) {
  const b = map.getBounds();
  const w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth();
  const dw = (e - w) * pad, dh = (n - s) * pad;
  return [w - dw, s - dh, e + dw, n + dh];
}

function inBbox(s, [w, so, e, n]) {
  return s.lng >= w && s.lng <= e && s.lat >= so && s.lat <= n;
}

// ---------------------------------------------------------------------------
// Harta
// ---------------------------------------------------------------------------
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const styleUrl = () => params.get('style') || `https://tiles.openfreemap.org/styles/${darkQuery.matches ? 'dark' : 'positron'}`;
const savedView = store.get('gf.view', null);

const map = new MapLibreMap({
  container: 'map',
  style: styleUrl(),
  center: savedView?.center || [24.97, 45.94],
  zoom: savedView?.zoom ?? 6,
  maxZoom: 18,
  attributionControl: false,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
});
map.touchZoomRotate.disableRotation();
map.addControl(new AttributionControl({ compact: true }), 'bottom-left');

const geolocate = new GeolocateControl({
  positionOptions: { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  trackUserLocation: true,
  showUserLocation: true,
  fitBoundsOptions: { maxZoom: 13 },
});
map.addControl(geolocate, 'bottom-right');
geolocate.on('geolocate', (pos) => {
  state.user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  $('#btn-locate').classList.add('active');
});
geolocate.on('error', () => flash('Nu pot afla locația. Verifică permisiunea de localizare.'));
geolocate.on('trackuserlocationend', () => $('#btn-locate').classList.remove('active'));

/** Imagini „pastilă” (fundalul etichetei de preț), câte una pe culoare. */
function addPillImages() {
  const pr = 2, w = 24 * pr, hgt = 20 * pr, r = 8 * pr;
  COLORS.forEach((color, i) => {
    const id = `pill-${i}`;
    if (map.hasImage(id)) return;
    const c = document.createElement('canvas');
    c.width = w; c.height = hgt;
    const g = c.getContext('2d');
    const x0 = pr, y0 = pr, x1 = w - pr, y1 = hgt - pr, rr = r - pr;
    g.beginPath();
    g.moveTo(x0 + rr, y0);
    g.arcTo(x1, y0, x1, y1, rr);
    g.arcTo(x1, y1, x0, y1, rr);
    g.arcTo(x0, y1, x0, y0, rr);
    g.arcTo(x0, y0, x1, y0, rr);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    g.lineWidth = 1.5 * pr;
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.stroke();
    map.addImage(id, g.getImageData(0, 0, w, hgt), {
      pixelRatio: pr,
      stretchX: [[r, w - r]],
      stretchY: [[r, hgt - r]],
      content: [r * 0.6, 3 * pr, w - r * 0.6, hgt - 3 * pr],
    });
  });
}

function setupLayers() {
  addPillImages();
  const empty = { type: 'FeatureCollection', features: [] };
  if (!map.getSource('st')) map.addSource('st', { type: 'geojson', data: empty });
  if (!map.getSource('sel')) map.addSource('sel', { type: 'geojson', data: empty });
  if (!map.getLayer('st-other')) {
    map.addLayer({
      id: 'st-other', type: 'circle', source: 'st', minzoom: 7,
      filter: ['!=', ['get', 'k'], 0],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 14, 5.5],
        'circle-color': ['case', ['==', ['get', 'k'], 1], '#94a3b8', '#ffffff'],
        'circle-stroke-color': '#64748b',
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 1.8],
      },
    });
    map.addLayer({
      id: 'st-dot', type: 'circle', source: 'st', minzoom: 7,
      filter: ['==', ['get', 'k'], 0],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 6.5],
        'circle-color': ['match', ['get', 'c'], 0, COLORS[0], 1, COLORS[1], 2, COLORS[2], 3, COLORS[3], 4, COLORS[4], COLORS[5]],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });
    map.addLayer({
      id: 'st-sel', type: 'circle', source: 'sel',
      paint: { 'circle-radius': 15, 'circle-color': 'rgba(15,118,110,0.18)', 'circle-stroke-color': '#0f766e', 'circle-stroke-width': 3 },
    });
    map.addLayer({
      id: 'st-pill', type: 'symbol', source: 'st', minzoom: 8,
      filter: ['==', ['get', 'k'], 0],
      layout: {
        'text-field': ['get', 'lbl'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-anchor': 'bottom',
        'text-offset': [0, -0.75],
        'icon-image': ['concat', 'pill-', ['to-string', ['get', 'c']]],
        'icon-text-fit': 'both',
        'icon-text-fit-padding': [2, 7, 2, 7],
        'symbol-sort-key': ['get', 'r'],
        'text-padding': 2,
        'text-allow-overlap': false,
        'icon-allow-overlap': false,
      },
      paint: { 'text-color': '#ffffff' },
    });
  }
  render();
  showSelection();
}

map.on('style.load', setupLayers);
// diff: false -> reîncărcare completă, ca să primim 'style.load' și să readăugăm straturile noastre
darkQuery.addEventListener?.('change', () => map.setStyle(styleUrl(), { diff: false }));

// ---------------------------------------------------------------------------
// Date: dale per sursă, încărcate la cerere
// ---------------------------------------------------------------------------
async function loadConfig() {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cfg = await res.json();
      state.sources = cfg.sources;
      state.sourceById = Object.fromEntries(cfg.sources.map((s) => [s.id, s]));
      state.fx = { EUR: 1, ...(cfg.fx?.rates || {}) };
      state.deMissingKey = cfg.deMissingKey;
      return;
    } catch {
      flash('Nu mă pot conecta la server. Reîncerc…');
      await new Promise((r) => setTimeout(r, Math.min(15000, 2000 * 2 ** attempt)));
    }
  }
}

function planTiles() {
  if (map.getZoom() < MIN_ZOOM) return [];
  const view = viewBbox(0.2);
  const c = map.getCenter();
  const now = Date.now();
  const jobs = new Map();
  for (const src of state.sources) {
    for (const cov of src.coverage) {
      if (!intersects(cov, view)) continue;
      const clip = [Math.max(view[0], cov[0]), Math.max(view[1], cov[1]), Math.min(view[2], cov[2]), Math.min(view[3], cov[3])];
      for (const [x, y] of tilesFor(src.tile, clip)) {
        const key = `${src.id}:${x}:${y}`;
        if (jobs.has(key)) continue;
        const t = state.tiles.get(key);
        if (t && (t.state === 'loading' || t.state === 'queued')) continue;
        if (t && t.state === 'ok' && now - t.at < t.ttl * 1000) continue;
        if (t && t.state === 'err' && now < t.retryAt) continue;
        const cx = (x + 0.5) * src.tile[0], cy = (y + 0.5) * src.tile[1];
        // întâi sursele cu preț, apoi OSM; în cadrul fiecărei grupe, cele mai apropiate de centru
        jobs.set(key, { src, x, y, key, pri: src.id === 'osm' ? 1 : 0, d: (cx - c.lng) ** 2 + (cy - c.lat) ** 2 });
      }
    }
  }
  return [...jobs.values()].sort((a, b) => a.pri - b.pri || a.d - b.d).slice(0, 80);
}

function update() {
  // cererile vechi încă neîncepute nu mai contează dacă harta s-a mutat
  for (const j of state.queue) state.tiles.delete(j.key);
  state.queue = [];
  const jobs = planTiles();
  state.queue = jobs;
  for (const j of jobs) state.tiles.set(j.key, { state: 'queued' });
  pump();
  updateStatus();
}

function pump() {
  for (let i = 0; i < state.queue.length && state.active < MAX_PARALLEL; ) {
    const job = state.queue[i];
    const osm = job.src.id === 'osm', de = job.src.id === 'de';
    if (osm && state.activeOsm >= OSM_MAX_PARALLEL) { i++; continue; } // OSM rămâne în coadă, nu blochează prețurile
    if (de && (state.deBusy || Date.now() < state.deNextAt)) { scheduleDe(); i++; continue; } // Germania: una pe rând, o dată pe minut
    state.queue.splice(i, 1);
    state.active++;
    if (osm) state.activeOsm++;
    if (de) state.deBusy = true;
    loadTile(job).finally(() => { state.active--; if (osm) state.activeOsm--; if (de) state.deBusy = false; pump(); updateStatus(); });
  }
}

/** Germania: repornește coada când expiră pauza de un minut (dalele DE sunt deja sortate după distanța de centru). */
function scheduleDe() {
  if (state.deTimer || state.deBusy) return;
  const wait = Math.max(0, state.deNextAt - Date.now()) + 50;
  state.deTimer = setTimeout(() => { state.deTimer = 0; pump(); updateStatus(); }, wait);
}

/** Germania: după o cerere care a ajuns la Tankerkönig (nu din cache-ul CDN), următoarea așteaptă 61 s sau cât spune Retry-After. */
function noteDeRequest(res) {
  const retry = Number(res.headers.get('Retry-After')) || 0;
  const cached = res.headers.get('x-vercel-cache') === 'HIT';
  if (retry) state.deNextAt = Math.max(state.deNextAt, Date.now() + retry * 1000);
  else if (!cached) state.deNextAt = Math.max(state.deNextAt, Date.now() + DE_MIN_INTERVAL_MS);
}

async function loadTile({ src, x, y, key }) {
  state.tiles.set(key, { state: 'loading', at: Date.now() });
  try {
    const res = await fetch(`/api/tile?s=${src.id}&x=${x}&y=${y}`);
    if (src.id === 'de') noteDeRequest(res);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || `HTTP ${res.status}`);
      err.retryAfter = Number(res.headers.get('Retry-After')) || 0;
      throw err;
    }
    const data = await res.json();
    for (const s of data.stations || []) mergeStation(s, src.id);
    evictIfNeeded();
    // rezultat parțial (o parte a sursei n-a răspuns): reîncercăm peste 2 minute
    const ttl = data.partial ? 120 : src.ttl;
    state.tiles.set(key, { state: 'ok', at: Date.now(), ttl });
    state.fails.delete(key);
    state.errors.delete(src.id);
    scheduleRender();
  } catch (e) {
    const fails = (state.fails.get(key) || 0) + 1;
    state.fails.set(key, fails);
    const delay = e.retryAfter ? e.retryAfter * 1000 : Math.min(300000, 15000 * 2 ** (fails - 1));
    state.tiles.set(key, { state: 'err', retryAt: Date.now() + delay });
    state.errors.set(src.id, Date.now());
    setTimeout(update, delay + 300);
  }
}

function mergeStation(s, srcId) {
  s._src = srcId;
  const prev = state.stations.get(s.id);
  if (prev && srcId === 'at') {
    // Austria: aceeași stație vine din mai multe dale, fiecare cu alte prețuri -> le unim
    s.p = { ...prev.p, ...s.p };
  }
  state.stations.set(s.id, s);
}

/** După un drum lung prin Europa: păstrăm doar cele mai apropiate ~10.000 de stații. */
function evictIfNeeded() {
  if (state.stations.size <= 15000) return;
  const c = map.getCenter();
  const far = [...state.stations.values()]
    .map((s) => [s.id, (s.lat - c.lat) ** 2 + (s.lng - c.lng) ** 2])
    .sort((a, b) => b[1] - a[1]);
  for (const [id] of far.slice(0, far.length - 10000)) state.stations.delete(id);
  const view = viewBbox(0.5);
  for (const [key, t] of state.tiles) {
    if (t.state !== 'ok') continue;
    const [sid, x, y] = key.split(':');
    const src = state.sourceById[sid];
    if (!src) continue;
    const cx = (+x + 0.5) * src.tile[0], cy = (+y + 0.5) * src.tile[1];
    if (cx < view[0] || cx > view[2] || cy < view[1] || cy > view[3]) state.tiles.delete(key);
  }
}

let renderTimer = 0;
function scheduleRender() {
  if (renderTimer) return;
  renderTimer = setTimeout(() => { renderTimer = 0; render(); }, 200);
}

// ---------------------------------------------------------------------------
// Desenarea: culori după prețul relativ la ce e pe ecran
// ---------------------------------------------------------------------------
function render() {
  const src = map.getSource('st');
  if (!src) return;
  const fuel = state.fuel;
  const view = viewBbox(0);
  // 1) prețurile vizibile (în EUR, ca să putem compara între țări)
  const visible = [];
  for (const s of state.stations.values()) {
    const p = s.p?.[fuel];
    if (p == null || !inBbox(s, view) || isStale(s, fuel)) continue;
    visible.push(toEur(p, s.cur));
  }
  visible.sort((a, b) => a - b);
  const n = visible.length;
  const classOf = (eur) => {
    if (n < 3) return 2;
    let lo = 0, hi = n; // primul index >= eur
    while (lo < hi) { const m = (lo + hi) >> 1; if (visible[m] < eur) lo = m + 1; else hi = m; }
    let up = lo; // primul index > eur
    while (up < n && visible[up] <= eur) up++;
    const q = (lo + Math.max(lo, up - 1)) / 2 / (n - 1);
    return Math.min(4, Math.floor(q * 5));
  };
  // 2) index spațial al stațiilor cu preț (pentru a elimina dublurile OSM)
  const cell = 0.005;
  const grid = new Map();
  for (const s of state.stations.values()) {
    if (s._src === 'osm') continue;
    const k = `${Math.floor(s.lat / cell)}:${Math.floor(s.lng / cell)}`;
    (grid.get(k) || grid.set(k, []).get(k)).push(s);
  }
  const hasPricedNeighbour = (s) => {
    const gy = Math.floor(s.lat / cell), gx = Math.floor(s.lng / cell);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const o of grid.get(`${gy + dy}:${gx + dx}`) || []) {
        const m = distKm(s, o) * 1000;
        if (m < DEDUPE_NEAR_M || (m < DEDUPE_BRAND_M && sameBrand(s, o))) return true;
      }
    }
    return false;
  };
  // 3) obiectele de pe hartă
  const features = [];
  for (const s of state.stations.values()) {
    if (s._src === 'osm' && hasPricedNeighbour(s)) continue;
    const p = s.p?.[fuel];
    const props = { id: s.id, k: s._src === 'osm' ? 2 : 1 };
    s._c = null;
    if (p != null) {
      const stale = isStale(s, fuel);
      const eur = toEur(p, s.cur);
      props.k = 0;
      props.c = stale ? 5 : classOf(eur);
      s._c = props.c;
      props.lbl = fmtPrice(p, s.cur);
      props.r = stale ? 1000 + eur : eur;
    }
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: props });
  }
  src.setData({ type: 'FeatureCollection', features });
  if (!$('#list').hidden) renderList();
}

// ---------------------------------------------------------------------------
// Mesaje de stare
// ---------------------------------------------------------------------------
let flashMsg = null, flashTimer = 0;
function flash(msg, ms = 5000) {
  flashMsg = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { flashMsg = null; updateStatus(); }, ms);
  updateStatus();
}

function updateStatus() {
  const el = $('#status');
  let text = null, spin = false;
  // OSM (stațiile fără preț) nu merită un mesaj: se reîncearcă singur în fundal
  const recentErrors = [...state.errors.entries()].filter(([id, t]) => id !== 'osm' && Date.now() - t < 60000).map(([id]) => state.sourceById[id]?.name).filter(Boolean);
  if (!navigator.onLine) text = 'Fără conexiune la internet';
  else if (flashMsg) text = flashMsg;
  else if (map.getZoom() < MIN_ZOOM) text = 'Apropie harta ca să vezi benzinăriile';
  else if (state.deBusy || state.queue.some((j) => j.src.id === 'de')) { text = 'Germania: prețurile se încarcă treptat, o zonă pe minut (limita Tankerkönig)'; spin = true; }
  else if (state.active || state.queue.length) { text = 'Se încarcă prețurile…'; spin = true; }
  else if (recentErrors.length) text = `Nu răspunde acum: ${recentErrors.join(', ')}. Reîncerc automat.`;
  if (!text) { el.hidden = true; return; }
  el.hidden = false;
  el.replaceChildren(...(spin ? [h('span', { class: 'spin', 'aria-hidden': 'true' })] : []), text);
}
addEventListener('online', () => { updateStatus(); update(); });
addEventListener('offline', updateStatus);

// ---------------------------------------------------------------------------
// Foile de jos: fișa stației, lista, informații
// ---------------------------------------------------------------------------
function openSheet(id) {
  for (const s of document.querySelectorAll('.sheet')) s.hidden = s.id !== id;
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => {
    const el = $(`#${id}`);
    // butoanele urcă deasupra fișei; dacă fișa e prea înaltă le ascundem
    const tall = id !== 'card' || el.offsetHeight > innerHeight * 0.55;
    document.body.classList.toggle('sheet-tall-open', tall);
    document.body.style.setProperty('--sheet-h', `${el.offsetHeight}px`);
  });
}

function closeSheets() {
  for (const s of document.querySelectorAll('.sheet')) s.hidden = true;
  document.body.classList.remove('sheet-open', 'sheet-tall-open');
  state.selected = null;
  showSelection();
}

for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeSheets);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); });

/** Atribuire obligatorie (ex. Tankerkönig, CC BY 4.0): textul sursei, cu link. */
function attributionLink(src) {
  return h('a', { href: src.attributionUrl, target: '_blank', rel: 'noopener' }, `${src.attribution} – ${new URL(src.attributionUrl).hostname}`);
}

function stationTitle(s) {
  const brand = s.brand?.trim(), name = s.name?.trim();
  if (brand && name && !name.toLowerCase().includes(brand.toLowerCase()) && name.toLowerCase() !== brand.toLowerCase()) return `${brand} · ${name}`;
  return name || brand || 'Benzinărie';
}

function navUrl(s) {
  return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving&dir_action=navigate`;
}

function showSelection() {
  const src = map.getSource('sel');
  if (!src) return;
  const s = state.selected && state.stations.get(state.selected);
  src.setData({ type: 'FeatureCollection', features: s ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: {} }] : [] });
}

function openCard(id) {
  const s = state.stations.get(id);
  if (!s) return;
  state.selected = id;
  showSelection();
  $('#card-title').textContent = stationTitle(s);
  const where = [s.addr, s.city].filter(Boolean).join(', ');
  const dist = state.user ? fmtKm(distKm(state.user, s)) : null;
  $('#card-sub').textContent = [where, dist && `la ${dist}`].filter(Boolean).join(' · ') || ' ';

  const fuels = FUEL_ORDER.filter((f) => s.p?.[f] != null);
  const box = $('#card-prices');
  if (!fuels.length) {
    box.replaceChildren(h('p', { class: 'empty' }, s._src === 'osm' && s.cc === 'DE' && state.sourceById.de
      ? 'Prețurile din Germania sosesc treptat, o zonă pe minut (limita Tankerkönig). Stația apare deocamdată din OpenStreetMap.'
      : s._src === 'osm'
        ? 'Nu există o sursă gratuită de prețuri pentru această țară. Stația apare din OpenStreetMap.'
        : 'Sursa nu a publicat prețuri pentru această stație (de ex. în Austria doar cele mai ieftine au preț).'));
  } else {
    box.replaceChildren(...fuels.map((f) => {
      const stale = isStale(s, f);
      const eq = s.cur && s.cur !== 'EUR' ? `≈ ${toEur(s.p[f], s.cur).toFixed(2).replace('.', ',')} €` : null;
      return h('div', { class: `price${f === state.fuel ? ' sel' : ''}${stale ? ' old' : ''}` },
        h('span', { class: 'l' }, FUEL_LABEL[f]),
        h('span', { class: 'v' }, fmtPrice(s.p[f], s.cur), h('small', {}, CUR_SYMBOL[s.cur] || s.cur || '')),
        eq ? h('span', { class: 'e' }, eq) : null);
    }));
  }

  const meta = [];
  const t = priceTime(s, s.p?.[state.fuel] != null ? state.fuel : fuels[0]);
  if (t && fuels.length) meta.push(s.uf ? `Verificat ${ago(t)}` : `Preț actualizat ${ago(t)}`);
  if (s.open === false) meta.push('Închisă acum');
  if (s.x?.self) meta.push('preț self-service');
  if (s.x?.hw) meta.push('autostradă');
  if (s.x?.hours && s.x.hours.length < 60) meta.push(s.x.hours);
  const srcInfo = state.sourceById[s._src];
  if (srcInfo) meta.push(srcInfo.attributionUrl ? ['Date: ', attributionLink(srcInfo)] : `Sursa: ${srcInfo.attribution}`);
  $('#card-meta').replaceChildren(...meta.flatMap((m, i) => [i ? ' · ' : null, ...(Array.isArray(m) ? m : [m])].filter((x) => x != null)));

  const nav = $('#card-nav');
  nav.href = navUrl(s);
  openSheet('card');

  // Italia: adresa vine separat
  if (!s.addr && srcInfo?.detail && !s._detail) {
    s._detail = true;
    const rawId = s.id.slice(s._src.length + 1);
    fetch(`/api/detail?s=${s._src}&id=${encodeURIComponent(rawId)}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d || state.selected !== id) return;
      if (d.addr) s.addr = d.addr;
      if (d.name && !s.name) s.name = d.name;
      openCard(id);
    }).catch(() => {});
  }
}

function renderList() {
  const fuel = state.fuel;
  const view = viewBbox(0);
  const ref = state.user || null;
  const items = [];
  for (const s of state.stations.values()) {
    const p = s.p?.[fuel];
    if (p == null || !inBbox(s, view) || isStale(s, fuel)) continue;
    items.push({ s, p, eur: toEur(p, s.cur) });
  }
  items.sort((a, b) => a.eur - b.eur);
  const top = items.slice(0, 20);
  $('#list-title').textContent = `Cele mai ieftine: ${FUEL_LABEL[fuel]}`;
  $('#list-sub').textContent = map.getZoom() < MIN_ZOOM
    ? 'Apropie harta ca să încarc benzinăriile din zonă.'
    : items.length ? `${items.length} stații cu preț în zona vizibilă` : 'Nicio stație cu preț în zona vizibilă.';
  $('#list-items').replaceChildren(...top.map(({ s, p }) => {
    const c = s._c ?? 2;
    return h('li', {}, h('button', { type: 'button', onclick: () => { map.flyTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 13) }); openCard(s.id); } },
      h('span', { class: 'p' }, h('i', { class: `dot c${c}` }), `${fmtPrice(p, s.cur)} ${CUR_SYMBOL[s.cur] || ''}`),
      h('span', { class: 'n' }, stationTitle(s)),
      h('span', { class: 'd' }, ref ? fmtKm(distKm(ref, s)) : '')));
  }));
}

function openInfo() {
  const list = $('#info-sources');
  list.replaceChildren(...state.sources.map((s) => h('li', {},
    h('b', {}, s.name), ' – ', s.attributionUrl ? attributionLink(s) : s.attribution,
    SOURCE_NOTE[s.id] ? h('span', { class: 'tag' }, SOURCE_NOTE[s.id]) : null)));
  const extra = [];
  if (state.deMissingKey) extra.push('Germania: prețurile apar după ce adaugi cheia gratuită Tankerkönig (vezi README).');
  extra.push('Fără prețuri (doar benzinăriile din OpenStreetMap): Ungaria, Bulgaria, Grecia, Polonia, Cehia, Slovacia, Olanda, Belgia, Luxemburg, Elveția, Marea Britanie, țările nordice și baltice etc. – nu există surse gratuite de prețuri pe stație.');
  $('#info-extra').textContent = extra.join(' ');
  openSheet('info');
}

// ---------------------------------------------------------------------------
// Interacțiuni
// ---------------------------------------------------------------------------
function setFuel(fuel) {
  state.fuel = fuel;
  store.set('gf.fuel', fuel);
  for (const b of document.querySelectorAll('.chip')) b.setAttribute('aria-checked', String(b.dataset.fuel === fuel));
  render();
  if (!$('#card').hidden && state.selected) openCard(state.selected);
}
for (const b of document.querySelectorAll('.chip')) b.addEventListener('click', () => setFuel(b.dataset.fuel));

$('#btn-list').addEventListener('click', () => { renderList(); openSheet('list'); });
$('#btn-info').addEventListener('click', openInfo);
$('#btn-locate').addEventListener('click', () => {
  if (state.user) map.flyTo({ center: [state.user.lng, state.user.lat], zoom: Math.max(map.getZoom(), 13) });
  else geolocate.trigger();
});

// Atingere pe hartă: alegem cea mai apropiată stație într-o zonă de ±14 px
map.on('click', (e) => {
  const pad = 14;
  const box = [[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]];
  const feats = map.queryRenderedFeatures(box, { layers: ['st-pill', 'st-dot', 'st-other'].filter((l) => map.getLayer(l)) });
  if (!feats.length) { if (!$('#card').hidden) closeSheets(); return; }
  let best = null, bestD = Infinity;
  for (const f of feats) {
    const pt = map.project(f.geometry.coordinates);
    const d = (pt.x - e.point.x) ** 2 + (pt.y - e.point.y) ** 2 - (f.layer.id === 'st-pill' ? 400 : 0);
    if (d < bestD) { bestD = d; best = f; }
  }
  openCard(best.properties.id);
});
for (const l of ['st-pill', 'st-dot', 'st-other']) {
  map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
}

let moveTimer = 0;
map.on('moveend', () => {
  const c = map.getCenter();
  store.set('gf.view', { center: [+c.lng.toFixed(5), +c.lat.toFixed(5)], zoom: +map.getZoom().toFixed(2) });
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => { update(); render(); }, 250);
});

// ---------------------------------------------------------------------------
// Pornire
// ---------------------------------------------------------------------------
setFuel(state.fuel);
updateStatus();
const configReady = loadConfig();
map.on('load', async () => {
  await configReady;
  update();
  // prima deschidere (sau permisiune deja dată): centrăm pe utilizator
  let granted = false;
  try { granted = (await navigator.permissions?.query({ name: 'geolocation' }))?.state === 'granted'; } catch { /* Safari vechi */ }
  if (!savedView || granted) geolocate.trigger();
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// pentru teste
window.__gasfind = { state, map, render, update };
