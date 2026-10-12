import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readXlsx, unzip, excelDate, colIndex } from '../lib/xlsx.js';
import { parse as parseWob, findFileUrl } from '../lib/ref/wob.js';
import { parse as parseBe, parseDay } from '../lib/ref/be.js';
import { parse as parseLu, parseCsv } from '../lib/ref/lu.js';
import { parse as parseRs, findNotice, findNoticeInNews, parseSerbianDate } from '../lib/ref/rs.js';
import rs from '../lib/ref/rs.js';
import { parse as parseMe, findArticle } from '../lib/ref/me.js';
import { parseEcb, parseBnm, parseNbs, parseNbrm, getRates } from '../lib/fx.js';
import * as F from './fixtures.js';
import { setTransport, clearMemo } from '../lib/http.js';
import { handleRef } from '../lib/handler.js';

let restore = () => {};
afterEach(() => { restore(); clearMemo(); });

const WOB_FILE = readFileSync(new URL('./data/wob-2026-09-21.xlsx', import.meta.url));

// --- un ZIP „stored” minimal, ca să testăm cititorul XLSX independent de fișierul real ---
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) {
    let c = (crc ^ byte) & 0xFF;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zipStored(files) {
  const locals = [], centrals = [];
  let off = 0, count = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, 'utf8'), n = Buffer.from(name, 'utf8'), crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 8); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0, 10); cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(off, 42);
    locals.push(lh, n, data); centrals.push(cd, n);
    off += 30 + n.length + data.length; count++;
  }
  const cdBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(count, 8); eocd.writeUInt16LE(count, 10); eocd.writeUInt32LE(cdBuf.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cdBuf, eocd]);
}

test('XLSX: ZIP stored, șiruri partajate cu entități, inlineStr, celule și rânduri goale', () => {
  const buf = zipStored({
    'xl/workbook.xml': '<workbook><sheets><sheet name="Pre&#539;uri" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<sst><si><t>in EUR</t></si><si><t>Fuel oil Sulphur &gt; 1%</t></si><si><r><t xml:space="preserve">Gas oil </t></r><r><t>automobile</t></r></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>2</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"/><row r="3"><c r="A3"><v>46286</v></c><c r="B3" s="3"/><c r="C3" t="inlineStr"><is><t>1000 l</t></is></c><c r="D3" t="b"><v>1</v></c></row></sheetData></worksheet>',
  });
  assert.equal(unzip(buf).size, 4);
  const x = readXlsx(buf);
  assert.deepEqual(x.sheets, [{ name: 'Prețuri' }]);
  const rows = x.rows('Prețuri');
  assert.deepEqual(rows[0], ['in EUR', 'Gas oil automobile', 'Fuel oil Sulphur > 1%']);
  assert.deepEqual(rows[1], []);
  assert.equal(rows[2][0], 46286);
  assert.equal(rows[2][1], null, 'celulă goală auto-închisă');
  assert.equal(rows[2][2], '1000 l');
  assert.equal(rows[2][3], true);
  assert.equal(excelDate(46286), '2026-09-21');
  assert.equal(colIndex('AA'), 26);
});

test('Buletinul petrolier UE: fișierul real -> 27 țări, EUR/L, data prețurilor', () => {
  const rows = readXlsx(WOB_FILE).rows(0);
  const ref = parseWob(rows);
  assert.equal(Object.keys(ref).length, 27);
  assert.deepEqual(ref.RO, { kind: 'avg', cur: 'EUR', p: { e5: 1.891, diesel: 2.093, lpg: 0.896 }, date: '2026-09-21' });
  assert.deepEqual(ref.AT.p, { e5: 1.925, diesel: 2.238 }, 'Austria fără GPL');
  assert.equal(ref.HU.p.diesel, 1.957);
  assert.ok(!('EU' in ref) && !('XX' in ref), 'mediile UE27 / zona euro sunt sărite');
  assert.throws(() => parseWob([['in RON', 'Euro-super 95'], [46286, '1000 l']]), /monedă/);
  assert.throws(() => parseWob(rows.slice(0, 5)), /doar 3 țări/);
});

