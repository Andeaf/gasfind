// Utilitare geografice: dale (tiles), distanțe, conversii de coordonate.

export const R_EARTH_KM = 6371.0088;
const DEG = Math.PI / 180;

/** Distanța (km) între două puncte, formula haversine. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Rotunjire la n zecimale, fără erori de tip 0.30000000000000004. */
export function round(v, n = 6) {
  const f = 10 ** n;
  return Math.round(v * f) / f;
}

/** Dala (x, y) pentru o sursă cu dimensiunea [dLng, dLat] -> bbox [vest, sud, est, nord]. */
export function tileBbox([dLng, dLat], x, y) {
  return [round(x * dLng), round(y * dLat), round((x + 1) * dLng), round((y + 1) * dLat)];
}

/** Toate dalele care acoperă un bbox. */
export function tilesForBbox([dLng, dLat], [w, s, e, n]) {
  const out = [];
  const x0 = Math.floor(w / dLng), x1 = Math.floor((e - 1e-9) / dLng);
  const y0 = Math.floor(s / dLat), y1 = Math.floor((n - 1e-9) / dLat);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

export function bboxIntersects(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

export function inBbox(lat, lng, [w, s, e, n]) {
  return lng >= w && lng < e && lat >= s && lat < n;
}

export function bboxCenter([w, s, e, n]) {
  return { lat: (s + n) / 2, lng: (w + e) / 2 };
}

/** Jumătatea diagonalei unui bbox, în km (raza cercului care îl acoperă complet). */
export function bboxHalfDiagonalKm([w, s, e, n]) {
  const c = bboxCenter([w, s, e, n]);
  return Math.max(
    haversineKm(c.lat, c.lng, s, w), haversineKm(c.lat, c.lng, n, e),
    haversineKm(c.lat, c.lng, s, e), haversineKm(c.lat, c.lng, n, w),
  );
}

/** Împarte un bbox în nx × ny sub-dreptunghiuri. */
export function splitBbox([w, s, e, n], nx, ny) {
  const out = [];
  const dx = (e - w) / nx, dy = (n - s) / ny;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      out.push([w + i * dx, s + j * dy, w + (i + 1) * dx, s + (j + 1) * dy]);
    }
  }
  return out;
}

/** Web Mercator (EPSG:3857, metri) -> WGS84 (grade). */
export function mercatorToLngLat(x, y) {
  const R = 6378137;
  const lng = (x / R) / DEG;
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) / DEG;
  return { lat, lng };
}

/** Parsează numere cu virgulă sau punct zecimal ("1,899 €" -> 1.899). */
export function parseNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d,.-]/g, '').replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Coordonate plauzibile? (exclude 0,0 și valori absurde) */
export function validLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}
