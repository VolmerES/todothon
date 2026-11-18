// MLH: la página de la temporada lleva los eventos en JSON dentro del HTML.
// Entran los presenciales en España y los online/híbridos.
import { traer, evento, enEspana, soloFecha } from '../lib.mjs';

export const nombre = 'mlh';

function temporada(hoy = new Date()) {
  // La temporada de MLH va de agosto a julio y se nombra por el año en que acaba.
  return hoy.getUTCMonth() >= 6 ? hoy.getUTCFullYear() + 1 : hoy.getUTCFullYear();
}

function sacarLista(html, clave) {
  const i = html.indexOf(`"${clave}":[`);
  if (i < 0) return [];
  const inicio = i + clave.length + 3; // posición del «[»
  let j = inicio + 1, prof = 1, enCadena = false;
  for (; j < html.length && prof > 0; j++) {
    const c = html[j];
    if (enCadena) { if (c === '\\') j++; else if (c === '"') enCadena = false; continue; }
    if (c === '"') enCadena = true; else if (c === '[') prof++; else if (c === ']') prof--;
  }
  return JSON.parse(html.slice(inicio, j));
}

export async function recoger() {
  const salida = [];
  const vistos = new Set();
  for (const t of [temporada(), temporada() + 1]) {
    let html;
    try { html = await traer(`https://www.mlh.com/seasons/${t}/events`); } catch { continue; }
    for (const e of sacarLista(html, 'upcomingEvents')) {
      if (vistos.has(e.id)) continue;
      vistos.add(e.id);
      const online = e.formatType === 'digital';
      const hibrido = e.formatType === 'hybrid';
      const espana = enEspana(e.location || '');
      if (!online && !espana) continue;
      const url = e.websiteUrl || `https://www.mlh.com${e.url || ''}`;
      salida.push(evento({
        id: `mlh-${e.id}`,
        nombre: e.name,
        tipo: 'hackathon',
        inicio: soloFecha(e.startsAt),
        fin: soloFecha(e.endsAt),
        modalidad: online ? 'online' : hibrido ? 'hibrido' : 'presencial',
        ciudad: espana ? e.location : null,
        direccion: espana ? e.location : null,
        pais: espana ? 'ES' : null,
        url,
        imagen: e.backgroundUrl || e.logoUrl || null,
        organizador: 'Major League Hacking',
        requisitos: ['Sobre todo estudiantes'],
        gratis: true,
        fuente: 'MLH',
        urlFuente: `https://www.mlh.com/seasons/${t}/events`,
      }));
    }
  }
  return salida;
}
