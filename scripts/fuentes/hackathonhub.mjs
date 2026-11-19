// Hackathon Hub (hackathonhub.eu): directorio europeo. Su página de España trae los próximos en JSON-LD,
// y cada ficha, la web oficial del evento (que es la que se enseña en Todothon).
import { traer, esperar, eventosLd, desdeLd } from '../lib.mjs';

export const nombre = 'Hackathon Hub';
const WEB = 'https://hackathonhub.eu';

export async function recoger() {
  const lista = eventosLd(await traer(`${WEB}/hackathons/spain`));
  const salida = [];
  for (const x of lista) {
    const ficha = String(x.url || '');
    if (!ficha.startsWith(`${WEB}/events/`)) continue;
    const ld = eventosLd(await traer(ficha))[0] || x;
    await esperar(400);
    // En la ficha, `url` es la web oficial; si no la hay, la propia ficha.
    const oficial = [ld.url, ld.offers?.url].find((u) => u && !String(u).startsWith(WEB)) || ficha;
    const e = desdeLd({ ...ld, url: oficial }, { id: `hackathonhub-${ficha.split('/').pop()}`, fuente: nombre, urlFuente: ficha });
    salida.push({ ...e, pais: e.modalidad === 'online' ? null : 'ES' });
  }
  return salida;
}
