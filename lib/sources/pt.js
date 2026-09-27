// PORTUGALIA — DGEG (Direção-Geral de Energia e Geologia), "Preços dos Combustíveis Online".
// Gratuit pentru uz necomercial. Stațiile raportează fiecare schimbare de preț.
// Descărcăm pe districte (Portugalia continentală).
import { fetchJson, memo } from '../http.js';
import { makeStation, setMin } from '../station.js';
import { bboxIntersects, inBbox, parseNum } from '../geo.js';
import { localIsoToUtc } from '../time.js';

const BASE = 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/PesquisarPostos';
// 2101 Gasóleo simples, 2105 Gasóleo especial, 3201 Gasolina simples 95, 3400 Gasolina 98,
// 3405 Gasolina especial 98, 1120 GPL Auto
const FUEL_IDS = '2101,2105,3201,3400,3405,1120';
const FUEL_MAP = {
  'Gasóleo simples': 'diesel',
  'Gasóleo especial': 'dp',
  'Gasolina simples 95': 'e5',
  'Gasolina 98': 'e98',
  'Gasolina especial 98': 'e98',
  'GPL Auto': 'lpg',
};

// Încadrarea districtelor [sud, vest, nord, est] (calculată din coordonatele stațiilor, +0,1°)
const DISTRICTS = {
  1: [40.23, -8.83, 41.14, -8.06], 2: [37.32, -8.87, 38.39, -6.88], 3: [41.25, -8.89, 41.79, -7.86],
  4: [40.99, -7.44, 41.94, -6.17], 5: [39.47, -8.29, 40.47, -6.91], 6: [39.92, -8.95, 40.55, -7.72],
  7: [38.11, -8.68, 39.05, -7.23], 8: [36.91, -9.04, 37.54, -7.32], 9: [40.18, -7.85, 41.18, -6.73],
  10: [39.16, -9.46, 40.11, -8.05], 11: [38.59, -9.55, 39.38, -8.78], 12: [38.77, -8.34, 39.61, -6.95],
  13: [40.94, -8.87, 41.55, -7.93], 14: [38.78, -9.04, 39.88, -7.82], 15: [37.7, -9.33, 38.85, -8.28],
  16: [41.54, -8.96, 42.21, -8.09], 17: [41.06, -8.06, 41.99, -7.2], 18: [40.25, -8.4, 41.25, -7.3],
};

export function districtsFor([w, s, e, n]) {
  return Object.entries(DISTRICTS)
    .filter(([, [ds, dw, dn, de]]) => bboxIntersects([w, s, e, n], [dw, ds, de, dn]))
    .map(([id]) => id);
}

/** Rezultatul are câte un rând pentru fiecare pereche stație × carburant; le grupăm pe stație. */
export function parse(json) {
  const byId = new Map();
  for (const r of json?.resultado || []) {
    const key = FUEL_MAP[r.Combustivel];
    if (!key) continue;
    let st = byId.get(r.Id);
    if (!st) {
      st = { r, prices: {}, times: {} };
      byId.set(r.Id, st);
    }
    const price = parseNum(r.Preco);
    if (price == null) continue;
    // pentru 98 preferăm varianta "simplă" dacă există amândouă (setMin păstrează minimul)
    const before = st.prices[key];
    setMin(st.prices, key, price);
    if (st.prices[key] !== before) {
      const t = localIsoToUtc(r.DataAtualizacao, 'Europe/Lisbon');
      if (t) st.times[key] = t;
    }
  }
  const out = [];
  for (const [id, { r, prices, times }] of byId) {
    const s = makeStation({
      src: 'pt', id, lat: r.Latitude, lng: r.Longitude,
      name: r.Nome, brand: r.Marca,
      addr: r.Morada, city: [r.CodPostal, r.Localidade].filter(Boolean).join(' '),
      cc: 'PT', cur: 'EUR', prices, times,
    });
    if (s) out.push(s);
  }
  return out;
}

async function loadDistrict(id) {
  return memo(`pt:${id}`, 25 * 60e3, async () => {
    const url = `${BASE}?idsTiposComb=${FUEL_IDS}&idMarca=&idTipoPosto=&idDistrito=${id}&idsMunicipios=&qtdPorPagina=20000&pagina=1`;
    return parse(await fetchJson(url, { timeout: 20000 }));
  });
}

export default {
  id: 'pt',
  name: 'Portugalia',
  cc: 'PT',
  cur: 'EUR',
  attribution: 'DGEG – Direção-Geral de Energia e Geologia (precoscombustiveis.dgeg.gov.pt)',
  coverage: [[-9.6, 36.9, -6.1, 42.2]],
  tile: [0.5, 0.5],
  ttl: 1800,
  complete: true,
  async fetchTile(bbox) {
    const ids = districtsFor(bbox);
    const results = await Promise.allSettled(ids.map(loadDistrict));
    const ok = results.filter((r) => r.status === 'fulfilled');
    if (ids.length && !ok.length) throw results[0].reason;
    const stations = ok.flatMap((r) => r.value).filter((s) => inBbox(s.lat, s.lng, bbox));
    return { stations, partial: ok.length < ids.length };
  },
};
