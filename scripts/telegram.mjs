// Canal de Telegram: UN mensaje a la semana (los lunes) con lo que viene en España. Nada más: el bot no
// contesta a nadie, solo publica.
//
// Lo lanza la Action diaria después de recoger; los días que no son lunes no publica nada (salvo la primera
// vez, para que el canal no arranque vacío). Necesita dos secretos del repo:
//   TELEGRAM_TOKEN  el token del bot (de @BotFather)
//   TELEGRAM_CANAL  el canal: @todothon o su id numérico (-100…)
// Sin el token no hace nada; con el token y sin canal, solo deja el perfil del bot puesto.
// Recuerda en data/anunciados.json qué eventos ya salieron, para marcar los nuevos con 🆕.
import { readFile, writeFile } from 'node:fs/promises';

const TOKEN = process.env.TELEGRAM_TOKEN;
let CANAL = process.env.TELEGRAM_CANAL;
const SITIO = 'https://todothon.es';
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

const eventos = await leerJson('src/data/eventos.json', []);
if (!TOKEN) {
  console.log('Telegram sin configurar (falta TELEGRAM_TOKEN): no se publica nada.');
  process.exit(0);
}

// --- Perfil del bot ----------------------------------------------------------------------------------
// La descripción, el texto corto y los comandos se ponen desde aquí, no a mano en @BotFather. Solo se mandan
// cuando cambia PERFIL.version (se recuerda en data/telegram-bot.json).
const PERFIL = {
  version: 2,
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
    // Foto del bot (setMyProfilePhoto: solo JPG, subida como fichero nuevo).
    const foto = new FormData();
    foto.append('photo', JSON.stringify({ type: 'static', photo: 'attach://avatar' }));
    foto.append('avatar', new Blob([await readFile(ruta('public/telegram/avatar.jpg'))], { type: 'image/jpeg' }), 'avatar.jpg');
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setMyProfilePhoto`, { method: 'POST', body: foto });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) console.error(`No se ha podido poner la foto del bot: ${j.description || r.status}`);
    await writeFile(ruta('data/telegram-bot.json'), JSON.stringify({ ...perfilPrevio, version: PERFIL.version, bot: `@${yo.username}` }, null, 1) + '\n');
    console.log(`Perfil del bot @${yo.username} puesto (versión ${PERFIL.version}).`);
  } catch (err) {
    console.error(`No se ha podido poner el perfil del bot: ${err.message}`);
  }
}

// Sin TELEGRAM_CANAL, el canal es aquel en el que han hecho administrador al bot: se le pregunta a Telegram
// (getUpdates guarda los avisos 24 horas) y se recuerda en data/telegram-bot.json para las siguientes veces.
if (!CANAL) {
  const guardado = await leerJson('data/telegram-bot.json', {});
  CANAL = guardado.canal;
  if (!CANAL) {
    try {
      const avisos = await bot('getUpdates', { allowed_updates: ['my_chat_member', 'channel_post'] });
      const canales = avisos
        .map((u) => (u.my_chat_member?.new_chat_member?.status === 'administrator' ? u.my_chat_member.chat : u.channel_post?.chat))
        .filter((c) => c?.type === 'channel');
      const c = canales.at(-1);
      if (c) {
        CANAL = c.username ? `@${c.username}` : String(c.id);
        await writeFile(ruta('data/telegram-bot.json'), JSON.stringify({ ...guardado, canal: CANAL, canalTitulo: c.title }, null, 1) + '\n');
        console.log(`Canal encontrado: «${c.title}» (${CANAL}). Queda guardado en data/telegram-bot.json.`);
      }
    } catch (err) {
      console.error(`No se ha podido buscar el canal del bot: ${err.message}`);
    }
  }
}
if (!CANAL) {
  console.log('Falta el canal: pon TELEGRAM_CANAL, o quita al bot del canal y vuelve a hacerlo administrador (Telegram solo guarda ese aviso 24 horas).');
  process.exit(0);
}

// Foto del canal (public/telegram/avatar.png). Hace falta que el bot sea administrador con permiso de
// «Cambiar información». Solo se sube una vez por canal (se recuerda en data/telegram-bot.json).
const perfil = await leerJson('data/telegram-bot.json', {});
if (perfil.fotoCanal !== CANAL) {
  try {
    const foto = new FormData();
    foto.append('chat_id', CANAL);
    foto.append('photo', new Blob([await readFile(ruta('public/telegram/avatar.jpg'))], { type: 'image/jpeg' }), 'avatar.jpg');
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
const esLunes = new Date().getUTCDay() === 1;
const primeraVez = previo === null || previo.length === 0;
if (!esLunes && !primeraVez) {
  console.log('Telegram: hoy no toca (el resumen sale los lunes).');
  process.exit(0);
}

const enDias = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const deEspana = eventos.filter((e) => (e.pais === 'ES' || e.fuente === 'Todothon') && e.inicio && (e.fin || e.inicio) >= hoy);
const corto = (t) => (t.length > 55 ? `${t.slice(0, 52).trim()}…` : t);
const linea = (e) => `${anunciados.has(e.id) ? '•' : '🆕'} ${EMOJI[e.tipo] || '✨'} <a href="${SITIO}/evento/${e.slug}">${html(corto(e.nombre))}</a> — ${html(lugar(e))}, ${fechas(e)}`;

const proximos = deEspana.filter((e) => e.inicio <= enDias(14));
const masAdelante = deEspana.filter((e) => e.inicio > enDias(14) && !anunciados.has(e.id));
const cierran = deEspana.filter((e) => e.plazo && e.plazo >= hoy && e.plazo <= enDias(7));
const online = eventos.filter((e) => e.modalidad === 'online' && (e.fin || e.inicio || '') >= hoy).length;

const partes = [
  '🗓 <b>Esta semana en Todothon</b>',
  '',
  '<b>Las próximas dos semanas en España</b>',
  ...(proximos.length ? proximos.slice(0, 18).map(linea) : ['Nada presencial a la vista. ¿Organizas algo? Publícalo gratis en todothon.es/publicar']),
  ...(proximos.length > 18 ? [`…y ${proximos.length - 18} más en <a href="${SITIO}/hackathones-espana">la web</a>`] : []),
];
if (masAdelante.length) partes.push('', '<b>Recién anunciados para más adelante</b>', ...masAdelante.slice(0, 6).map(linea));
if (cierran.length) partes.push('', '⏰ <b>Cierran inscripción esta semana</b>', ...cierran.map((e) => `• <a href="${SITIO}/evento/${e.slug}">${html(e.nombre)}</a> — hasta el ${fecha(e.plazo)}`));
partes.push(
  '',
  `💻 Y ${online} online abiertos: <a href="${SITIO}/hackathones-online">verlos todos</a>`,
  `📅 Los que vuelven cada año: <a href="${SITIO}/cada-ano">calendario</a>`,
  '',
  '🆕 = nuevo desde el último resumen',
);

let texto = partes.join('\n');
if (texto.length > 4000) texto = texto.slice(0, texto.lastIndexOf('\n', 3950)) + `\n…\n👉 <a href="${SITIO}">Todo en todothon.es</a>`;
try {
  await api('sendMessage', { text: texto, link_preview_options: { is_disabled: true } });
  deEspana.forEach((e) => anunciados.add(e.id));
  console.log(`Telegram: resumen semanal enviado (${proximos.length} próximos, ${masAdelante.length} más adelante, ${cierran.length} cierran).`);
} catch (err) {
  console.error(`Resumen semanal: ${err.message}`);
}

// Se olvidan los que ya pasaron para que el fichero no crezca sin fin.
const vivos = new Set(eventos.map((e) => e.id));
await writeFile(ruta('data/anunciados.json'), JSON.stringify([...anunciados].filter((id) => vivos.has(id)).sort(), null, 1) + '\n');
