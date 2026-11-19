// itch.io: listado HTML de jams próximas. Son online e internacionales y hay miles,
// así que entran las que tienen bastante gente apuntada o están en español.
import { traer, esperar, evento, limpiarHtml } from '../lib.mjs';

export const nombre = 'itch';

const MIN_APUNTADOS = 150;
// En itch.io también hay jams de música, cómic o escritura: no son game jams.
const NO_JUEGOS = /comic|manga|music|composing|\bost\b|soundtrack|writing|poetry|novel|zine|\bart jam\b|drawing|newsletter|pixel art jam|ttrpg/i;
const ESPANOL =/\b(jam de|juegos?|español|espanol|hispan|latam|game jam es|españa)\b/i;

function duracionEnDias(texto = '') {
  const m = texto.match(/(\d+)\s*(hour|day|week|month)/i);
  if (!m) return 0;
  const n = Number(m[1]);
  return { hour: n / 24, day: n, week: n * 7, month: n * 30 }[m[2].toLowerCase()];
}

export async function recoger() {
  const salida = [];
  for (let pagina = 1; pagina <= 4; pagina++) {
    const html = await traer(`https://itch.io/jams/upcoming${pagina > 1 ? `?page=${pagina}` : ''}`);
    const bloques = html.split('<div class="jam">').slice(1);
    if (bloques.length === 0) break;
    for (const b of bloques) {
      const enlace = b.match(/<h3[^>]*><a href="(\/jam\/[^"]+)">([^<]+)<\/a>/);
      if (!enlace) continue;
      const nombre = limpiarHtml(enlace[2]);
      const anfitrion = limpiarHtml(b.match(/Hosted by (.*?)<\/div>/)?.[1] || '');
      const empieza = b.match(/class="date_countdown"[^>]*>([^<]+)</)?.[1];
      const dura = b.match(/class="date_duration"[^>]*>([^<]+)</)?.[1];
      const apuntados = Number((b.match(/<span class="number">([\d,]+)<\/span> joined/)?.[1] || '0').replace(/,/g, ''));
      const img = b.match(/srcset="[^"]*?, (\S+) 2x"/)?.[1] || b.match(/<img[^>]+src="([^"]+)"/)?.[1] || null;
      if (apuntados < MIN_APUNTADOS && !ESPANOL.test(`${nombre} ${anfitrion}`)) continue;
      if (NO_JUEGOS.test(nombre)) continue;
      if (!empieza) continue;
      const inicio = new Date(empieza);
      const fin = new Date(inicio.getTime() + duracionEnDias(dura) * 86400000);
      salida.push(evento({
        id: `itch-${enlace[1].slice(5)}`,
        nombre,
        tipo: 'gamejam',
        inicio: inicio.toISOString().slice(0, 10),
        fin: fin.toISOString().slice(0, 10),
        modalidad: 'online',
        url: `https://itch.io${enlace[1]}`,
        imagen: img,
        organizador: anfitrion || null,
        gratis: true,
        fuente: 'itch.io',
        urlFuente: `https://itch.io${enlace[1]}`,
      }));
    }
    await esperar(800);
  }
  return salida;
}
