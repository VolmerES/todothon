// Meetup: búsqueda de eventos con formato de hackathon en las ciudades grandes de España.
// La página de búsqueda trae los resultados en su __NEXT_DATA__ (estado de Apollo).
import { traer, esperar, FORMATO, tipoDe, soloFecha, limpiarHtml, evento } from '../lib.mjs';

export const nombre = 'Meetup';
const CIUDADES = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Malaga', 'Zaragoza', 'A Coruna', 'Granada', 'Alicante'];
const PALABRAS = ['hackathon', 'game jam', 'ctf'];

export async function recoger() {
  const porId = new Map();
  for (const ciudad of CIUDADES) {
    for (const palabra of PALABRAS) {
      const url = `https://www.meetup.com/find/?keywords=${encodeURIComponent(palabra)}&location=${encodeURIComponent(`es--${ciudad}`)}&source=EVENTS`;
      let html;
      try { html = await traer(url); } catch { continue; }
      await esperar(1200);
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) continue;
      let estado;
      try { estado = JSON.parse(m[1]).props.pageProps.__APOLLO_STATE__ || {}; } catch { continue; }
      const ref = (x) => (x && x.__ref ? estado[x.__ref] : x);
      for (const [clave, e] of Object.entries(estado)) {
        if (!clave.startsWith('Event:') || porId.has(e.id) || !FORMATO.test(e.title || '')) continue;
        const venue = ref(e.venue) || {};
        const online = e.eventType === 'ONLINE';
        if (!online && venue.country && String(venue.country).toLowerCase() !== 'es') continue;
        const foto = ref(e.featuredEventPhoto) || ref(e.displayPhoto) || {};
        const grupo = ref(e.group) || {};
        porId.set(e.id, evento({
          id: `meetup-${e.id}`,
          nombre: limpiarHtml(e.title),
          tipo: tipoDe(e.title),
          inicio: soloFecha(e.dateTime),
          fin: soloFecha(e.endTime || e.dateTime),
          modalidad: online ? 'online' : 'presencial',
          ciudad: online ? null : venue.city || ciudad,
          direccion: online ? null : [venue.name, venue.address, venue.city].filter(Boolean).join(', ') || null,
          pais: online ? null : 'ES',
          lat: !online && venue.lat ? Number(venue.lat) : null,
          lon: !online && (venue.lng ?? venue.lon) ? Number(venue.lng ?? venue.lon) : null,
          url: e.eventUrl,
          imagen: foto.highResUrl || foto.baseUrl && foto.id && `${foto.baseUrl}${foto.id}/676x380.webp` || null,
          organizador: grupo.name || null,
          descripcion: e.description ? limpiarHtml(e.description).slice(0, 600) : null,
          gratis: e.feeSettings ? false : true,
          fuente: 'Meetup',
          urlFuente: e.eventUrl,
        }));
      }
    }
  }
  return [...porId.values()];
}
