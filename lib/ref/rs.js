// SERBIA — Ministarstvo unutrašnje i spoljne trgovine (must.gov.rs): „Обавештење о највишој малопродајној
// цени деривата нафте” — prețuri MAXIME pentru EVRO DIZEL și EVRO PREMIJUM BMB 95, în RSD/L, publicate
// vinerea la ora 15 și valabile o săptămână. Găsim ultimul anunț în pagina publică de vești (/vesti/) sau,
// dacă ea nu răspunde, în fluxul RSS oficial (din octombrie 2026 /rss/ dă 403 „унапређење система”),
// apoi citim numerele din textul HTML al anunțului. Sursă oficială de stat; site-ul e publicat sub licență
// CC BY-NC-ND 3.0 RS, așa că afișăm doar valorile (fapte), cu sursa și data.
import { fetchText } from '../http.js';
import { round } from '../geo.js';

const SITE = 'https://must.gov.rs';
const NEWS = `${SITE}/vesti/`;
const RSS = `${SITE}/rss/`;
const TITLE = /ОБАВЕШТЕЊЕ О НАЈВИШОЈ МАЛОПРОДАЈНОЈ ЦЕНИ/i;
const MONTHS = { јан: 1, феб: 2, мар: 3, апр: 4, мај: 5, јун: 6, јул: 7, авг: 8, сеп: 9, окт: 10, нов: 11, дец: 12 }; // primele 3 litere (nominativ sau genitiv)

/** "25. септембра 2026" -> "2026-09-25" (lunile la genitiv: септембра, октобра, маја...) */
export function parseSerbianDate(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\.\s*([Ѐ-ӿ]+)\s+(\d{4})/); // tot blocul chirilic (ј, љ, њ, ћ, ђ nu sunt în а–ш)
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Primul anunț de preț maxim din RSS -> URL-ul lui. */
export function findNotice(rssXml) {
  for (const it of String(rssXml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = it[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    if (!TITLE.test(title)) continue;
    const link = it[1].match(/<link>\s*([^<\s]+)\s*<\/link>/)?.[1];
    if (link) return link;
  }
  return null;
}

/** Pagina de vești -> URL-ul celui mai nou anunț de preț maxim (id-ul cel mai mare). */
export function findNoticeInNews(html) {
  let best = null;
  for (const m of String(html).matchAll(/<a[^>]+href="(\/vest\/(\d+)\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const text = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (TITLE.test(text) && (!best || Number(m[2]) > best.id)) best = { id: Number(m[2]), url: SITE + m[1] };
  }
  return best ? best.url : null;
}

const num = (s) => { const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return Number.isFinite(v) && v > 0 ? round(v, 2) : null; };

/** HTML-ul anunțului -> { RS: { kind: 'max', cur: 'RSD', p: { diesel, e5 }, date, until } } */
export function parse(html) {
  const t = String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const diesel = num(t.match(/EVRO DIZEL,?\s+у износу\s+([\d.,]+)\s+динара/i)?.[1]);
  const e5 = num(t.match(/EVRO PREMIJUM BMB 95,?\s+у износу\s+([\d.,]+)\s+динара/i)?.[1]);
  if (!diesel && !e5) throw new Error('RS: prețurile nu au fost găsite în anunț');
  const period = t.match(/од 15 часова\s+(\d{1,2}\.\s*[Ѐ-ӿ]+\s+\d{4})\.?\s*године\s+до 15 часова\s+(\d{1,2}\.\s*[Ѐ-ӿ]+\s+\d{4})/);
  const date = parseSerbianDate(period?.[1]) || parseSerbianDate(String(html).match(/class="article-date">\s*([^<]+?)\s*</)?.[1]);
  if (!date) throw new Error('RS: data anunțului nu a fost găsită');
  const p = {};
  if (diesel) p.diesel = diesel;
  if (e5) p.e5 = e5;
  const out = { kind: 'max', cur: 'RSD', p, date };
  const until = parseSerbianDate(period?.[2]);
  if (until) out.until = until;
  return { RS: out };
}

export default {
  id: 'rs',
  name: 'Ministarstvo unutrašnje i spoljne trgovine Republike Srbije – prețuri maxime săptămânale (must.gov.rs)',
  short: 'preț maxim oficial (Serbia)',
  url: 'https://must.gov.rs/vesti/',
  license: 'sursă oficială; site sub CC BY-NC-ND 3.0 RS',
  ttl: 6 * 3600,
  async fetch() {
    let link = null, err = null;
    try { link = findNoticeInNews((await fetchText(NEWS, { timeout: 12000 })).text); } catch (e) { err = e; }
    if (!link) {
      try { link = findNotice((await fetchText(RSS, { timeout: 12000 })).text); } catch (e) { throw err || e; }
    }
    if (!link) throw new Error('RS: niciun anunț de preț maxim în pagina de vești sau în RSS');
    return parse((await fetchText(link, { timeout: 12000 })).text);
  },
};
