// Publica en el canal de Telegram los eventos nuevos de España (y los enviados por el formulario).
// Los lunes, además, un resumen de lo que hay en las dos semanas siguientes.
//
// Lo lanza la Action diaria después de recoger. Necesita dos secretos del repo:
//   TELEGRAM_TOKEN  el token del bot (de @BotFather)
//   TELEGRAM_CANAL  el canal: @todothon o su id numérico (-100…)
// Sin el token no hace nada; con el token y sin canal, solo deja el perfil del bot puesto.
// Recuerda lo ya anunciado en data/anunciados.json.
import { readFile, writeFile } from 'node:fs/promises';

const TOKEN = process.env.TELEGRAM_TOKEN;
const CANAL = process.env.TELEGRAM_CANAL;
const SITIO = 'https://todothon.es';
const MAXIMO = 8; // mensajes por día como mucho, para no inundar el canal
const RAIZ = new URL('..', import.meta.url);
const ruta = (p) => new URL(p, RAIZ);


const TIPOS = { hackathon: 'Hackathon', datathon: 'Datathon', ideathon: 'Ideatón', gamejam: 'Game jam', ctf: 'CTF' };
const EMOJI = { hackathon: '💻', datathon: '📊', ideathon: '💡', gamejam: '🎮', ctf: '🚩' };
const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fecha = (s) => dia.format(new Date(`${s}T00:00:00Z`));
const fechas = (e) => (!e.inicio ? 'Fecha por confirmar' : !e.fin || e.fin === e.inicio ? fecha(e.inicio) : `${fecha(e.inicio)} – ${fecha(e.fin)}`);
const html = (t = '') => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lugar = (e) => (e.modalidad === 'online' ? 'Online' : (e.ciudad || 'Lugar por confirmar').split(',')[0]);

async function leerJson(p, porDefecto) {
  try { return JSON.parse(await readFile(ruta(p), 'utf8')); } catch { return porDefecto; }
}

async function api(metodo, cuerpo) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CANAL, parse_mode: 'HTML', ...cuerpo }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${metodo}: ${j.description || r.status}`);
  return j;
}

function texto(e) {
  return [
    `${EMOJI[e.tipo] || '✨'} <b>${html(e.nombre)}</b>`,
    `📍 ${html(lugar(e))} · 📅 ${fechas(e)}`,
    [TIPOS[e.tipo], e.premio && `🏆 ${html(e.premio)}`, e.gratis && 'Gratis'].filter(Boolean).join(' · '),
    '',
    `👉 <a href="${SITIO}/evento/${e.slug}">Toda la info en Todothon</a>`,
  ].join('\n');
}

async function anunciar(e) {
  const caption = texto(e);
  if (e.imagen) {
    try { return await api('sendPhoto', { photo: e.imagen, caption }); } catch { /* imagen que Telegram no puede bajar */ }
  }
  return api('sendMessage', { text: caption, link_preview_options: { is_disabled: true } });
}

const eventos = await leerJson('src/data/eventos.json', []);
if (!TOKEN) {
  console.log('Telegram sin configurar (falta TELEGRAM_TOKEN): no se publica nada.');
  process.exit(0);
}

// --- Perfil del bot ----------------------------------------------------------------------------------
// La descripción, el texto corto y los comandos se ponen desde aquí, no a mano en @BotFather. Solo se mandan
// cuando cambia PERFIL.version (se recuerda en data/telegram-bot.json).
const PERFIL = {
  version: 1,
  descripcion: 'Todos los hackathones, datathones, game jams y CTF de España (y los online), en un solo sitio.\n\n'
    + 'Síguenos en el canal y te avisamos de cada evento nuevo. La web, con buscador y mapa: todothon.es',
  corta: 'Hackathones, game jams y CTF de España. Sin anuncios, de la comunidad. todothon.es',
  comandos: [
    { command: 'start', description: 'Qué es Todothon' },
    { command: 'web', description: 'Abrir todothon.es' },
  ],
};
async function bot(metodo, cuerpo) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${metodo}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${metodo}: ${j.description || r.status}`);
  return j.result;
}
const perfilPrevio = await leerJson('data/telegram-bot.json', {});
if (perfilPrevio.version !== PERFIL.version) {
  try {
    const yo = await bot('getMe', {});
    await bot('setMyDescription', { description: PERFIL.descripcion, language_code: '' });
    await bot('setMyShortDescription', { short_description: PERFIL.corta, language_code: '' });
    await bot('setMyCommands', { commands: PERFIL.comandos });
    await writeFile(ruta('data/telegram-bot.json'), JSON.stringify({ version: PERFIL.version, bot: `@${yo.username}` }, null, 1) + '\n');
    console.log(`Perfil del bot @${yo.username} puesto (versión ${PERFIL.version}).`);
  } catch (err) {
    console.error(`No se ha podido poner el perfil del bot: ${err.message}`);
  }
}

