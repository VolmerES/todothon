// Luma (luma.com): cada vez más hackathones de Madrid y Barcelona se anuncian solo ahí.
// Su página «Descubrir» usa una API pública: eventos por ciudad, con búsqueda y categoría.
import { traer, esperar, FORMATO, tipoDe, soloFecha, evento } from '../lib.mjs';

export const nombre = 'Luma';
const API = 'https://api.lu.ma/discover';
const BUSQUEDAS = [{ query: 'hackathon' }, { query: 'hackaton' }, { query: 'game jam' }, { query: 'ctf' }, { query: 'datathon' },
  { discover_category_api_id: 'cat-tech' }, { discover_category_api_id: 'cat-ai' }];

export async function recoger() {
  // Las ciudades de España que Luma tenga en «Descubrir» (hoy Madrid y Barcelona).
  const portada = await traer(`${API}/bootstrap-page?featured_place_api_id=`, { json: true });
  const lugares = portada.places.map((p) => p.place)
    .filter((p) => /madrid|barcelona|valencia|sevilla|bilbao|m[aá]laga|zaragoza|coru|granada|alicante|palma|canarias/i.test(p.name));

  const porId = new Map();
  for (const lugar of lugares) {
    for (const b of BUSQUEDAS) {
      const q = new URLSearchParams({ discover_place_api_id: lugar.api_id, pagination_limit: '100', ...b });
      let d;
      try { d = await traer(`${API}/get-paginated-events?${q}`, { json: true }); } catch { continue; }
      await esperar(700);
      for (const x of d.entries || []) {
        const e = x.event;
        if (!FORMATO.test(e.name || '') || porId.has(e.api_id)) continue;
        const geo = e.geo_address_info || {};
        const online = e.location_type === 'online';
        if (!online && geo.country_code && geo.country_code !== 'ES') continue;
        const es = geo.localized?.es || geo;
        porId.set(e.api_id, evento({
          id: `luma-${e.api_id}`,
          nombre: e.name.trim(),
          tipo: tipoDe(e.name),
          inicio: soloFecha(e.start_at),
          fin: soloFecha(e.end_at || e.start_at),
          modalidad: online ? 'online' : 'presencial',
          ciudad: online ? null : es.city || geo.city || lugar.name,
          direccion: online ? null : es.full_address || geo.full_address || null,
          pais: online ? null : 'ES',
          lat: online ? null : e.coordinate?.latitude ?? null,
          lon: online ? null : e.coordinate?.longitude ?? null,
          url: `https://luma.com/${e.url}`,
          imagen: e.cover_url || null,
          organizador: x.calendar?.name || (x.hosts || [])[0]?.name || null,
          gratis: x.ticket_info?.is_free ?? null,
          fuente: 'Luma',
          urlFuente: `https://luma.com/${e.url}`,
        }));
      }
    }
  }
  return [...porId.values()];
}
