// CTFtime: API pública. Entran los online y los presenciales en España (próximos 120 días).
import { traer, evento, enEspana, soloFecha } from '../lib.mjs';

export const nombre = 'ctftime';

export async function recoger() {
  const ahora = Math.floor(Date.now() / 1000);
  const hasta = ahora + 120 * 86400;
  const lista = await traer(`https://ctftime.org/api/v1/events/?limit=300&start=${ahora}&finish=${hasta}`, { json: true });
  const salida = [];
  for (const e of lista) {
    const espana = enEspana(e.location || '');
    if (e.onsite && !espana) continue;
    if (e.restrictions && e.restrictions !== 'Open') continue;
    salida.push(evento({
      id: `ctftime-${e.id}`,
      nombre: e.title,
      tipo: 'ctf',
      inicio: soloFecha(e.start),
      fin: soloFecha(e.finish),
      modalidad: e.onsite ? 'presencial' : 'online',
      ciudad: espana ? e.location : null,
      direccion: espana ? e.location : null,
      pais: espana ? 'ES' : null,
      url: e.url || e.ctftime_url,
      imagen: e.logo || null,
      organizador: (e.organizers || []).map((o) => o.name).join(', ') || null,
      descripcion: e.description ? e.description.slice(0, 600) : null,
      fuente: 'CTFtime',
      urlFuente: e.ctftime_url,
    }));
  }
  return salida;
}
