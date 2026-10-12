// CIPRU — Observatorul prețurilor cu amănuntul la carburanți al Ministerului Energiei, Comerțului și
// Industriei (eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices), publicat pe data.gov.cy ca setul
// „Παρατηρητήριο Λιανικών Τιμών Καυσίμων (API)” sub licență CC BY-SA 4.0, cu condiția unei versiuni gratuite
// pentru consumatori (GasFind e gratuită). robots.txt permite tot; fără captcha.
// Pagina e un formular ASP.NET MVC: GET pentru cookie-uri + tokenul anti-CSRF, apoi câte un POST per
// carburant (95, 98, motorină), fiecare cu toate ~320 de stații din țară, cu coordonate în linkul hărții.
// Descărcăm toată țara o dată la 30 de minute (memo). EUR/L. Pagina nu dă ora prețului (setul de date e
// „în timp real”), așa că stațiile primesc ora descărcării; cele marcate „isOffLine” (preț posibil
// neactualizat) sunt semnalate cu x.off.
// Serverul răspunde la fiecare POST în 12–22 s, oricât de mic ar fi filtrul (un singur district durează la
// fel), deci prima cerere după expirarea cache-ului e lentă. De aceea toată insula e O SINGURĂ dală (6°×6°,
// dala 5,5): toți utilizatorii primesc același răspuns din CDN și o singură funcție descarcă datele.
// Coloana „Πρατήριο” e firma care operează stația (ex. „I.G. MAKRIS ENTERPRISES LTD”): o punem în x.op,
// iar numele stației devine localitatea, ca titlul fișei să fie „marcă · localitate”.
import { fetchText, memo } from '../http.js';
import { makeStation } from '../station.js';
import { inBbox } from '../geo.js';

const URL = 'https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices';
const FUELS = [['1', 'e5'], ['2', 'e98'], ['3', 'diesel']]; // Αμόλυβδη 95, Αμόλυβδη 98, Πετρέλαιο κίνησης

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m)).replace(/\s+/g, ' ').trim();

/** "35.18,33.38", "34.92, 33.44" sau DMS 34°39'13.5"N 32°58'26.3"E -> { lat, lng } */
export function parseCoords(raw) {
  let s;
  try { s = decodeURIComponent(String(raw || '')); } catch { s = String(raw || ''); }
  s = s.replace(/\+/g, ' ').trim();
  const dec = s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (dec) return { lat: parseFloat(dec[1]), lng: parseFloat(dec[2]) };
  const dms = s.match(/(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([NS])[\s,]+(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([EW])/i);
  if (!dms) return null;
  const v = (d, m, sec, h) => (parseInt(d, 10) + parseInt(m, 10) / 60 + parseFloat(sec) / 3600) * (/[SW]/i.test(h) ? -1 : 1);
  return { lat: v(dms[1], dms[2], dms[3], dms[4]), lng: v(dms[5], dms[6], dms[7], dms[8]) };
}

/** Hash scurt și stabil (FNV-1a) pentru identificatorul stației: pagina nu dă id-uri. */
function fnv(s) {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const ROW = /<tr>\s*<td class="([^"]*)">([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>\s*(?:<a[^>]*href="[^"]*coordinates=([^"&]*)[^"]*"[^>]*>)?([^<]*)(?:<\/a>)?\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<\/tr>/g;

/** Tabelul unui POST -> [{ id, brand, name, addr, city, lat, lng, price, off }] */
export function parseTable(html) {
  const out = [];
  const t = String(html);
  const start = t.indexOf('petroleumPriceDetailsFootable');
  const table = start >= 0 ? t.slice(t.lastIndexOf('<table', start), t.indexOf('</table>', start) + 8) : t;
  for (const m of table.matchAll(ROW)) {
    const [, cls, brand, station, coords, addr, city, price] = m;
    if (/<th|Σήμα/.test(brand)) continue;
    const c = parseCoords(coords);
    const v = parseFloat(price);
    if (!c || !Number.isFinite(v)) continue;
    const b = decode(brand), n = decode(station), a = decode(addr);
    out.push({ id: fnv(`${b}|${n}|${a}`), brand: b, name: n, addr: a.replace(/\s*τηλ:.*$/i, ''), city: decode(city), lat: c.lat, lng: c.lng, price: v, off: /isOffLine/.test(cls) });
  }
  return out;
}

