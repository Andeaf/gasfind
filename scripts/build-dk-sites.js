// Geocodează o singură dată stațiile Q8/F24 și Circle K/INGO din Danemarca (API-urile lor de prețuri nu
// publică coordonate) cu DAWA — API-ul oficial și gratuit al adreselor daneze (api.dataforsyningen.dk,
// fără cheie) — și scrie lib/data/dk-sites.js. Intrările deja geocodate se păstrează; rulează din nou
// când apar stații noi: node scripts/build-dk-sites.js
import { writeFileSync, existsSync } from 'node:fs';

const OUT = new URL('../lib/data/dk-sites.js', import.meta.url);
const UA = { 'User-Agent': 'GasFind/1.0 (harta personala a preturilor la carburanti)' };
const prev = existsSync(OUT) ? (await import(OUT.href)).default : {};

const q8 = await (await fetch('https://beta.q8.dk/Station/GetStationPrices?page=1&pageSize=2000', { headers: UA })).json();
const ck = await (await fetch('https://api.circlek.com/eu/prices/v1/fuel/countries/DK', { headers: { ...UA, 'X-App-Name': 'PRICES' } })).json();

const todo = new Map();
for (const s of q8?.data?.stationsPrices || []) todo.set(`q8:${s.stationId}`, String(s.address || '').replace(/\s+Danmark$/i, '').trim());
for (const s of ck?.sites || []) todo.set(`ck:${s.id}`, `${s.address?.street || ''}, ${s.address?.postalCode || ''} ${s.address?.city || ''}`.trim());
console.log(`stații: Q8/F24 ${(q8?.data?.stationsPrices || []).length} rânduri, Circle K/INGO ${(ck?.sites || []).length}; deja geocodate: ${Object.keys(prev).length}`);

const out = { ...prev };
const missing = [];
let added = 0;
async function geocode([key, q]) {
  if (out[key] || !q) return;
  const params = new URLSearchParams({ q, struktur: 'mini', per_side: '1', fuzzy: 'true' });
  try {
    const res = await fetch(`https://api.dataforsyningen.dk/adgangsadresser?${params}`, { headers: UA });
    const arr = await res.json();
    const a = Array.isArray(arr) ? arr[0] : null;
    if (a && Number.isFinite(a.y) && Number.isFinite(a.x)) { out[key] = [+a.y.toFixed(6), +a.x.toFixed(6)]; added++; }
    else missing.push(`${key}  ${q}`);
  } catch (e) {
    missing.push(`${key}  ${q}  (${e.message})`);
  }
}
const queue = [...todo.entries()];
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await geocode(queue.shift()); }));

const keys = Object.keys(out).sort();
const sorted = Object.fromEntries(keys.map((k) => [k, out[k]]));
writeFileSync(OUT, `// Generat de scripts/build-dk-sites.js (${new Date().toISOString().slice(0, 10)}) din DAWA, API-ul oficial al adreselor daneze:\n// coordonatele stațiilor Q8/F24 (q8:<stationId>) și Circle K/INGO (ck:<siteId>), care lipsesc din API-urile lor de prețuri.\nexport default ${JSON.stringify(sorted)};\n`);
console.log(`adăugate: ${added}, total: ${keys.length}, negăsite: ${missing.length}`);
if (missing.length) console.log(missing.slice(0, 40).join('\n') + (missing.length > 40 ? `\n... și încă ${missing.length - 40}` : ''));
