// Conversii de dată/oră. Multe surse dau ora locală fără fus orar; o transformăm în UTC (ISO).

const dtfCache = new Map();
function dtf(timeZone) {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

/** Diferența (ms) dintre ora locală din `timeZone` și UTC, la momentul `ms`. */
function tzOffsetMs(ms, timeZone) {
  const p = {};
  for (const { type, value } of dtf(timeZone).formatToParts(new Date(ms))) p[type] = value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Ora locală (componente) într-un fus orar -> ISO UTC. */
export function zonedToUtcIso(y, mo, d, h = 0, mi = 0, s = 0, timeZone = 'UTC') {
  if (![y, mo, d, h, mi, s].every(Number.isFinite)) return null;
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let utc = guess - tzOffsetMs(guess, timeZone);
  utc = guess - tzOffsetMs(utc, timeZone); // corecție lângă schimbarea orei (DST)
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "2026-09-18T13:42:54+00:00" sau "2026-09-18 13:42" interpretat ca oră LOCALĂ (ignoră offsetul). */
export function localIsoToUtc(str, timeZone) {
  if (!str) return null;
  const m = String(str).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return zonedToUtcIso(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0), timeZone);
}

/** "26/09/2026 00:16" (zi/lună/an) interpretat ca oră locală. */
export function dmyToUtc(str, timeZone) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return zonedToUtcIso(+m[3], +m[2], +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), timeZone);
}

/** ISO cu offset scurt ("+02") sau complet -> ISO UTC. */
export function isoToUtc(str) {
  if (!str) return null;
  let s = String(str).trim().replace(' ', 'T');
  s = s.replace(/([+-]\d{2})$/, '$1:00').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
