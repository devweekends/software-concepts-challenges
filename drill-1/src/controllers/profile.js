// src/controllers/profile.js
// Controller: HTTP in, HTTP out. It asks the service and sends the answer.
import { getProfile } from '../services/profile.js';

/** @type {import('../router.js').Handler} */
export async function show(req, res) {
  const user = await getProfile();
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
}
