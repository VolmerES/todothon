// Google Developer Groups (gdg.community.dev): los eventos de los grupos de España con formato de hackathon.
// La plataforma (Bevy) tiene una API pública en JSON: lista de eventos activos y ficha de cada uno.
import { traer, esperar, FORMATO, tipoDe, soloFecha, limpiarHtml, evento } from '../lib.mjs';

export const nombre = 'GDG';
const API = 'https://gdg.community.dev/api/event';

export async function recoger() {
  const lista = [];
  let url = `${API}/?status=Live&page_size=500`;
  for (let pagina = 0; url && pagina < 5; pagina++) {
    const d = await traer(url, { json: true });
    lista.push(...d.results);
    url = d.links?.next || null;
  }
  const candidatos = lista.filter((e) => e.chapter?.country === 'ES' && !e.is_hidden && !e.is_test && FORMATO.test(e.title || ''));
  const salida = [];
  for (const c of candidatos) {
    const e = await traer(`${API}/${c.id}/`, { json: true });
    await esperar(300);
    const online = e.is_virtual_event || /virtual|online/i.test(e.event_type_title || '');
    const sinSitio = (s) => !s || /por determinar|tbd|tba/i.test(s);
    const ciudad = e.venue_city ? e.venue_city[0].toUpperCase() + e.venue_city.slice(1) : e.chapter.city;
    salida.push(evento({
      id: `gdg-${e.id}`,
      nombre: limpiarHtml(e.title),
      tipo: tipoDe(e.title),
      inicio: soloFecha(e.start_date),
      fin: soloFecha(e.end_date || e.start_date),
      modalidad: online ? 'online' : 'presencial',
      ciudad: online ? null : ciudad,
      direccion: online ? null : [sinSitio(e.venue_name) ? null : e.venue_name, sinSitio(e.venue_address) ? null : e.venue_address, e.venue_zip_code, ciudad].filter(Boolean).join(', '),
      pais: online ? null : 'ES',
      lat: !online && e.venue_latitude ? Number(e.venue_latitude) : null,
      lon: !online && e.venue_longitude ? Number(e.venue_longitude) : null,
      url: e.url,
      imagen: e.picture?.url || null,
      organizador: e.chapter?.title || 'Google Developer Groups',
      descripcion: limpiarHtml(e.description_short || '').slice(0, 600) || null,
      gratis: !e.tickets?.some?.((t) => Number(t.price) > 0),
      fuente: 'GDG',
      urlFuente: e.url,
    }));
  }
  return salida;
}
