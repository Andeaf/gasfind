// Cereri HTTP către sursele de date: timeout, reîncercare, CA suplimentar, cache în memorie.
import https from 'node:https';
import tls from 'node:tls';

export const USER_AGENT = 'GasFind/1.0 (harta personala a preturilor la carburanti)';

export class HttpError extends Error {
  constructor(message, status = 0, url = '') {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

/** Transportul implicit: fetch global; node:https când avem nevoie de CA suplimentar. */
async function defaultTransport(url, { method = 'GET', headers = {}, body, timeout = 15000, ca, binary } = {}) {
  if (ca) return httpsWithCa(url, { method, headers, body, timeout, ca, binary });
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeout), redirect: 'follow' });
  const out = { status: res.status, headers: Object.fromEntries(res.headers) };
  // mai multe Set-Cookie: Object.fromEntries păstrează doar ultimul; le unim cu virgulă (ca node:https)
  if (typeof res.headers.getSetCookie === 'function') { const sc = res.headers.getSetCookie(); if (sc.length) out.headers['set-cookie'] = sc.join(', '); }
  if (binary) out.buffer = Buffer.from(await res.arrayBuffer()); else out.text = await res.text();
  return out;
}

function httpsWithCa(url, { method, headers, body, timeout, ca, binary }) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method, headers, timeout,
      ca: [...tls.rootCertificates, ...ca],
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, ...(binary ? { buffer: buf } : { text: buf.toString('utf8') }), headers: res.headers });
      });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`timeout after ${timeout} ms`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

let transport = defaultTransport;
/** Pentru teste: înlocuiește transportul HTTP. Returnează funcția de restaurare. */
export function setTransport(fn) {
  const prev = transport;
  transport = fn || defaultTransport;
  return () => { transport = prev; };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cerere HTTP -> text. Aruncă HttpError pentru status >= 400 sau erori de rețea. */
export async function fetchText(url, opts = {}) {
  const { retries = 1, okStatuses = [], ...rest } = opts;
  const headers = { 'User-Agent': USER_AGENT, ...(rest.headers || {}) };
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await transport(url, { ...rest, headers });
      if (res.status >= 400 && !okStatuses.includes(res.status)) {
        const err = new HttpError(`HTTP ${res.status}`, res.status, url);
        // 5xx (în afară de 503 = limită de cereri) merită reîncercat; 4xx nu
        if (res.status >= 500 && res.status !== 503 && attempt < retries) { lastErr = err; await sleep(400 * (attempt + 1)); continue; }
        throw err;
      }
      return res;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      lastErr = new HttpError(`network error: ${e.message}`, 0, url);
      if (attempt < retries) { await sleep(400 * (attempt + 1)); continue; }
    }
  }
  throw lastErr;
}

/** Cerere HTTP -> Buffer (fișiere binare, ex. XLSX). */
export async function fetchBuffer(url, opts = {}) {
  const res = await fetchText(url, { ...opts, binary: true });
  if (!res.buffer) res.buffer = Buffer.from(res.text || '', 'utf8'); // transport de test care întoarce text
  return res;
}

/** Cerere HTTP -> JSON parsat. */
export async function fetchJson(url, opts = {}) {
  const res = await fetchText(url, { ...opts, headers: { Accept: 'application/json', ...(opts.headers || {}) } });
  try {
    return JSON.parse(res.text);
  } catch {
    throw new HttpError(`invalid JSON (${res.text.slice(0, 60).replace(/\s+/g, ' ')})`, res.status, url);
  }
}

/** Limitează numărul de sarcini asincrone rulate simultan. */
export function limiter(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || !queue.length) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

/**
 * Cache în memorie (per instanță de server). Deduplică cererile simultane și, dacă sursa
 * pică, întoarce ultima valoare bună (până la `staleMs`).
 */
const memoStore = new Map();
export async function memo(key, ttlMs, loader, { staleMs = 6 * 3600e3 } = {}) {
  const now = Date.now();
  const hit = memoStore.get(key);
  if (hit && hit.value !== undefined && hit.expires > now) return hit.value;
  if (hit && hit.promise) return hit.promise;
  const promise = (async () => {
    try {
      const value = await loader();
      memoStore.set(key, { value, expires: Date.now() + ttlMs, stored: Date.now() });
      return value;
    } catch (e) {
      if (hit && hit.value !== undefined && now - hit.stored < staleMs) {
        memoStore.set(key, { ...hit, promise: undefined, expires: Date.now() + 60e3 });
        return hit.value;
      }
      memoStore.delete(key);
      throw e;
    }
  })();
  memoStore.set(key, { ...(hit || {}), promise });
  return promise;
}

export function clearMemo() { memoStore.clear(); }