/** Cele trei tabele -> stații normalizate (prețurile unite după id). */
export function merge(tables, fetchedIso) {
  const byId = new Map();
  for (const [key, rows] of tables) {
    for (const r of rows) {
      const e = byId.get(r.id) || { r, prices: {}, off: false };
      e.prices[key] = r.price;
      e.off = e.off || r.off;
      byId.set(r.id, e);
    }
  }
  const out = [];
  for (const { r, prices, off } of byId.values()) {
    const extra = {};
    if (r.name) extra.op = r.name;
    if (off) extra.off = true;
    const s = makeStation({
      src: 'cy', id: r.id, lat: r.lat, lng: r.lng, brand: r.brand, name: r.city || r.addr, addr: r.addr, city: r.city,
      cc: 'CY', cur: 'EUR', prices, updated: fetchedIso, updatedIsFetch: true, extra,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Toate cookie-urile din răspunsul GET (header-ele Set-Cookie sunt unite cu virgulă); serverul le cere pe toate. */
export function cookieHeader(headers) {
  const sc = String(headers?.['set-cookie'] || headers?.['Set-Cookie'] || '');
  const seen = new Map();
  for (const m of sc.matchAll(/(?:^|,\s*)([A-Za-z0-9_.-]+)=([^;,]*)/g)) seen.set(m[1], m[2].trim());
  return [...seen].map(([k, v]) => `${k}=${v}`).join('; ');
}

/** O sesiune (GET: cookie-uri + token anti-CSRF) și un POST pentru un carburant. Serverul răspunde în ~13 s. */
async function fetchFuel(code) {
  const get = await fetchText(URL, { timeout: 15000 });
  const token = String(get.text).match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
  if (!token) throw new Error('CY: tokenul anti-CSRF nu a fost găsit');
  const body = new URLSearchParams({ __RequestVerificationToken: token, 'Entity.PetroleumType': code, 'Entity.StationCityEnum': 'All', 'Entity.District': '' }).toString();
  const res = await fetchText(URL, { method: 'POST', timeout: 40000, retries: 0, body, headers: { Cookie: cookieHeader(get.headers), 'Content-Type': 'application/x-www-form-urlencoded', Referer: URL } });
  return parseTable(res.text);
}

async function load() {
  // câte o sesiune per carburant, în paralel: în aceeași sesiune ASP.NET serializează cererile (3 × 13 s ar depăși limita funcției)
  const tables = await Promise.all(FUELS.map(async ([code, key]) => [key, await fetchFuel(code)]));
  const stations = merge(tables, new Date().toISOString());
  if (!stations.length) throw new Error('CY: niciun rând în tabel (s-a schimbat formularul?)');
  if (stations.length < 100) console.warn(`[cy] doar ${stations.length} stații (de obicei ~320)`);
  return stations;
}

export default {
  id: 'cy',
  name: 'Cipru',
  cc: 'CY',
  cur: 'EUR',
  attribution: 'Παρατηρητήριο Λιανικών Τιμών Καυσίμων – Ministerul Energiei, Comerțului și Industriei (data.gov.cy, CC BY-SA 4.0)',
  attributionUrl: 'https://data.gov.cy/index.php/el/dataset/paratiritirio-lianikon-timon-kaysimon-api',
  coverage: [[32.2, 34.5, 34.7, 35.8]],
  tile: [6, 6], // o singură dală (5,5) = [30, 30, 36, 36] pentru toată insula
  ttl: 1800,
  complete: true,
  async fetchTile(bbox) {
    const all = await memo('cy:all', 30 * 60e3, load, { staleMs: 6 * 3600e3 });
    return all.filter((s) => inBbox(s.lat, s.lng, bbox));
  },
};
