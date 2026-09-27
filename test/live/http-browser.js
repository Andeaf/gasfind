// Înlocuitor pentru lib/http.js când adaptoarele rulează în browser (testare live).
export const USER_AGENT = '';
export class HttpError extends Error {
  constructor(message, status = 0, url = '') { super(message); this.name = 'HttpError'; this.status = status; this.url = url; }
}
export const calls = [];
export async function fetchText(url, opts = {}) {
  const { method = 'GET', headers = {}, body, timeout = 20000, okStatuses = [] } = opts;
  const h = { ...headers }; delete h['User-Agent'];
  calls.push(`${method} ${url.slice(0, 140)}`);
  let res;
  try { res = await fetch(url, { method, headers: h, body, signal: AbortSignal.timeout(timeout) }); }
  catch (e) { throw new HttpError(`network error: ${e.message}`, 0, url); }
  const text = await res.text();
  if (res.status >= 400 && !okStatuses.includes(res.status)) throw new HttpError(`HTTP ${res.status}`, res.status, url);
  return { status: res.status, text, headers: {} };
}
export async function fetchJson(url, opts = {}) {
  const res = await fetchText(url, { ...opts, headers: { Accept: 'application/json', ...(opts.headers || {}) } });
  try { return JSON.parse(res.text); } catch { throw new HttpError(`invalid JSON (${res.text.slice(0, 60)})`, res.status, url); }
}
export function limiter(n) {
  let active = 0; const q = [];
  const next = () => { if (active >= n || !q.length) return; active++; const { fn, resolve, reject } = q.shift(); Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; next(); }); };
  return (fn) => new Promise((resolve, reject) => { q.push({ fn, resolve, reject }); next(); });
}
const m = new Map();
export async function memo(key, ttl, loader) { if (!m.has(key)) m.set(key, loader()); return m.get(key); }
export function setTransport() {}
export function clearMemo() { m.clear(); }
