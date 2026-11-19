// Agenda de la Comunidad de Madrid (comunidad.madrid/actividades): hackathones universitarios del COE,
// de la Semana de la Ciencia, de hospitales… que no salen en ninguna plataforma.
// El buscador de la agenda admite ?qt=<texto>; cada ficha trae el evento en JSON-LD (schema.org Event).
import { traer, esperar, FORMATO, tipoDe, eventosLd, desdeLd, limpiarHtml } from '../lib.mjs';

export const nombre = 'Comunidad de Madrid';
const WEB = 'https://www.comunidad.madrid';
const BUSQUEDAS = ['hackathon', 'hackaton', 'datathon', 'ideathon', 'game jam', 'ctf'];

export async function recoger() {
  // 1. Fichas que salen al buscar cada palabra (el buscador mezcla alguna destacada que no tiene nada que ver;
  //    se filtran después leyendo la ficha).
  const fichas = new Set();
  for (const q of BUSQUEDAS) {
    const html = await traer(`${WEB}/actividades?qt=${encodeURIComponent(q)}`);
    for (const m of html.matchAll(/href="(\/actividades\/20\d{2}\/[^"#?]+)"/g)) fichas.add(m[1]);
    await esperar(400);
  }

  // 2. Cada ficha: el evento en JSON-LD, y solo si el texto de la página habla de un hackathon (o similar).
  const salida = [];
  for (const ruta of fichas) {
    const html = await traer(`${WEB}${ruta}`);
    await esperar(400);
    const [ld] = eventosLd(html);
    if (!ld) continue;
    const principal = html.match(/<main[\s\S]*?<\/main>/)?.[0] || html;
    const texto = limpiarHtml(principal.replace(/<script[\s\S]*?<\/script>/g, ' '));
    if (!FORMATO.test(`${ld.name} ${texto}`)) continue;

    const e = desdeLd(ld, { id: `comunidad-madrid-${ruta.split('/').pop()}`, fuente: nombre, urlFuente: `${WEB}${ruta}` });
    const dir = ld.location?.address || {};
    // La dirección viene en HTML y a veces con dos sedes: se queda la primera línea.
    const calle = limpiarHtml(String(dir.streetAddress || '')).split(/\s{2,}|Dispone de/)[0].trim().replace(/\.$/, '');
    salida.push({
      ...e,
      tipo: tipoDe(`${ld.name} ${texto.slice(0, 1500)}`),
      ciudad: e.modalidad === 'online' ? null : (dir.addressLocality || 'Madrid'),
      direccion: e.modalidad === 'online' ? null : [ld.location?.name, calle].filter(Boolean).join(', ') || null,
      organizador: e.organizador || 'Comunidad de Madrid',
      gratis: /gratuit|gratis/i.test(texto) ? true : e.gratis,
      requisitos: /estudiantes universitari|hackathon universitari/i.test(texto) ? ['Para estudiantes universitarios'] : [],
    });
  }
  return salida;
}
