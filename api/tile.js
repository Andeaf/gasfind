import { handleTile } from '../lib/handler.js';
import { send, params } from './_vercel.js';

export default async function handler(req, res) {
  send(res, await handleTile(params(req), process.env));
}
