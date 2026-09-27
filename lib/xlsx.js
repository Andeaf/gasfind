// Cititor minimal de XLSX (ZIP + XML), fără dependențe. Suficient pentru fișierele oficiale mici
// (Buletinul petrolier UE etc.): foi, șiruri partajate, celule numerice/text, date Excel.
import { inflateRawSync } from 'node:zlib';

const SIG_LOCAL = 0x04034b50, SIG_CD = 0x02014b50, SIG_EOCD = 0x06054b50;

export const isZip = (buf) => Buffer.isBuffer(buf) && buf.length > 22 && buf.readUInt32LE(0) === SIG_LOCAL;

/** Dezarhivează un ZIP mic (fără ZIP64): Map nume -> Buffer. */
export function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== SIG_EOCD) eocd--;
  if (eocd < 0) throw new Error('ZIP invalid (lipsește directorul central)');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== SIG_CD) throw new Error('ZIP invalid (intrare coruptă)');
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28), xlen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32);
    const local = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nlen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    if (method === 8) out.set(name, inflateRawSync(data));
    else if (method === 0) out.set(name, data);
    else throw new Error(`ZIP: metodă de compresie ${method} nesuportată`);
    off += 46 + nlen + xlen + clen;
  }
  return out;
}

const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
export function unescapeXml(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  });
}

const texts = (xml) => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join('');

/** "A" -> 0, "Z" -> 25, "AA" -> 26 */
export function colIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Data Excel (zile de la 1899-12-30) -> "YYYY-MM-DD". */
export function excelDate(serial) {
  if (typeof serial !== 'number' || !Number.isFinite(serial) || serial < 1) return null;
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400e3).toISOString().slice(0, 10);
}

function parseSheet(xml, sst) {
  const rows = [];
  for (const row of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells = [];
    for (const c of (row[1] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], inner = c[2] || '';
      const ref = attrs.match(/\br="([A-Z]+)\d+"/);
      const type = (attrs.match(/\bt="(\w+)"/) || [])[1];
      const col = ref ? colIndex(ref[1]) : cells.length;
      let v = null;
      if (type === 'inlineStr') v = texts(inner);
      else {
        const m = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (m) {
          if (type === 's') v = sst[Number(m[1])] ?? null;
          else if (type === 'str' || type === 'e') v = unescapeXml(m[1]);
          else if (type === 'b') v = m[1] === '1';
          else v = Number(m[1]);
        }
      }
      cells[col] = v;
    }
    rows.push(cells);
  }
  return rows;
}

/** Citește un XLSX: { sheets: [{ name }], rows(numeSauIndex) -> [[celule...], ...] (rândurile goale lipsesc). */
export function readXlsx(buf) {
  const z = unzip(buf);
  const text = (name) => { const b = z.get(name); return b ? b.toString('utf8') : ''; };
  const rels = {};
  for (const m of text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = m[1].match(/\bId="([^"]+)"/), target = m[1].match(/\bTarget="([^"]+)"/);
    if (id && target) rels[id[1]] = unescapeXml(target[1]);
  }
  const sheets = [];
  for (const m of text('xl/workbook.xml').matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = m[1].match(/\bname="([^"]*)"/), rid = m[1].match(/\br:id="([^"]+)"/);
    let target = (rid && rels[rid[1]]) || `worksheets/sheet${sheets.length + 1}.xml`;
    target = target.startsWith('/') ? target.slice(1) : target.startsWith('xl/') ? target : `xl/${target}`;
    sheets.push({ name: name ? unescapeXml(name[1]) : `Sheet${sheets.length + 1}`, path: target });
  }
  const sst = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  return {
    sheets: sheets.map((s) => ({ name: s.name })),
    rows(which = 0) {
      const s = typeof which === 'number' ? sheets[which] : sheets.find((x) => x.name === which);
      if (!s) throw new Error(`XLSX: foaia ${JSON.stringify(which)} nu există`);
      return parseSheet(text(s.path), sst);
    },
  };
}
