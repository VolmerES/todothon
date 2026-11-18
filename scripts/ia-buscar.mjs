// Búsqueda con IA: Claude Haiku busca en la web hackathones de España que las fuentes automáticas
// no traen (universidades, ayuntamientos, GDG, 42, Meetup, Luma…) y los deja en data/ia.json.
//
// - Lo lanza la Action semanal (ia-semanal.yml), o a mano: node --env-file=.env scripts/ia-buscar.mjs
// - Necesita ANTHROPIC_API_KEY (secreto del repo, o en .env en local; nunca en el código).
// - No se fía de la IA: cada evento se comprueba descargando su web oficial (que exista y que el
//   nombre aparezca en ella) y que las fechas tengan sentido. Lo que no pasa se descarta.
// - Apunta lo que cuesta cada búsqueda en data/ia-informe.json.
import { readFile, writeFile } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { UA, slug, limpiarHtml, evento } from './lib.mjs';

const MODELO = 'claude-haiku-5-5';
const MAX_BUSQUEDAS = Number(process.env.IA_MAX_BUSQUEDAS || 8); // tope de búsquedas web por pasada
// Precios en dólares (noviembre de 2026). Haiku 5.5: 0,10 / 0,50 por millón de tokens si la petición
// tiene 100 000 tokens o menos, y 0,50 / 2,50 por encima. Búsqueda web: 10 $ por cada 1000.
const PRECIO = { entrada: 0.1, salida: 0.5, entradaLarga: 0.5, salidaLarga: 2.5, busqueda: 0.01 };

const RAIZ = new URL('..', import.meta.url);
const ruta = (p) => new URL(p, RAIZ);
async function leerJson(p, porDefecto) {
  try { return JSON.parse(await readFile(ruta(p), 'utf8')); } catch { return porDefecto; }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.log('Falta ANTHROPIC_API_KEY: no se busca nada.');
  process.exit(0);
}

const Esquema = z.object({
  eventos: z.array(z.object({
    nombre: z.string(),
    url: z.string().describe('Web oficial del evento (no una noticia ni un agregador)'),
    tipo: z.enum(['hackathon', 'datathon', 'ideathon', 'gamejam', 'ctf']),
    inicio: z.string().describe('AAAA-MM-DD'),
    fin: z.string().nullable().describe('AAAA-MM-DD'),
    modalidad: z.enum(['presencial', 'online', 'hibrido']),
    ciudad: z.string().nullable(),
    direccion: z.string().nullable(),
    organizador: z.string().nullable(),
    descripcion: z.string().describe('Una o dos frases en español'),
    gratis: z.boolean().nullable(),
    premio: z.string().nullable(),
  })),
});

const hoy = new Date().toISOString().slice(0, 10);
const enSeisMeses = new Date(Date.now() + 200 * 864e5).toISOString().slice(0, 10);
const actuales = await leerJson('src/data/eventos.json', []);
const previos = (await leerJson('data/ia.json', [])).filter((e) => (e.fin || e.inicio) >= hoy);
const conocidos = [...actuales.filter((e) => e.pais === 'ES' || e.fuente !== 'Devpost'), ...previos]
  .map((e) => `- ${e.nombre} (${e.inicio})`);

const peticion = `Busca en la web hackathones, datathones, ideatones, game jams y CTF que se celebren en España
(presenciales o híbridos) o que organicen entidades españolas en línea, con fecha entre ${hoy} y ${enSeisMeses}.

Dónde suelen anunciarse y no los tenemos: universidades y sus escuelas de informática, ayuntamientos y comunidades
autónomas, Google Developer Groups (GDG), los campus de 42 (Madrid, Barcelona, Málaga, Urduliz), Meetup, Luma,
asociaciones de estudiantes, empresas y aceleradoras, y las game jams y CTF españoles.

Ya tenemos estos, no los repitas:
${conocidos.slice(0, 150).join('\n') || '(ninguno)'}

Reglas:
- Solo eventos con formato de competición o maratón de desarrollo (no charlas, cursos ni ferias).
- La url tiene que ser la web oficial o la página de inscripción del propio evento.
- Si no estás seguro de un dato, déjalo a null. No inventes fechas: si no aparecen, no incluyas el evento.
- Es mejor devolver pocos eventos seguros que muchos dudosos.`;

