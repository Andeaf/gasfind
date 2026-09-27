// Adaptor comun pentru funcțiile Vercel (Node.js).
export function send(res, out) {
  res.statusCode = out.status;
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  res.end(out.body);
}

export function params(req) {
  return new URL(req.url, 'http://localhost').searchParams;
}
