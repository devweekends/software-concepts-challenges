// src/controllers/profile.js
// Controller: HTTP in, HTTP out. It asks the service and builds the answer with a view model.
import { getProfile } from '../services/profile.js';
import { toUserResponse } from '../shapes/user-response.js';

/** @type {import('../router.js').Handler} */
export async function show(req, res) {
  const user = await getProfile();
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(toUserResponse(user));
}
