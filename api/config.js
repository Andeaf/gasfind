import { handleConfig } from '../lib/handler.js';
import { send } from './_vercel.js';

export default async function handler(req, res) {
  send(res, await handleConfig(process.env));
}
