// src/shapes/task-request.js
// The DTO, the way in. fromCreateTaskRequest answers one question:
// is this body one that Errand accepts? It returns the checked data, or a list of errors.
// It does not touch a database, a clock or a network.

// The only fields a create request may carry.
// TODO(priority): add 'priority' to this list.
const ALLOWED_FIELDS = ['title', 'due'];

/**
 * @typedef {{ title: string, due: string | null }} CreateTaskDto
 * @param {unknown} body  whatever the browser sent, parsed from JSON
 * @returns {{ ok: true, value: CreateTaskDto } | { ok: false, errors: string[] }}
 */
export function fromCreateTaskRequest(body) {
  // The body must be a plain object (null and arrays are objects too, so test for them).
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['body must be an object'] };
  }
  const record = /** @type {Record<string, unknown>} */ (body);
  const errors = [];

  // Any key that is not on the allowed list is an error.
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.includes(key)) errors.push(`unknown field: ${key}`);
  }

  const title = typeof record.title === 'string' ? record.title.trim() : '';
  if (title === '') errors.push('title must be non-empty text');

  let due = null;
  if (record.due !== undefined && record.due !== null) {
    if (isRealDate(record.due)) due = /** @type {string} */ (record.due);
    else errors.push('due must be a date like 2026-11-02');
  }

  // TODO(priority): priority is optional. If it is missing, the value is 'normal'.
  // If it is there and is not 'low', 'normal' or 'high', add the error
  // 'priority must be low, normal or high'. Return it in value: { title, due, priority }.

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { title, due } };
}

// 2026-02-30 matches the pattern of a date, but there is no 30 February.
// So build a Date from the text and check that it gives the same text back.
/** @param {unknown} text */
function isRealDate(text) {
  if (typeof text !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}
