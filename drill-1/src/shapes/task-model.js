// src/shapes/task-model.js
// The domain model of a task: what the rules use. Real dates, a done flag, the owner.
// The repository builds it from a row. Nothing outside Errand ever sees it.

/**
 * @typedef {object} Task
 * @property {number} id
 * @property {number} ownerId
 * @property {string} title
 * @property {Date | null} dueAt
 * @property {boolean} done
 * @property {Date} createdAt
 */

/**
 * The row is what Postgres stores, as the pg driver returns it.
 * @typedef {object} TaskRow
 * @property {number} id
 * @property {number} owner_id
 * @property {string} title
 * @property {Date | null} due_at
 * @property {'open' | 'done'} status
 * @property {Date} created_at
 */

/**
 * Row to domain model: rename the columns, turn the status word into a flag.
 * @param {TaskRow} row
 * @returns {Task}
 */
export function fromTaskRow(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    dueAt: row.due_at,
    done: row.status === 'done',
    createdAt: row.created_at,
    // TODO(priority): carry the priority: priority: row.priority,
  };
}

/**
 * The form sends a due date as text such as 2026-11-02. The database stores a timestamp.
 * @param {string | null} text
 * @returns {Date | null}
 */
export function dueAtFromText(text) {
  return text ? new Date(`${text}T00:00:00Z`) : null;
}

/**
 * The number of the UTC calendar day a Date falls on. Two Dates on the same day give the same number.
 * @param {Date} date
 */
export function dayNumber(date) {
  return Math.floor(date.getTime() / 86400000);
}
