// src/controllers/tasks.js
// Controller: HTTP in, HTTP out. It reads the request, calls the service, and builds the answer
// with a function from src/shapes. It contains no SQL and no rules.
import * as service from '../services/tasks.js';
import { LOCAL_USER_ID } from '../services/profile.js';
import { fromCreateTaskRequest } from '../shapes/task-request.js';
import { toTaskResponse, toAnswerResponse } from '../shapes/task-response.js';
import { renderTaskList } from '../views/task-list.js';
import { readJson } from '../http.js';
import { now } from '../clock.js';

const STATUS = { invalid: 400, 'not-found': 404, conflict: 409 };

// A task id in the URL must be a whole number.
/** @param {string} text */
function parseId(text) {
  return /^[0-9]{1,9}$/.test(text) ? Number(text) : null;
}

/** @type {import('../router.js').Handler} */
export async function listPage(req, res) {
  const tasks = await service.listTasks(LOCAL_USER_ID);
  res.html(renderTaskList(tasks.map((task) => toTaskResponse(task, now()))));
}

/** @type {import('../router.js').Handler} */
export async function list(req, res) {
  const tasks = await service.listTasks(LOCAL_USER_ID);
  res.json(tasks.map((task) => toTaskResponse(task, now())));
}

/** @type {import('../router.js').Handler} */
export async function show(req, res, { params }) {
  const id = parseId(params.id);
  const found = id === null ? null : await service.getTask(LOCAL_USER_ID, id);
  if (!found || !found.ok) return res.status(404).json({ error: 'not found' });
  res.json(toTaskResponse(found.task, now()));
}

/** @type {import('../router.js').Handler} */
export async function create(req, res) {
  const body = await readJson(req);
  if (!body.ok) return res.status(400).json({ errors: body.errors });
  const dto = fromCreateTaskRequest(body.value);
  if (!dto.ok) return res.status(400).json({ errors: dto.errors });
  const created = await service.createTask(LOCAL_USER_ID, dto.value, now());
  if (!created.ok) return res.status(STATUS[created.reason]).json({ errors: created.errors });
  res.status(201).json(toTaskResponse(created.task, now()));
}

/** @type {import('../router.js').Handler} */
export async function markDone(req, res, { params }) {
  const id = parseId(params.id);
  if (id === null) return res.status(404).json({ error: 'not found' });
  const done = await service.markDone(LOCAL_USER_ID, id);
  if (!done.ok) return res.status(STATUS[done.reason]).json({ errors: done.errors });
  res.json(toTaskResponse(done.task, now()));
}

/** @type {import('../router.js').Handler} */
export async function generate(req, res, { params }) {
  const id = parseId(params.id);
  if (id === null) return res.status(404).json({ error: 'not found' });
  const outcome = await service.generateAnswer(LOCAL_USER_ID, id);
  if (!outcome.ok) return res.status(404).json({ error: 'not found' });
  const { result } = outcome;
  if (result.ok) return res.json(toAnswerResponse(id, result.answer));
  if (result.status === 429) {
    if (result.retryAfterSeconds) res.setHeader('Retry-After', String(result.retryAfterSeconds));
    return res.status(429).json({ errors: [`the practice API has no credits left (${result.error})`] });
  }
  res.status(502).json({ errors: [`the practice API refused the call: ${result.error}`] });
}
