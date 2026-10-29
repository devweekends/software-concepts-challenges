// src/routes.js
// Route: the URL and the method pick a controller. No SQL, no HTML, no rules.
import * as tasks from './controllers/tasks.js';
import * as profile from './controllers/profile.js';

/** @param {ReturnType<typeof import('./router.js').createRouter>} router */
export function registerRoutes(router) {
  router.add('GET', '/', tasks.listPage);
  router.add('GET', '/tasks', tasks.list);
  router.add('POST', '/tasks', tasks.create);
  router.add('GET', '/tasks/:id', tasks.show);
  router.add('POST', '/tasks/:id/done', tasks.markDone);
  router.add('POST', '/tasks/:id/generate', tasks.generate);
  router.add('GET', '/profile', profile.show);
}
