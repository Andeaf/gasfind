import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readXlsx, unzip, excelDate, colIndex } from '../lib/xlsx.js';
import { parse as parseWob, findFileUrl } from '../lib/ref/wob.js';
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
  const before = calls.filter((u) => /europa\.eu/.test(u)).length;
  await handleRef({});
  assert.equal(calls.filter((u) => /europa\.eu/.test(u)).length, before, 'a doua cerere vine din memo');
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
