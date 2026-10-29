// src/clock.js
// The one place that reads the clock.
// ERRAND_NOW exists only so recorded examples can show the same "today" every time.
// Do not set it when you work on Errand.

/** @returns {Date} */
export function now() {
  const fixed = process.env.ERRAND_NOW;
  return fixed ? new Date(fixed) : new Date();
}
