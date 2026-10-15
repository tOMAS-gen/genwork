import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.context/mobile-parity');
await mkdir(root, { recursive: true });
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const files = (await readdir(root)).filter((f) => /\.(png|jpe?g)$/.test(f));
const groups = new Map();
for (const file of files.sort()) {
  const key = file.replace(/-(web|android|ios)\.(png|jpe?g)$/, '');
  groups.set(key, [...(groups.get(key) ?? []), file]);
}
const sections = [...groups].map(([key, images]) => `<section><h2>${escape(key)}</h2><div class="pair">${images.map((f) => `<figure><figcaption>${escape(f)}</figcaption><a href="${encodeURIComponent(f)}"><img loading="lazy" src="${encodeURIComponent(f)}" alt="${escape(f)}"></a></figure>`).join('')}</div></section>`).join('');
await writeFile(path.join(root, 'index.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GenWork — comparación web y móvil</title><style>body{font:16px system-ui;background:#151515;color:#eee;margin:24px}h1{font-size:24px}h2{font-size:18px}.pair{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}figure{margin:0;max-width:430px}img{width:100%;height:auto}figcaption{margin:12px 0;overflow-wrap:anywhere}section{border-top:1px solid #444;margin-top:24px}a{color:#8aa0ff}</style><h1>GenWork — comparación web y móvil</h1><p>Capturas de ejecución. Cada pareja debe usar el mismo recurso, usuario, tema y ancho lógico. Los nombres sin pareja no certifican paridad.</p>${sections || '<p>Todavía no hay capturas. Usá nombres como M05-admin-dark-390-web.png y M05-admin-dark-390-android.png.</p>'}</html>`);
console.log(`Comparador: ${path.join(root, 'index.html')}`);
