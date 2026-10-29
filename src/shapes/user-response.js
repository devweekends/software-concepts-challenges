// src/shapes/user-response.js
// The view model of a user: only what a profile page needs.

/**
 * @param {import('./user-model.js').User} user
 */
export function toUserResponse(user) {
  return { id: user.id, email: user.email };
}
