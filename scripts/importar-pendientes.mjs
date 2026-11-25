// Trae los eventos enviados desde el formulario (api/pendientes.json en el hosting) y añade
// a data/manuales.json los que aún no están. La Action abre con ellos un pull request para aprobarlos.
import { readFile, writeFile } from 'node:fs/promises';
import { UA } from './lib.mjs';

const URL_PENDIENTES = process.env.PENDIENTES_URL || 'https://todothon.volmer.es/api/pendientes.json';
const RUTA = new URL('../data/manuales.json', import.meta.url);

// El formulario vive en el mismo hosting con los dos dominios; se lee del subdominio, que ya resuelve siempre.
let r;
try {
  // Sin seguir redirecciones: un 404 que acaba en 301 hacia la página de error es que no hay pendientes.
  r = await fetch(URL_PENDIENTES, { headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' }, redirect: 'manual' });
} catch (err) {
  console.error(`No se han podido leer los pendientes: ${err.message}`);
  process.exit(0);
}
if (r.status === 404 || (r.status >= 300 && r.status < 400)) { console.log('Sin pendientes todavía.'); process.exit(0); }
if (!r.ok) { console.error(`No se han podido leer los pendientes: HTTP ${r.status}`); process.exit(0); }

// Si no llega JSON (una página de error, una redirección…), no hay nada que importar: no se para la Action.
let pendientes;
try { pendientes = await r.json(); } catch {
  console.error('Los pendientes no son JSON (¿página de error?): no se importa nada.');
  process.exit(0);
}
if (!Array.isArray(pendientes)) process.exit(0);
const manuales = JSON.parse(await readFile(RUTA, 'utf8'));
const ids = new Set(manuales.map((e) => e.id));
const hoy = new Date().toISOString().slice(0, 10);

const nuevos = pendientes
  .filter((e) => e && e.id && !ids.has(e.id) && (e.fin || e.inicio) >= hoy)
  .map(({ enviado, ...e }) => e);

if (nuevos.length) {
  manuales.push(...nuevos);
  await writeFile(RUTA, JSON.stringify(manuales, null, 1) + '\n');
}
console.log(`Eventos nuevos del formulario: ${nuevos.length}`);
for (const e of nuevos) console.log(`- ${e.nombre} (${e.inicio}) ${e.url}`);
