// Prețuri de REFERINȚĂ pe țară (nu pe stație), pentru benzinăriile fără preț: media națională din
// Buletinul petrolier UE sau, unde există, prețul maxim legal. Sursele specifice (maxim) suprascriu
// media UE. Fiecare sursă e descărcată o singură dată (memo) și răspunsul stă ore în cache-ul CDN.
//
// Format per țară: { kind: 'avg' | 'max', cur: 'EUR' | 'RSD' | ..., p: { diesel, e5, e98, lpg },
//                    eur: { ... } (doar dacă cur != EUR), date: 'YYYY-MM-DD', src: id-ul sursei }
import { memo } from './http.js';
import { getRates } from './fx.js';
import { round } from './geo.js';
import wob from './ref/wob.js';
import be from './ref/be.js';
import lu from './ref/lu.js';

// Ordinea contează: sursele de mai jos suprascriu media UE pentru țara lor.
export const REF_SOURCES = [wob, be, lu];

export async function getRef(env) {
  const [fx, ...results] = await Promise.allSettled([
    getRates(),
    ...REF_SOURCES.map((s) => memo(`ref:${s.id}`, s.ttl * 1000, () => s.fetch(env), { staleMs: 14 * 86400e3 })),
  ]);
  const rates = fx.status === 'fulfilled' ? fx.value.rates : {};
  const countries = {}, sources = {};
  results.forEach((r, i) => {
    const s = REF_SOURCES[i];
    if (r.status !== 'fulfilled') { console.error(`[ref ${s.id}]`, r.reason?.message || r.reason); return; }
    sources[s.id] = { name: s.name, short: s.short, url: s.url, license: s.license };
    for (const [cc, e] of Object.entries(r.value)) {
      const entry = { ...e, src: s.id };
      if (e.cur && e.cur !== 'EUR' && rates[e.cur]) {
        entry.eur = Object.fromEntries(Object.entries(e.p).map(([k, v]) => [k, round(v / rates[e.cur], 3)]));
      }
      countries[cc] = entry;
    }
  });
  return { version: 1, fetched: new Date().toISOString(), sources, countries };
}
