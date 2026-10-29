// src/shapes/user-model.js
// The domain model of a user: what the rules use. It holds the password hash,
// because sign-in code (module 5) needs it. That is exactly why it must never go out as it is.

/**
 * @typedef {object} User
 * @property {number} id
 * @property {string} email
 * @property {string} passwordHash
 * @property {Date} createdAt
 */

/**
 * @param {{ id: number, email: string, password_hash: string, created_at: Date }} row
 * @returns {User}
 */
export function fromUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}
