// Eventbrite: páginas de búsqueda de España, que llevan los eventos en JSON-LD.
// Mezclan mucho evento de networking, así que solo entran los nombres con formato de hackathon.
import { traer, traerHosting, VIA_HOSTING, esperar, eventosLd, desdeLd, FORMATO, enEspana } from '../lib.mjs';

export const nombre = 'eventbrite';

const BUSQUEDAS = ['hackathon', 'hackaton', 'datathon', 'ideathon', 'game-jam', 'ctf', 'buildathon'];

export async function recoger() {
  const porId = new Map();
  for (const q of BUSQUEDAS) {
    for (let pagina = 1; pagina <= 3; pagina++) {
      const url = `https://www.eventbrite.es/d/spain/${q}/${pagina > 1 ? `?page=${pagina}` : ''}`;
      let html;
      try { html = VIA_HOSTING ? await traerHosting({ f: 'eventbrite', q, p: pagina }) : await traer(url); } catch { break; }
      const lista = eventosLd(html);
      if (lista.length === 0) break;
      for (const x of lista) {
        if (!FORMATO.test(x.name || '')) continue;
        const id = `eventbrite-${(x.url || x.name).match(/(\d{6,})/)?.[1] || x.name}`;
        const e = desdeLd(x, { id, fuente: 'Eventbrite', urlFuente: x.url || url });
        if (e.modalidad === 'presencial' && e.ciudad && !enEspana(`${e.ciudad} ${e.direccion}`)) e.pais = null;
        porId.set(id, e);
      }
      await esperar(1200);
    }
  }
  return [...porId.values()];
}
