// Cursuri de schimb (câți RON / MDL face 1 EUR), ca să putem compara prețuri între țări.
// Surse oficiale gratuite: BCE (EUR->RON etc.) și Banca Națională a Moldovei (MDL).
import { fetchText, memo } from './http.js';

const FALLBACK = { RON: 5.28, MDL: 20.0 }; // aproximativ (sept. 2026), folosit doar dacă sursele nu răspund

export async function getRates() {
  return memo('fx', 12 * 3600e3, async () => {
    const rates = { ...FALLBACK };
    const info = { source: 'fallback', date: null };
    const [ecb, bnm] = await Promise.allSettled([
      fetchText('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { timeout: 8000 }),
      (() => {
        const d = new Date();
        const ds = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
        return fetchText(`https://www.bnm.md/en/official_exchange_rates?get_xml=1&date=${ds}`, { timeout: 8000 });
      })(),
    ]);
    if (ecb.status === 'fulfilled') {
      const xml = ecb.value.text;
      const m = xml.match(/currency=['"]RON['"]\s+rate=['"]([\d.]+)['"]/);
      if (m) { rates.RON = parseFloat(m[1]); info.source = 'ECB'; }
      const t = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/);
      if (t) info.date = t[1];
    }
    if (bnm.status === 'fulfilled') {
      const m = bnm.value.text.match(/<CharCode>EUR<\/CharCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d.,]+)<\/Value>/);
      if (m) rates.MDL = parseFloat(m[2].replace(',', '.')) / (parseInt(m[1], 10) || 1);
    }
    return { base: 'EUR', rates, ...info };
  }, { staleMs: 7 * 24 * 3600e3 }).catch(() => ({ base: 'EUR', rates: { ...FALLBACK }, source: 'fallback', date: null }));
}
