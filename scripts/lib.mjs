// Utilidades compartidas por los recolectores.

export const UA = 'Todothon/0.1 (+https://todothon.es)';

export async function traer(url, { json = false, cabeceras = {} } = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8', ...cabeceras } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return json ? r.json() : r.text();
}

export const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

// Algunas webs (dev.events, Eventbrite, la API de 42) bloquean a los servidores de GitHub. En la Action
// (TODOTHON_VIA_HOSTING=1) se piden a través de public/api/traer.php, que corre en el hosting.
export const VIA_HOSTING = process.env.TODOTHON_VIA_HOSTING === '1';
const HOSTING = process.env.TODOTHON_HOSTING || 'https://todothon.volmer.es';
export function traerHosting(parametros, opciones = {}) {
  return traer(`${HOSTING}/api/traer.php?${new URLSearchParams(parametros)}`, opciones);
}

// Nombres con formato de hackathon. Sirve para filtrar fuentes generalistas (Eventbrite, dev.events…).
export const FORMATO = /hack[aá]?th?[oó]n|hackathon|datat?h?[oó]n|ideat?h?[oó]n|game ?jam|gamejam|jam de (video)?juegos|\bctf\b|capture the flag|buildathon|makeathon|codeathon|\w{3,}thon\b|marat[oó]n de (c[oó]digo|programaci[oó]n|datos|ideas)/i;

// Todos los objetos schema.org de tipo *Event de los <script type="application/ld+json"> de una página.
export function eventosLd(html) {
  const salida = [];
  const visitar = (x) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(visitar);
    if (/Event$/.test([].concat(x['@type'] || '').join(' '))) salida.push(x);
    if (x.itemListElement) visitar(x.itemListElement.map((i) => i.item || i));
    if (x['@graph']) visitar(x['@graph']);
  };
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { visitar(JSON.parse(m[1])); } catch { /* bloque roto: se ignora */ }
  }
  return salida;
}

// Pasa un evento schema.org al formato común.
export function desdeLd(x, { id, fuente, urlFuente }) {
  const lugar = x.location || {};
  const dir = typeof lugar.address === 'string'
    ? { addressLocality: lugar.address.split(',')[0].trim(), streetAddress: lugar.address }
    : lugar.address || (typeof lugar.name === 'string' ? { addressLocality: lugar.name.split(',')[0].trim() } : {});
  const online = /Online/i.test(x.eventAttendanceMode || '') || lugar['@type'] === 'VirtualLocation';
  const ciudad = dir.addressLocality || null;
  const direccion = [lugar.name, dir.streetAddress, dir.postalCode, ciudad].filter(Boolean).join(', ') || null;
  const oferta = [].concat(x.offers || [])[0];
  return evento({
    id,
    nombre: limpiarHtml(x.name || '').replace(/^copia de /i, ''), // borradores duplicados por el organizador
    tipo: tipoDe(x.name || ''),
    inicio: soloFecha(x.startDate),
    fin: soloFecha(x.endDate || x.startDate),
    modalidad: online ? 'online' : 'presencial',
    ciudad: online ? null : ciudad,
    direccion: online ? null : direccion,
    pais: online ? null : 'ES',
    lat: lugar.geo?.latitude != null ? Number(lugar.geo.latitude) : null,
    lon: lugar.geo?.longitude != null ? Number(lugar.geo.longitude) : null,
    url: x.url || urlFuente,
    imagen: [].concat(x.image || [])[0] || null,
    organizador: [].concat(x.organizer || [])[0]?.name || null,
    descripcion: x.description ? limpiarHtml(x.description).slice(0, 600) : null,
    gratis: oferta ? Number(oferta.price || oferta.lowPrice || 0) === 0 : null,
    fuente,
    urlFuente,
  });
}

// --- España -----------------------------------------------------------------

