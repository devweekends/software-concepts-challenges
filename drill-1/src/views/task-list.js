// src/views/task-list.js
// View: the HTML page. It shows the view models it is given and knows nothing else.
// No SQL, no rules. The small script at the end sends the form and the buttons to the API.

/** @param {unknown} value */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

/** @param {ReturnType<typeof import('../shapes/task-response.js').toTaskResponse>} task */
function renderTask(task) {
  const due = task.due ? ` - due ${escapeHtml(task.due)} (${escapeHtml(task.dueIn)})` : '';
  // TODO(priority): show the priority next to the title.
  const state = task.done ? ' [done]' : '';
  const buttons = task.done ? '' : `<button data-done="${task.id}">Done</button> `;
  return `<li>${escapeHtml(task.title)}${due}${state}
    ${buttons}<button data-generate="${task.id}">Generate</button>
    <span class="answer" id="answer-${task.id}"></span></li>`;
}

/** @param {ReturnType<typeof import('../shapes/task-response.js').toTaskResponse>[]} tasks the view models */
export function renderTaskList(tasks) {
  const items = tasks.length > 0 ? tasks.map(renderTask).join('\n') : '<li>No tasks yet.</li>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Errand</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
  li { margin-bottom: 0.75rem; }
  .answer { display: block; color: #444; }
  .error { color: #a00; }
</style>
</head>
<body>
<h1>Errand</h1>
<form id="new-task">
  <label>Title <input name="title" required></label>
  <label>Due <input name="due" type="date"></label>
  <button type="submit">Add task</button>
  <span id="form-error" class="error"></span>
</form>
<ul id="tasks">
${items}
</ul>
<script>
  const show = (id, text, isError) => {
    const target = document.getElementById(id);
    target.textContent = text;
    target.className = isError ? 'error' : 'answer';
  };
  document.getElementById('new-task').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const body = { title: form.get('title') };
    if (form.get('due')) body.due = form.get('due');
    const response = await fetch('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (response.ok) location.reload();
    else show('form-error', (await response.json()).errors.join(', '), true);
  });
  document.getElementById('tasks').addEventListener('click', async (event) => {
    const done = event.target.dataset.done;
    const generate = event.target.dataset.generate;
    if (done) {
      await fetch('/tasks/' + done + '/done', { method: 'POST' });
      location.reload();
    } else if (generate) {
      show('answer-' + generate, 'Waiting for the practice API (2 to 30 seconds)...', false);
      const response = await fetch('/tasks/' + generate + '/generate', { method: 'POST' });
      const body = await response.json();
      show('answer-' + generate, response.ok ? body.text + ' (' + body.creditsCharged + ' credits, ' + body.creditsRemaining + ' left)' : body.errors.join(', '), !response.ok);
    }
  });
</script>
</body>
</html>
`;
}
