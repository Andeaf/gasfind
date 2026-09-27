// Formatul comun al unei benzinării, indiferent de sursă.
//
// {
//   id:   "fr:92230008"            identificator unic (sursă:id)
//   lat, lng                       coordonate WGS84
//   name, brand, addr, city        text (opțional)
//   cc:   "FR"                     țara
//   cur:  "EUR" | "RON" | "MDL"    moneda prețurilor
//   p:    { diesel, e5, e10, e98, lpg, dp }   prețuri/litru (doar ce există)
//   t:    { diesel: ISO, ... }     momentul fiecărui preț (dacă sursa îl dă)
//   u:    ISO                      actualizarea stației (dacă nu avem pe carburant)
//   uf:   true                     "u" e doar momentul descărcării (sursa nu dă oră)
//   open: true/false               deschisă acum (dacă sursa știe)
//   x:    { ... }                  detalii (ex. self: true = preț self-service)
// }

import { round, validLatLng } from './geo.js';

export const FUEL_KEYS = ['diesel', 'e5', 'e10', 'e98', 'lpg', 'dp'];

// Intervale de plauzibilitate pentru un litru (filtrăm erorile de introducere a datelor)
const RANGE = { EUR: [0.3, 5], RON: [1.5, 25], MDL: [5, 100], GBP: [0.3, 5] };

export function makeStation({ src, id, lat, lng, name, brand, addr, city, cc, cur = 'EUR', prices = {}, times = {}, updated, updatedIsFetch, open, extra }) {
  if (!validLatLng(lat, lng)) return null;
  const [lo, hi] = RANGE[cur] || [0, Infinity];
  const p = {};
  const t = {};
  for (const k of FUEL_KEYS) {
    const v = prices[k];
    if (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) {
      p[k] = round(v, 3);
      if (times[k]) t[k] = times[k];
    }
  }
  const s = { id: `${src}:${id}`, lat: round(lat, 6), lng: round(lng, 6) };
  const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v) || undefined;
  if (clean(name)) s.name = clean(name);
  if (clean(brand)) s.brand = clean(brand);
  if (clean(addr)) s.addr = clean(addr);
  if (clean(city)) s.city = clean(city);
  if (cc) s.cc = cc;
  if (cur) s.cur = cur;
  s.p = p;
  if (Object.keys(t).length) s.t = t;
  if (updated) s.u = updated;
  if (updatedIsFetch) s.uf = true;
  if (typeof open === 'boolean') s.open = open;
  if (extra && Object.keys(extra).length) s.x = extra;
  return s;
}

/** Păstrează prețul minim pentru un carburant (când o sursă are mai multe variante). */
export function setMin(prices, key, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return;
  if (prices[key] == null || value < prices[key]) prices[key] = value;
}
