// src/shapes/task-response.js
// The view model of a task, the way out. It is built key by key, so a new field
// in the domain model or in the table cannot reach the browser by accident.
import { dayNumber } from './task-model.js';

/**
 * @param {number} days  days from today to the due date (negative: overdue)
 */
function describeDays(days) {
  if (days === 0) return 'today';
  if (days > 0) return days === 1 ? '1 day' : `${days} days`;
  const late = -days;
  return late === 1 ? '1 day overdue' : `${late} days overdue`;
}

/**
 * Domain model to view model. It takes the time as an argument and never reads the clock.
 * @param {import('./task-model.js').Task} task
 * @param {Date} now
 */
export function toTaskResponse(task, now) {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    due: task.dueAt ? task.dueAt.toISOString().slice(0, 10) : null,
    dueIn: task.dueAt ? describeDays(dayNumber(task.dueAt) - dayNumber(now)) : null,
    // TODO(priority): send the priority: priority: task.priority,
  };
}

/**
 * The answer to Generate, as the browser sees it.
 * @param {number} taskId
 * @param {import('../practice-client.js').PracticeAnswer} answer
 */
export function toAnswerResponse(taskId, answer) {
  return {
    taskId,
    text: answer.text,
    creditsCharged: answer.creditsCharged,
    creditsRemaining: answer.creditsRemaining,
  };
}
