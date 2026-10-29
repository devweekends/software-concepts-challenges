// src/services/profile.js
// Service: who is the user? Module 1 has one local user and no sign-in.
import * as users from '../repositories/users.js';

export const LOCAL_USER_ID = 1;

/** @returns {Promise<import('../shapes/user-model.js').User | null>} the domain model of the user */
export function getProfile() {
  return users.findById(LOCAL_USER_ID);
}
