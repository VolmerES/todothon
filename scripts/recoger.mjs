// Recoge los eventos de todas las fuentes y escribe src/data/eventos.json.
//
// - Junta las fuentes automáticas con los eventos añadidos a mano (data/manuales.json).
// - Descarta los que ya han terminado y junta los duplicados.
// - Geolocaliza los presenciales con Nominatim (OpenStreetMap), con caché en data/geocache.json.
// - Si una fuente que antes daba eventos da 0 o falla, termina con error: GitHub Actions
//   manda un correo y ese es el único aviso que hace falta mirar.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { UA, esperar, slug } from './lib.mjs';
import * as devpost from './fuentes/devpost.mjs';
import * as mlh from './fuentes/mlh.mjs';
import * as ctftime from './fuentes/ctftime.mjs';
import * as itch from './fuentes/itch.mjs';
import * as eventbrite from './fuentes/eventbrite.mjs';
import * as devevents from './fuentes/devevents.mjs';
import * as cuarentaydos from './fuentes/42.mjs';
import * as gdg from './fuentes/gdg.mjs';
import * as luma from './fuentes/luma.mjs';
import * as meetup from './fuentes/meetup.mjs';
import * as comunidadMadrid from './fuentes/comunidad-madrid.mjs';

const FUENTES = [devpost, mlh, ctftime, itch, eventbrite, devevents, cuarentaydos, gdg, luma, meetup, comunidadMadrid];
const RAIZ = new URL('..', import.meta.url);
const ruta = (p) => new URL(p, RAIZ);

async function leerJson(p, porDefecto) {
  try { return JSON.parse(await readFile(ruta(p), 'utf8')); } catch { return porDefecto; }
}

async function geolocalizar(eventos) {
  const cache = await leerJson('data/geocache.json', {});
  for (const e of eventos) {
    if (e.modalidad === 'online' || e.lat != null) continue;
    const consulta = e.direccion || e.ciudad;
    if (!consulta) continue;
    if (!(consulta in cache)) {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&q=${encodeURIComponent(consulta)}`;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA } });
        const [hit] = await r.json();
        cache[consulta] = hit ? { lat: Number(hit.lat), lon: Number(hit.lon), nombre: hit.display_name } : null;
      } catch { cache[consulta] = null; }
      await esperar(1100); // Nominatim pide como mucho una petición por segundo.
    }
    const g = cache[consulta];
    if (g) { e.lat = g.lat; e.lon = g.lon; }
  }
  await writeFile(ruta('data/geocache.json'), JSON.stringify(cache, null, 1));
}

// Dos eventos son el mismo si empiezan el mismo día y un nombre contiene al otro
// («Hackathon Quantum Madrid» y «Hackathon Quantum Madrid en 42 Madrid»), o si tienen la misma web.
function mismoEvento(a, b) {
  if (a.url && b.url && a.url.replace(/\/$/, '') === b.url.replace(/\/$/, '')) return true;
  if (a.inicio !== b.inicio) return false;
  const x = slug(a.nombre);
  const y = slug(b.nombre);
  const [corto, largo] = x.length <= y.length ? [x, y] : [y, x];
  return corto.length >= 12 && largo.includes(corto);
}

function juntarDuplicados(eventos) {
  const juntos = [];
  for (const e of eventos) {
    const previo = juntos.find((p) => mismoEvento(p, e));
    if (!previo) { juntos.push(e); continue; }
    // Se queda el primero; los huecos se rellenan con el otro.
    for (const [k, v] of Object.entries(e)) if (previo[k] == null || (Array.isArray(previo[k]) && !previo[k].length)) previo[k] = v;
    previo.fuente = [...new Set(`${previo.fuente}, ${e.fuente}`.split(', '))].join(', ');
  }
  return juntos;
}

function ponerSlugs(eventos) {
  const usados = new Set();
  for (const e of eventos) {
    const anio = (e.inicio || '').slice(0, 4);
    let s = slug(e.nombre.includes(anio) ? e.nombre : `${e.nombre}-${anio}`) || e.id;
    while (usados.has(s)) s += '-2';
    usados.add(s);
    e.slug = s;
  }
}

async function main() {
  await mkdir(ruta('data/'), { recursive: true });
  await mkdir(ruta('src/data/'), { recursive: true });
  const informePrevio = await leerJson('data/informe.json', { fuentes: {} });
  const previos = await leerJson('src/data/eventos.json', []);
  const informe = { fecha: new Date().toISOString(), fuentes: {}, avisos: [] };
  let todos = [];

  for (const f of FUENTES) {
    try {
      const lista = await f.recoger();
      informe.fuentes[f.nombre] = lista.length;
      todos.push(...lista);
      console.log(`${f.nombre}: ${lista.length}`);
    } catch (err) {
      informe.fuentes[f.nombre] = 0;
      informe.avisos.push(`${f.nombre} ha fallado: ${err.message}`);
      console.error(`${f.nombre} FALLA: ${err.message}`);
    }
    if (informe.fuentes[f.nombre] === 0 && (informePrevio.fuentes[f.nombre] || 0) > 0) {
      informe.avisos.push(`${f.nombre} ha pasado de ${informePrevio.fuentes[f.nombre]} eventos a 0`);
      // Para no perder sus eventos mientras se arregla, se reutilizan los de la última vez
      // (los ids de cada fuente empiezan por su nombre). El aviso salta igual.
      const deAntes = previos.filter((e) => String(e.id).startsWith(`${f.nombre}-`));
      todos.push(...deAntes);
      if (deAntes.length) console.error(`${f.nombre}: se reutilizan ${deAntes.length} eventos de la última vez`);
    }
  }

  const manuales = await leerJson('data/manuales.json', []);
  informe.fuentes.manuales = manuales.length;
  todos.push(...manuales.map((e) => ({ fuente: 'Todothon', ...e })));

  // Los que encuentra la búsqueda con IA (scripts/ia-buscar.mjs, una vez por semana), ya comprobados.
  const deIa = await leerJson('data/ia.json', []);
  informe.fuentes['Búsqueda IA'] = deIa.length;
  todos.push(...deIa);

  const hoy = new Date().toISOString().slice(0, 10);
  todos = todos.filter((e) => e.nombre && (e.fin || e.inicio || hoy) >= hoy);
  todos = juntarDuplicados(todos);
  await geolocalizar(todos);
  todos.sort((a, b) => (a.inicio || '9999').localeCompare(b.inicio || '9999'));
  ponerSlugs(todos);

  informe.total = todos.length;
  informe.espana = todos.filter((e) => e.pais === 'ES').length;
  await writeFile(ruta('src/data/eventos.json'), JSON.stringify(todos, null, 1));
  await writeFile(ruta('data/informe.json'), JSON.stringify(informe, null, 1));
  console.log(`Total: ${informe.total} (en España: ${informe.espana})`);

  if (informe.avisos.length) {
    console.error('\nAVISOS:\n- ' + informe.avisos.join('\n- '));
    process.exitCode = 1;
  }
}

main();
