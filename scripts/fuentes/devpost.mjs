// Devpost: JSON interno de devpost.com/hackathons (no documentado).
// Entran los presenciales en España y todos los online abiertos.
import { traer, esperar, evento, enEspana, tipoDe, rangoIngles, limpiarHtml } from '../lib.mjs';

export const nombre = 'devpost';

export async function recoger() {
  const salida = [];
  for (let pagina = 1; pagina <= 30; pagina++) {
    const d = await traer(`https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&per_page=40&page=${pagina}`, { json: true });
    for (const h of d.hackathons) {
      if (h.invite_only) continue;
      const lugar = h.displayed_location?.location || '';
      const online = h.displayed_location?.icon === 'globe' || /^(online|virtual)$/i.test(lugar.trim());
      if (!online && !enEspana(`${lugar} ${h.title} ${h.organization_name || ''}`)) continue;
      const fechas = rangoIngles(h.submission_period_dates);
      const premio = limpiarHtml(h.prize_amount || '');
      salida.push(evento({
        id: `devpost-${h.id}`,
        nombre: h.title,
        tipo: tipoDe(h.title),
        inicio: fechas?.inicio ?? null,
        fin: fechas?.fin ?? null,
        modalidad: online ? 'online' : 'presencial',
        ciudad: online ? null : lugar,
        direccion: online ? null : lugar,
        pais: online ? null : 'ES',
        url: h.url,
        imagen: h.thumbnail_url ? (h.thumbnail_url.startsWith('//') ? `https:${h.thumbnail_url}` : h.thumbnail_url) : null,
        organizador: h.organization_name || null,
        temas: (h.themes || []).map((t) => t.name),
        premio: /[1-9]/.test(premio) ? premio : null,
        fuente: 'Devpost',
        urlFuente: h.url,
      }));
    }
    if (d.hackathons.length === 0 || pagina * d.meta.per_page >= d.meta.total_count) break;
    await esperar(800);
  }
  return salida;
}
