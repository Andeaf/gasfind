// Cursuri de schimb (câte unități de monedă locală face 1 EUR), ca să putem compara prețuri între țări.
// Surse oficiale gratuite, fără cheie:
//   - BCE: toate monedele din lista zilnică (RON, DKK, GBP, CZK, HUF, PLN, SEK, CHF, NOK, ISK, ...)
//   - Banca Națională a Moldovei: MDL
//   - Narodna banka Srbije (webappcenter.nbs.rs, cursul mediu oficial): RSD
//   - Narodna banka na Republika Severna Makedonija (KLServiceNOV, cursul mediu): MKD
import { fetchText, fetchJson, memo } from './http.js';

// Aproximativ (sept. 2026), folosit doar dacă sursele nu răspund. DKK e legat de euro (ERM II).
const FALLBACK = { RON: 5.28, MDL: 20.0, DKK: 7.46, RSD: 117.5, MKD: 61.6 };

const dmy = (d) => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;

/** XML-ul BCE -> { RON: 5.1, DKK: 7.46, ... } și data listei. */
export function parseEcb(xml) {
  const rates = {};
  for (const m of String(xml).matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    const v = parseFloat(m[2]);
    if (Number.isFinite(v) && v > 0) rates[m[1]] = v;
  }
  const t = String(xml).match(/time=['"](\d{4}-\d{2}-\d{2})['"]/);
  return { rates, date: t ? t[1] : null };
}

/** XML-ul BNM (Moldova) -> MDL per EUR. */
export function parseBnm(xml) {
  const m = String(xml).match(/<CharCode>EUR<\/CharCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d.,]+)<\/Value>/);
  if (!m) return null;
  const v = parseFloat(m[2].replace(',', '.')) / (parseInt(m[1], 10) || 1);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Pagina NBS (cursul mediu, lista tip 3) -> RSD per EUR. */
export function parseNbs(html) {
  const m = String(html).match(/<td>EUR<\/td>\s*<td>978<\/td>\s*<td>[^<]*<\/td>\s*<td>1<\/td>\s*<td>([\d,.]+)<\/td>/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) && v > 50 ? v : null;
}

/** JSON-ul NBRM (Macedonia de Nord) -> MKD per EUR (cursul mediu „sreden”, ultima zi). */
export function parseNbrm(json) {
  const rows = (Array.isArray(json) ? json : []).filter((r) => r?.oznaka === 'EUR' && typeof r.sreden === 'number');
  if (!rows.length) return null;
  rows.sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
  const v = rows.at(-1).sreden / (rows.at(-1).nomin || 1);
  return Number.isFinite(v) && v > 0 ? v : null;
}

const fallback = () => ({ base: 'EUR', rates: { ...FALLBACK }, source: 'fallback', date: null });

/** Cursurile, memorate 12 h (și până la 7 zile dacă sursele pică). Niciodată nu aruncă. */
export async function getRates() {
  return memo('fx', 12 * 3600e3, async () => {
    const rates = { ...FALLBACK };
    const info = { base: 'EUR', source: 'fallback', date: null };
    const today = dmy(new Date());
    const [ecb, bnm, nbs, nbrm] = await Promise.allSettled([
      fetchText('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { timeout: 8000 }),
      fetchText(`https://www.bnm.md/en/official_exchange_rates?get_xml=1&date=${today}`, { timeout: 8000 }),
      fetchText('https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/IndexByDate?isSearchExecuted=true&ExchangeRateListTypeID=3', { timeout: 8000 }),
      fetchJson(`https://www.nbrm.mk/KLServiceNOV/GetExchangeRates?StartDate=${today}&EndDate=${today}&format=json`, { timeout: 8000 }),
    ]);
    let any = false;
    if (ecb.status === 'fulfilled') {
      const { rates: r, date } = parseEcb(ecb.value.text);
      if (Object.keys(r).length) { Object.assign(rates, r); info.source = 'ECB'; info.date = date; any = true; }
    }
    if (bnm.status === 'fulfilled') { const v = parseBnm(bnm.value.text); if (v) { rates.MDL = v; any = true; } }
    if (nbs.status === 'fulfilled') { const v = parseNbs(nbs.value.text); if (v) { rates.RSD = v; any = true; } }
    if (nbrm.status === 'fulfilled') { const v = parseNbrm(nbrm.value); if (v) { rates.MKD = v; any = true; } }
    if (!any) throw new Error('fx: nicio sursă nu a răspuns'); // memo păstrează ultima valoare bună
    return { ...info, rates };
  }, { staleMs: 7 * 24 * 3600e3 }).catch(fallback);
}
