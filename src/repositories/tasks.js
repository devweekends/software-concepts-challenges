// src/repositories/tasks.js
// Repository: all the SQL about tasks, and nothing else. It hands up domain models.
// Every query names the owner, so one user can never read another user's task.
import { query } from '../db.js';
import { fromTaskRow, dueAtFromText } from '../shapes/task-model.js';

// The columns every query reads. A column that is not listed here never leaves the database.
// TODO(priority): add priority to this list.
const COLUMNS = 'id, owner_id, title, due_at, status, created_at';

/**
 * @param {number} ownerId
 * @returns {Promise<import('../shapes/task-model.js').Task[]>}
 */
export async function findByOwner(ownerId) {
  const result = await query(`SELECT ${COLUMNS} FROM tasks WHERE owner_id = $1 ORDER BY id`, [ownerId]);
  return result.rows.map(fromTaskRow);
}

/**
 * @param {number} ownerId
 * @param {number} id
 * @returns {Promise<import('../shapes/task-model.js').Task | null>}
 */
export async function findById(ownerId, id) {
  const result = await query(`SELECT ${COLUMNS} FROM tasks WHERE owner_id = $1 AND id = $2`, [ownerId, id]);
  return result.rows[0] ? fromTaskRow(result.rows[0]) : null;
}

/**
 * @param {number} ownerId
 * @param {{ title: string, due: string | null }} dto  the checked request
 * @returns {Promise<import('../shapes/task-model.js').Task>}
 */
export async function insert(ownerId, dto) {
  // TODO(priority): write the priority too: add the column to the INSERT, add $4, pass dto.priority.
  const result = await query(
    `INSERT INTO tasks (owner_id, title, due_at) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [ownerId, dto.title, dueAtFromText(dto.due)],
  );
  return fromTaskRow(result.rows[0]);
}

/**
 * @param {number} ownerId
 * @param {number} id
 * @returns {Promise<import('../shapes/task-model.js').Task | null>}
 */
export async function setDone(ownerId, id) {
  const result = await query(
    `UPDATE tasks SET status = 'done' WHERE owner_id = $1 AND id = $2 RETURNING ${COLUMNS}`,
    [ownerId, id],
  );
  return result.rows[0] ? fromTaskRow(result.rows[0]) : null;
}