// --- Llamada a Claude, con búsqueda web en el servidor -----------------------------------------
const cliente = new Anthropic();
const mensajes = [{ role: 'user', content: peticion }];
const uso = { entrada: 0, salida: 0, busquedas: 0, coste: 0 };
let respuesta;
for (let vuelta = 0; vuelta < 4; vuelta++) {
  respuesta = await cliente.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    messages: mensajes,
    tools: [{
      type: 'web_search_20250305', name: 'web_search', max_uses: MAX_BUSQUEDAS,
      user_location: { type: 'approximate', country: 'ES', timezone: 'Europe/Madrid' },
    }],
    output_config: { format: zodOutputFormat(Esquema) },
  });
  const u = respuesta.usage;
  const entrada = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  const larga = entrada > 100_000;
  const busquedas = u.server_tool_use?.web_search_requests || 0;
  uso.entrada += entrada;
  uso.salida += u.output_tokens || 0;
  uso.busquedas += busquedas;
  uso.coste += (entrada * (larga ? PRECIO.entradaLarga : PRECIO.entrada) + (u.output_tokens || 0) * (larga ? PRECIO.salidaLarga : PRECIO.salida)) / 1e6
    + busquedas * PRECIO.busqueda;
  // El bucle de búsquedas del servidor tiene un límite; si se para a medias, se le deja seguir.
  if (respuesta.stop_reason !== 'pause_turn') break;
  mensajes.push({ role: 'assistant', content: respuesta.content });
}

if (respuesta.stop_reason === 'refusal') throw new Error('Claude ha rechazado la petición.');
const propuestos = respuesta.parsed_output?.eventos || [];
console.log(`Claude propone ${propuestos.length} eventos (${uso.busquedas} búsquedas, ${uso.entrada} tokens de entrada, ${uso.salida} de salida, ${uso.coste.toFixed(4)} $).`);

// --- Comprobación sin IA: la web existe, nombra el evento y las fechas cuadran -----------------------
const fechaOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s));
const sinTildes = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const yaEsta = new Set([...actuales, ...previos].map((e) => `${slug(e.nombre)}|${e.inicio}`));
const urlsConocidas = new Set([...actuales, ...previos].map((e) => (e.url || '').replace(/\/$/, '')));

async function comprobar(p) {
  if (!fechaOk(p.inicio)) return 'fecha de inicio no válida';
  if (p.fin && !fechaOk(p.fin)) return 'fecha de fin no válida';
  if ((p.fin || p.inicio) < hoy) return 'ya ha pasado';
  if (p.inicio > enSeisMeses) return 'demasiado lejos';
  if (!/^https?:\/\//.test(p.url)) return 'url no válida';
  if (yaEsta.has(`${slug(p.nombre)}|${p.inicio}`) || urlsConocidas.has(p.url.replace(/\/$/, ''))) return 'ya lo teníamos';
  let r;
  try {
    r = await fetch(p.url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  } catch (err) {
    return `la web no responde (${err.cause?.code || err.name})`;
  }
  if (r.status === 404 || r.status === 410 || r.status >= 500) return `la web da ${r.status}`;
  if (!r.ok) return null; // 401/403/429: muchas webs bloquean robots; se acepta con lo que dijo Claude
  const texto = sinTildes(limpiarHtml(await r.text()));
  const palabras = sinTildes(p.nombre).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !/^(2025|2026|2027|hackathon|hackaton)$/.test(w));
  if (palabras.length && !palabras.some((w) => texto.includes(w))) return 'la web no menciona el evento';
  return null;
}

const aceptados = [];
const descartados = [];
for (const p of propuestos) {
  const motivo = await comprobar(p);
  if (motivo) { descartados.push({ nombre: p.nombre, url: p.url, motivo }); continue; }
  const presencial = p.modalidad !== 'online';
  aceptados.push(evento({
    id: `ia-${slug(p.nombre)}-${p.inicio}`,
    nombre: p.nombre.trim(),
    tipo: p.tipo,
    inicio: p.inicio,
    fin: p.fin || p.inicio,
    modalidad: p.modalidad,
    ciudad: presencial ? p.ciudad : null,
    direccion: presencial ? p.direccion || p.ciudad : null,
    pais: presencial ? 'ES' : null,
    url: p.url,
    organizador: p.organizador,
    descripcion: p.descripcion?.slice(0, 600) || null,
    gratis: p.gratis,
    premio: p.premio,
    fuente: 'Búsqueda IA',
    urlFuente: p.url,
  }));
}

for (const e of aceptados) console.log(`  + ${e.nombre} (${e.inicio}, ${e.ciudad || e.modalidad}) ${e.url}`);
for (const d of descartados) console.log(`  - ${d.nombre}: ${d.motivo}`);

await writeFile(ruta('data/ia.json'), JSON.stringify([...previos, ...aceptados], null, 1) + '\n');
const informe = await leerJson('data/ia-informe.json', { total: 0, pasadas: [] });
informe.pasadas.unshift({
  fecha: new Date().toISOString(), modelo: MODELO, busquedas: uso.busquedas,
  tokensEntrada: uso.entrada, tokensSalida: uso.salida, coste: Number(uso.coste.toFixed(4)),
  propuestos: propuestos.length, aceptados: aceptados.length, descartados,
});
informe.pasadas = informe.pasadas.slice(0, 52);
informe.total = Number((informe.total + uso.coste).toFixed(4));
await writeFile(ruta('data/ia-informe.json'), JSON.stringify(informe, null, 1) + '\n');
console.log(`Nuevos: ${aceptados.length} · descartados: ${descartados.length} · coste de esta pasada: ${uso.coste.toFixed(4)} $ · total gastado: ${informe.total} $`);
