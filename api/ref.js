import { handleRef } from '../lib/handler.js';
import { send } from './_vercel.js';

export default async function handler(req, res) {
  send(res, await handleRef(process.env));
}
