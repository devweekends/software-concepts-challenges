// src/repositories/users.js
// Repository: all the SQL about users. It hands up domain models.
import { query } from '../db.js';
import { fromUserRow } from '../shapes/user-model.js';

/**
 * @param {number} id
 * @returns {Promise<import('../shapes/user-model.js').User | null>}
 */
export async function findById(id) {
  const result = await query('SELECT id, email, password_hash, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0] ? fromUserRow(result.rows[0]) : null;
}
