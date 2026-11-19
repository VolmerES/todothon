// saraoia.com: calendario hecho a mano de hackathones en España (con mucha IA), con fichas en JSON-LD.
// Su robots.txt permite leerlo. De cada ficha se coge el evento y el enlace a la web oficial,
// que es la que se enseña en Todothon (saraoia sale como fuente).
import { traer, esperar, eventosLd, desdeLd, tipoDe, limpiarHtml } from '../lib.mjs';

export const nombre = 'saraoia';
const WEB = 'https://saraoia.com';
// Enlaces de una ficha que no son la web del evento.
const NO_OFICIAL = /saraoia\.com|hackathonspain\.com|google\.|gstatic|googleapis|maps\.|calendar\.|twitter\.com|x\.com\/|linkedin\.com\/(shar|in\/)|facebook\.com\/shar|wa\.me|t\.me\/share|schema\.org|w3\.org/i;

export async function recoger() {
  const lista = eventosLd(await traer(`${WEB}/hackathons`));
  const salida = [];
  for (const x of lista) {
    const ficha = String(x.url || x['@id'] || '').replace(/#.*$/, '');
    if (!ficha.startsWith(WEB)) continue;
    const html = await traer(ficha);
    await esperar(400);
    const ld = eventosLd(html)[0] || x;
    const enlaces = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    const oficial = enlaces.find((u) => !NO_OFICIAL.test(u)) || null;
    const id = ficha.split('/').pop();
    const e = desdeLd(ld, { id: `saraoia-${id}`, fuente: nombre, urlFuente: ficha });
    salida.push({
      ...e,
      tipo: tipoDe(`${ld.name} ${limpiarHtml(ld.description || '')}`),
      url: oficial || ficha,
      gratis: ld.isAccessibleForFree === true ? true : e.gratis,
      pais: e.modalidad === 'online' ? null : 'ES',
    });
  }
  return salida;
}
