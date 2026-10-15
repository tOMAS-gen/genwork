import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = 'src/app';
const map = {
  '/': ['M05/M08', '/works · /templates'], '/login': ['M03', '/login'],
  '/references': ['M04', '/my-day'], '/board': ['M10', '/board'],
  '/works/[id]': ['M06–M08/M12/M13/M17', '/works/:id y subrutas'],
  '/sectors': ['M09', '/sectors'], '/sectors/[id]': ['M09', '/sectors/:id'],
  '/groups': ['M11', '/groups'], '/groups/[id]': ['M11', '/groups/:id'],
  '/notes': ['M12', '/notes'], '/notes/[id]': ['M12', '/notes/:id'],
  '/reminders': ['M14', '/more/reminders'], '/settings': ['M15', '/more/settings'],
  '/admin': ['M16', '/more/settings'], '/portal': ['M18', '/portal'],
  '/portal/works/[id]': ['M18', '/portal/works/:id'], '/tv': ['M19', '/tv'],
};
async function walk(dir) {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...await walk(file));
    else if (/^(page\.tsx|route\.ts)$/.test(item.name)) result.push(file);
  }
  return result;
}
const pages = [], api = [];
for (const file of (await walk(root)).sort()) {
  const url = '/' + path.relative(root, path.dirname(file)).split(path.sep).filter(p => !/^\(.*\)$/.test(p)).join('/');
  if (file.endsWith('page.tsx')) {
    const mapped = map[url] ?? (url.startsWith('/admin/') ? ['M16', url.startsWith('/admin/errors/') ? '/more/settings/errors/:id' : '/more/settings/' + (['labels', 'stages', 'task-statuses'].includes(url.split('/')[2]) ? 'catalog/' + ({'task-statuses':'statuses'}[url.split('/')[2]] ?? url.split('/')[2]) : 'module/' + url.split('/')[2])]  : ['SIN CLASIFICAR', null]);
    pages.push({ url, task: mapped[0], mobile: mapped[1], source: file });
  } else {
    const source = await readFile(file, 'utf8');
    const methods = [...source.matchAll(/export\s+(?:const|(?:async\s+)?function)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)].map(m => m[1]);
    for (const match of source.matchAll(/export\s+(?:const\s+)?\{([^}]+)\}/g)) {
      for (const method of match[1].match(/\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g) ?? []) { if (!methods.includes(method)) methods.push(method); }
    }
    api.push({ url, methods, source: file });
  }
}
await writeFile('mobile/docs/web-route-inventory.json', JSON.stringify({ pages, api }, null, 2) + '\n');
console.log(`${pages.length} páginas y ${api.length} endpoints inventariados.`);
if (pages.some(p => !p.mobile)) process.exitCode = 1;