if (!CANAL) {
  console.log('Falta TELEGRAM_CANAL: el bot está listo, pero no hay canal donde publicar.');
  process.exit(0);
}

// Foto del canal (public/telegram/avatar.png). Hace falta que el bot sea administrador con permiso de
// «Cambiar información». Solo se sube una vez por canal (se recuerda en data/telegram-bot.json).
const perfil = await leerJson('data/telegram-bot.json', {});
if (perfil.fotoCanal !== CANAL) {
  try {
    const foto = new FormData();
    foto.append('chat_id', CANAL);
    foto.append('photo', new Blob([await readFile(ruta('public/telegram/avatar.png'))], { type: 'image/png' }), 'avatar.png');
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setChatPhoto`, { method: 'POST', body: foto });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.description || r.status);
    await writeFile(ruta('data/telegram-bot.json'), JSON.stringify({ ...perfil, fotoCanal: CANAL }, null, 1) + '\n');
    console.log(`Foto del canal ${CANAL} puesta.`);
  } catch (err) {
    console.error(`No se ha podido poner la foto del canal (¿el bot tiene permiso de cambiar la información?): ${err.message}`);
  }
}

const previo = await leerJson('data/anunciados.json', null);
const anunciados = new Set(previo || []);
const hoy = new Date().toISOString().slice(0, 10);

// Se anuncian los de España y los que llegan por el formulario, que aún no hayan empezado.
const interesa = (e) => (e.pais === 'ES' || e.fuente === 'Todothon') && (e.inicio || hoy) >= hoy;
const nuevos = eventos.filter((e) => interesa(e) && !anunciados.has(e.id));

let enviados = 0;
for (const e of nuevos.slice(0, MAXIMO)) {
  try {
    await anunciar(e);
    anunciados.add(e.id);
    enviados++;
    await new Promise((ok) => setTimeout(ok, 1500)); // Telegram limita los mensajes seguidos a un canal
  } catch (err) {
    console.error(`No se ha podido anunciar «${e.nombre}»: ${err.message}`);
  }
}

// Los lunes: resumen de las dos próximas semanas.
if (new Date().getUTCDay() === 1) {
  const hasta = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const proximos = eventos.filter((e) => e.pais === 'ES' && e.inicio && e.inicio >= hoy && e.inicio <= hasta);
  const online = eventos.filter((e) => e.modalidad === 'online' && (e.fin || e.inicio || '') >= hoy).length;
  const lineas = proximos.map((e) => `• <a href="${SITIO}/evento/${e.slug}">${html(e.nombre)}</a> — ${html(lugar(e))}, ${fechas(e)}`);
  const resumen = [
    '🗓 <b>Las dos próximas semanas en España</b>',
    '',
    ...(lineas.length ? lineas : ['Nada presencial a la vista. ¿Organizas algo? Publícalo gratis en todothon.es/publicar']),
    '',
    `Y ${online} online abiertos: <a href="${SITIO}/?donde=online">verlos todos</a>`,
  ].join('\n');
  try { await api('sendMessage', { text: resumen, link_preview_options: { is_disabled: true } }); enviados++; } catch (err) { console.error(`Resumen semanal: ${err.message}`); }
}

// Se olvidan los que ya pasaron para que el fichero no crezca sin fin.
const vivos = new Set(eventos.map((e) => e.id));
await writeFile(ruta('data/anunciados.json'), JSON.stringify([...anunciados].filter((id) => vivos.has(id)).sort(), null, 1) + '\n');
console.log(`Telegram: ${enviados} mensajes (${nuevos.length} eventos nuevos por anunciar).`);
