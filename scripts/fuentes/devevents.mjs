// dev.events: listado de hackathones en España, con JSON-LD.
import { traer, traerHosting, VIA_HOSTING, eventosLd, desdeLd, FORMATO, slug } from '../lib.mjs';

export const nombre = 'devevents';

export async function recoger() {
  const url = 'https://dev.events/hackathons/EU/ES';
  const html = VIA_HOSTING ? await traerHosting({ f: 'devevents' }) : await traer(url);
  return eventosLd(html)
    .filter((x) => FORMATO.test(x.name || ''))
    .map((x) => desdeLd(x, { id: `devevents-${slug(x.name)}-${String(x.startDate).slice(0, 10)}`, fuente: 'dev.events', urlFuente: url }));
}
