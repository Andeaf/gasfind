import { handleDetail } from '../lib/handler.js';
import { send, params } from './_vercel.js';

export default async function handler(req, res) {
  send(res, await handleDetail(params(req), process.env));
}