const CIUDADES = [
  'españa', 'espana', 'spain', 'madrid', 'barcelona', 'valencia', 'sevilla', 'seville', 'bilbao', 'málaga', 'malaga',
  'zaragoza', 'a coruña', 'la coruña', 'coruña', 'vigo', 'granada', 'salamanca', 'murcia', 'alicante', 'gijón', 'gijon',
  'oviedo', 'santander', 'pamplona', 'donostia', 'san sebastián', 'san sebastian', 'valladolid', 'tenerife',
  'gran canaria', 'las palmas', 'canarias', 'palma de mallorca', 'mallorca', 'ibiza', 'menorca', 'castellón', 'castellon',
  'tarragona', 'girona', 'lleida', 'córdoba, es', 'cádiz', 'cadiz', 'almería', 'almeria', 'huelva', 'jaén', 'jaen',
  'burgos', 'vitoria', 'gasteiz', 'logroño', 'logrono', 'león, es', 'cáceres', 'caceres', 'badajoz', 'toledo',
  'ciudad real', 'albacete', 'cuenca, es', 'guadalajara, es', 'segovia', 'ávila', 'avila', 'soria', 'palencia', 'zamora',
  'lugo', 'ourense', 'pontevedra', 'santiago de compostela', 'huesca', 'teruel', 'elche', 'cartagena', 'getafe',
  'leganés', 'alcalá de henares', 'móstoles', 'mostoles', 'terrassa', 'sabadell', 'badalona', 'hospitalet', 'urduliz',
  'catalunya', 'cataluña', 'catalonia', 'andalucía', 'andalucia', 'euskadi', 'país vasco', 'basque country', 'galicia',
  'asturias', 'cantabria', 'navarra', 'aragón', 'aragon', 'extremadura', 'castilla', 'comunidad valenciana', 'la rioja',
];

export function enEspana(texto = '') {
  const t = ` ${texto.toLowerCase()} `;
  return CIUDADES.some((c) => t.includes(c));
}

// --- Tipo de evento -----------------------------------------------------------

export function tipoDe(texto = '', porDefecto = 'hackathon') {
  const t = texto.toLowerCase();
  if (/\bctf\b|capture the flag/.test(t)) return 'ctf';
  if (/datath?[oó]n|data challenge/.test(t)) return 'datathon';
  if (/ideath?[oó]n|idea(s)? challenge/.test(t)) return 'ideathon';
  if (/game ?jam|gamejam|jam de (video)?juegos|\bjam\b/.test(t)) return 'gamejam';
  if (/hack/.test(t)) return 'hackathon';
  return porDefecto;
}

// --- Fechas ------------------------------------------------------------------

const MESES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
const iso = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;

// «Nov 17 - 20, 2026», «Nov 17 - Dec 02, 2026», «Dec 20, 2026 - Jan 15, 2027», «Nov 20, 2026»
export function rangoIngles(texto) {
  if (!texto) return null;
  const t = texto.replace(/\s+/g, ' ').trim();
  let m = t.match(/^([A-Za-z]{3,4}) (\d{1,2}), (\d{4}) - ([A-Za-z]{3,4}) (\d{1,2}), (\d{4})$/);
  if (m) return { inicio: iso(m[3], MESES[m[1].toLowerCase()], m[2]), fin: iso(m[6], MESES[m[4].toLowerCase()], m[5]) };
  m = t.match(/^([A-Za-z]{3,4}) (\d{1,2}) - ([A-Za-z]{3,4}) (\d{1,2}), (\d{4})$/);
  if (m) return { inicio: iso(m[5], MESES[m[1].toLowerCase()], m[2]), fin: iso(m[5], MESES[m[3].toLowerCase()], m[4]) };
  m = t.match(/^([A-Za-z]{3,4}) (\d{1,2}) - (\d{1,2}), (\d{4})$/);
  if (m) return { inicio: iso(m[4], MESES[m[1].toLowerCase()], m[2]), fin: iso(m[4], MESES[m[1].toLowerCase()], m[3]) };
  m = t.match(/^([A-Za-z]{3,4}) (\d{1,2}), (\d{4})$/);
  if (m) { const d = iso(m[3], MESES[m[1].toLowerCase()], m[2]); return { inicio: d, fin: d }; }
  return null;
}

export const soloFecha = (x) => (x ? String(x).slice(0, 10) : null);

// --- Texto -------------------------------------------------------------------

export function slug(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

export function limpiarHtml(t = '') {
  return t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

// Evento en el formato común. Todo lo que no se sabe va a null.
export function evento(campos) {
  return {
    id: null, nombre: null, tipo: 'hackathon', inicio: null, fin: null, plazo: null,
    modalidad: 'presencial', ciudad: null, direccion: null, pais: null, lat: null, lon: null,
    url: null, imagen: null, organizador: null, temas: [], premio: null, gratis: null,
    requisitos: [], descripcion: null, fuente: null, urlFuente: null,
    ...campos,
  };
}
