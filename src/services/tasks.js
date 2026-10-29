// src/services/tasks.js
// Service: the rules. It knows nothing about HTTP and nothing about SQL.
import * as tasks from '../repositories/tasks.js';
import { dueAtFromText, dayNumber } from '../shapes/task-model.js';
import { generate as askPracticeApi } from '../practice-client.js';

/**
 * @typedef {{ ok: true, task: import('../shapes/task-model.js').Task }
 *   | { ok: false, reason: 'invalid' | 'not-found' | 'conflict', errors: string[] }} TaskResult
 */

/** @param {number} ownerId */
export function listTasks(ownerId) {
  return tasks.findByOwner(ownerId);
}

/** @param {number} ownerId @param {number} id @returns {Promise<TaskResult>} */
export async function getTask(ownerId, id) {
  const task = await tasks.findById(ownerId, id);
  return task ? { ok: true, task } : { ok: false, reason: 'not-found', errors: ['task not found'] };
}

/**
 * Rule: a due date may not be in the past (today is fine).
 * @param {number} ownerId
 * @param {{ title: string, due: string | null }} dto  the checked request
 * @param {Date} now
 * @returns {Promise<TaskResult>}
 */
export async function createTask(ownerId, dto, now) {
  const dueAt = dueAtFromText(dto.due);
  if (dueAt && dayNumber(dueAt) < dayNumber(now)) {
    return { ok: false, reason: 'invalid', errors: ['due must not be in the past'] };
  }
  return { ok: true, task: await tasks.insert(ownerId, dto) };
}

/**
 * Rule: a task cannot be marked done twice.
 * @param {number} ownerId @param {number} id @returns {Promise<TaskResult>}
 */
export async function markDone(ownerId, id) {
  const found = await getTask(ownerId, id);
  if (!found.ok) return found;
  if (found.task.done) return { ok: false, reason: 'conflict', errors: ['task is already done'] };
  const task = await tasks.setDone(ownerId, id);
  return task ? { ok: true, task } : { ok: false, reason: 'not-found', errors: ['task not found'] };
}

/**
 * Press Generate: send the title to the practice model API and wait for the answer.
 * The wait is 2 to 30 seconds. Module 4 is about why waiting here is a poor design.
 * @param {number} ownerId @param {number} id
 */
export async function generateAnswer(ownerId, id) {
  const found = await getTask(ownerId, id);
  if (!found.ok) return { ok: /** @type {const} */ (false), found };
  const result = await askPracticeApi(found.task.title);
  return { ok: /** @type {const} */ (true), task: found.task, result };
}