test('Buletinul petrolier UE: linkul fișierului din pagină, cu rezervă', () => {
  const html = '<div><a href="/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en?filename=Weekly%20Oil%20Bulletin%20Weekly%20prices%20with%20Taxes%20-%202026-09-21.xlsx" class="ecl-link" data-untranslated-label="Prices with taxes latest prices (xlsx)">Download</a></div>';
  assert.equal(findFileUrl(html), 'https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en?filename=Weekly%20Oil%20Bulletin%20Weekly%20prices%20with%20Taxes%20-%202026-09-21.xlsx');
  assert.equal(findFileUrl('<html>nimic</html>'), 'https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en');
});

test('/api/ref: o singură descărcare (memo), cache CDN 4 h, sursele și țările', async () => {
  const calls = [];
  restore = setTransport(async (url, opts) => {
    calls.push(url);
    if (/weekly-oil-bulletin_en$/.test(url)) return { status: 200, text: '<a href="/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en" data-untranslated-label="Prices with taxes latest prices">x</a>', headers: {} };
    if (/document\/download/.test(url)) { assert.equal(opts.binary, true); return { status: 200, buffer: WOB_FILE, headers: {} }; }
    if (/bestat\.statbel/.test(url)) return { status: 200, text: JSON.stringify(F.BE_BESTAT), headers: {} };
    if (/must\.gov\.rs\/vesti\/$/.test(url)) return { status: 200, text: F.RS_LIST, headers: {} };
    if (/must\.gov\.rs\/rss/.test(url)) return { status: 403, text: 'унапређење система', headers: {} };
    if (/must\.gov\.rs\/vest\//.test(url)) return { status: 200, text: F.RS_NOTICE, headers: {} };
    if (/wapi\.gov\.me/.test(url)) return { status: 200, text: JSON.stringify(F.ME_LIST), headers: {} };
    if (/gov\.me\/clanak\//.test(url)) return { status: 200, text: F.ME_ARTICLE, headers: {} };
    if (/lustat\.statec\.lu/.test(url)) { assert.equal(opts.headers.Accept, 'application/vnd.sdmx.data+csv;labels=both'); const i = ['E5301', 'E5302', 'E5305'].findIndex((f) => url.includes(f)); return { status: 200, text: F.LU_SDMX[i], headers: {} }; }
    throw new Error('offline'); // cursuri valutare: cad pe valorile de rezervă
  });
  const a = await handleRef({});
  assert.equal(a.status, 200);
  assert.match(a.headers['Cache-Control'], /s-maxage=14400/);
  const body = JSON.parse(a.body);
  assert.equal(body.countries.HU.p.diesel, 1.957);
  assert.equal(body.countries.HU.src, 'wob');
  assert.equal(body.countries.HU.kind, 'avg');
  assert.equal(body.sources.wob.license, 'CC BY 4.0');
  // sursele cu preț maxim suprascriu media UE
  assert.equal(body.countries.BE.kind, 'max');
  assert.equal(body.countries.BE.src, 'be');
  assert.equal(body.countries.BE.p.diesel, 2.494);
  assert.equal(body.countries.LU.kind, 'max');
  assert.equal(body.countries.LU.p.e5, 1.835);
  assert.equal(body.countries.FR.kind, 'avg');
  assert.equal(body.sources.lu.license, 'CC0');
  // Serbia: RSD, convertit în EUR cu cursul de rezervă (sursele de curs sunt „offline” în acest test)
  assert.equal(body.countries.RS.cur, 'RSD');
  assert.equal(body.countries.RS.p.diesel, 236);
  assert.ok(Math.abs(body.countries.RS.eur.diesel - 236 / 117.5) < 0.002, JSON.stringify(body.countries.RS.eur));
  assert.equal(body.countries.RS.until, '2026-10-02');
  assert.deepEqual(body.countries.ME.p, { e5: 1.74, e98: 1.78, diesel: 1.95 });
  assert.equal(body.countries.ME.date, '2026-09-22');
  const wob = () => calls.filter((u) => /energy\.ec\.europa\.eu/.test(u)).length; // nu și BCE (cursurile se reîncearcă când pică)
  const before = wob();
  assert.equal(before, 2, 'pagina + fișierul');
  await handleRef({});
  assert.equal(wob(), before, 'a doua cerere vine din memo');
});

test('/api/ref: sursa picată -> 200 fără țări, fără cache; mock -> date de test', async () => {
  restore = setTransport(async () => { throw new Error('offline'); });
  const a = await handleRef({});
  assert.equal(a.status, 200);
  assert.equal(a.headers['Cache-Control'], 'no-store');
  assert.deepEqual(JSON.parse(a.body).countries, {});
  const m = JSON.parse((await handleRef({ GASFIND_MOCK: '1' })).body);
  assert.equal(m.countries.BE.kind, 'max');
  assert.ok(m.countries.HU.p.diesel > 1);
});

test('Belgia: be.STAT -> preț maxim pe ziua cea mai recentă, produsele mapate', () => {
  assert.equal(parseDay('28SEP26'), '2026-09-28');
  assert.equal(parseDay('1JAN27'), '2027-01-01');
  assert.equal(parseDay('x'), null);
  const r = parseBe(F.BE_BESTAT);
  assert.deepEqual(r, { BE: { kind: 'max', cur: 'EUR', p: { e5: 2.148, e10: 2.108, e98: 2.322, diesel: 2.494, lpg: 0.972 }, date: '2026-09-28' } });
  assert.throws(() => parseBe({ facts: [] }), /nicio zi/);
  assert.throws(() => parseBe({ facts: [{ Produit: 'Essence 95 RON E5 (€/L)', Jour: '28SEP26', 'Prix TVA incl.': 2.1 }] }), /lipsesc/);
});

test('Luxemburg: LUSTAT SDMX CSV -> ultima observație per carburant, EUR/L', () => {
  assert.deepEqual(parseCsv('a,"b,c",d\r\n1,"x""y",3\n'), [['a', 'b,c', 'd'], ['1', 'x"y', '3']]);
  const r = parseLu(F.LU_SDMX);
  assert.equal(r.LU.kind, 'max');
  assert.equal(r.LU.cur, 'EUR');
  assert.deepEqual(r.LU.p, { e98: 2.059, e5: 1.835, diesel: 2.095, lpg: 0.83 });
  assert.equal(r.LU.date, '2026-09-25');
  assert.throws(() => parseLu([F.LU_SDMX[2]]), /SP95\/DIE/);
});


test('Serbia: anunțul din RSS, prețurile în RSD, perioada de valabilitate', () => {
  assert.equal(parseSerbianDate('25. септембра 2026'), '2026-09-25');
  assert.equal(parseSerbianDate('02. октобра 2026'), '2026-10-02');
  assert.equal(parseSerbianDate('25. септембар 2026.'), '2026-09-25');
  assert.equal(parseSerbianDate('1. маја 2027'), '2027-05-01');
  assert.equal(findNotice(F.RS_RSS), 'https://must.gov.rs/vest/22207');
  assert.equal(findNoticeInNews(F.RS_LIST), 'https://must.gov.rs/vest/22471/obavestenje-o-najvisoj-maloprodajnoj-ceni-derivata-nafte-evro-dizel-i-evro-premijum-bmb-95.php');
  assert.equal(findNoticeInNews('<a href="/vest/1/x.php">Altceva</a>'), null);
  assert.equal(findNotice('<rss><channel><item><title>Altceva</title><link>x</link></item></channel></rss>'), null);
  assert.deepEqual(parseRs(F.RS_NOTICE), { RS: { kind: 'max', cur: 'RSD', p: { diesel: 236, e5: 207 }, date: '2026-09-25', until: '2026-10-02' } });
  assert.throws(() => parseRs('<p>nimic</p>'), /prețurile/);
});

test('Muntenegru: articolul „Nove cijene goriva”, prețuri EUR/L', () => {
  assert.deepEqual(findArticle(F.ME_LIST), { slug: 'nove-cijene-goriva-od-22092026', date: '2026-09-22' });
  assert.equal(findArticle({ data: { data: [{ title: 'Altceva', slug: 'x' }] } }), null);
  assert.deepEqual(parseMe(F.ME_ARTICLE, '2026-09-22'), { ME: { kind: 'max', cur: 'EUR', p: { e5: 1.74, e98: 1.78, diesel: 1.95 }, date: '2026-09-22' } });
  assert.deepEqual(parseMe(F.ME_ARTICLE_COLON, '2026-10-06').ME.p, { e5: 1.77, e98: 1.81, diesel: 1.96 }, 'formatul cu două puncte (oct. 2026)');
  assert.throws(() => parseMe('<p>nimic</p>', '2026-09-22'), /prețurile/);
});

test('cursuri: BCE (toate monedele), BNM, NBS, NBRM; toate picate -> valori de rezervă', async () => {
  assert.deepEqual(parseEcb(F.ECB_XML), { rates: { USD: 1.1712, DKK: 7.4635, GBP: 0.8712, RON: 5.2811, CZK: 24.318 }, date: '2026-09-25' });
  assert.equal(parseBnm('<ValCurs><Valute><CharCode>EUR</CharCode><Nominal>1</Nominal><Value>19.8765</Value></Valute></ValCurs>'), 19.8765);
  assert.equal(parseNbs(F.NBS_HTML), 117.4831);
  assert.equal(parseNbrm(F.NBRM_JSON), 61.6044);
  assert.equal(parseNbrm([]), null);
  restore = setTransport(async (url) => {
    if (/ecb\.europa\.eu/.test(url)) return { status: 200, text: F.ECB_XML, headers: {} };
    if (/nbs\.rs/.test(url)) return { status: 200, text: F.NBS_HTML, headers: {} };
    if (/nbrm\.mk/.test(url)) return { status: 200, text: JSON.stringify(F.NBRM_JSON), headers: {} };
    throw new Error('offline');
  });
  const fx = await getRates();
  assert.equal(fx.source, 'ECB');
  assert.equal(fx.rates.DKK, 7.4635);
  assert.equal(fx.rates.RSD, 117.4831);
  assert.equal(fx.rates.MKD, 61.6044);
  assert.equal(fx.rates.MDL, 20.0, 'BNM offline -> rezervă');
  clearMemo();
  restore();
  restore = setTransport(async () => { throw new Error('offline'); });
  const fb = await getRates();
  assert.equal(fb.source, 'fallback');
  assert.equal(fb.rates.RON, 5.28);
});

test('Serbia: pagina de vești are prioritate, RSS-ul e rezerva', async () => {
  const calls = [];
  restore = setTransport(async (url) => {
    calls.push(url);
    if (/\/vesti\/$/.test(url)) return { status: 503, text: 'down', headers: {} };
    if (/\/rss\/$/.test(url)) return { status: 200, text: F.RS_RSS, headers: {} };
    if (/\/vest\/22207$/.test(url)) return { status: 200, text: F.RS_NOTICE, headers: {} };
    throw new Error(`neașteptat: ${url}`);
  });
  assert.equal((await rs.fetch()).RS.p.diesel, 236);
  assert.deepEqual(calls, ['https://must.gov.rs/vesti/', 'https://must.gov.rs/rss/', 'https://must.gov.rs/vest/22207']);
  restore();
  restore = setTransport(async () => ({ status: 403, text: '', headers: {} }));
  await assert.rejects(rs.fetch(), /HTTP 403/);
});

