// MUNTENEGRU — Ministarstvo energetike i rudarstva (gov.me): articole „Nove cijene goriva od DD.MM.YYYY”,
// săptămânal (luni), cu prețurile MAXIME de vânzare cu amănuntul pentru EUROSUPER 95/98 și EURODIZEL, în EUR/L.
// Formatul variază de la un articol la altul: „EUROSUPER 95 1.74 €/l” sau „EUROSUPER 95: 1,77 €/l”.
// Lista articolelor vine din API-ul oficial al portalului guvernamental (wapi.gov.me), textul din pagina
// articolului. Sursă oficială de stat, fără licență explicită de reutilizare: afișăm valorile cu sursa și data.
import { fetchText, fetchJson } from '../http.js';
import { round } from '../geo.js';

const LIST = 'https://wapi.gov.me/v1/articles?organizational_unit_id=78&locale=me&per_page=8&orderby=published_at&order=desc';
const ARTICLE = 'https://www.gov.me/clanak/';
const TITLE = /^Nove cijene goriva od (\d{1,2})\.(\d{1,2})\.(\d{4})/i;

/** Lista de articole -> cel mai recent „Nove cijene goriva od ...”: { slug, date }. */
export function findArticle(json) {
  const arts = json?.data?.data || json?.data || [];
  for (const a of arts) {
    const m = TITLE.exec(String(a?.title || '').trim());
    if (m && a.slug) return { slug: a.slug, date: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` };
  }
  return null;
}

const num = (s) => { const v = parseFloat(String(s).replace(',', '.')); return Number.isFinite(v) && v > 0 ? round(v, 3) : null; };

/** HTML-ul articolului -> { ME: { kind: 'max', cur: 'EUR', p: { e5, e98, diesel }, date } } */
export function parse(html, date) {
  const t = String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const p = {};
  const e5 = num(t.match(/EUROSUPER 95\s*:?\s*([\d.,]+)\s*€\s*\/\s*l/i)?.[1]);
  const e98 = num(t.match(/EUROSUPER 98\s*:?\s*([\d.,]+)\s*€\s*\/\s*l/i)?.[1]);
  const diesel = num(t.match(/EURODIZEL\s*:?\s*([\d.,]+)\s*€\s*\/\s*l/i)?.[1]);
  if (e5) p.e5 = e5;
  if (e98) p.e98 = e98;
  if (diesel) p.diesel = diesel;
  if (!p.diesel && !p.e5) throw new Error('ME: prețurile nu au fost găsite în articol');
  return { ME: { kind: 'max', cur: 'EUR', p, date } };
}

export default {
  id: 'me',
  name: 'Ministarstvo energetike i rudarstva, Vlada Crne Gore – prețuri maxime săptămânale (gov.me)',
  short: 'preț maxim oficial (Muntenegru)',
  url: 'https://www.gov.me/mek',
  license: 'sursă oficială (gov.me)',
  ttl: 6 * 3600,
  async fetch() {
    const art = findArticle(await fetchJson(LIST, { timeout: 12000 }));
    if (!art) throw new Error('ME: niciun articol „Nove cijene goriva” în listă');
    return parse((await fetchText(ARTICLE + art.slug, { timeout: 20000 })).text, art.date);
  },
};
