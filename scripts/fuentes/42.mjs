// Eventos de los campus de 42 en España (Madrid, Barcelona, Málaga, Urduliz…), de la API de la intranet.
// Se queda con los que tienen formato de hackathon (tipo «hackathon» en 42, o el nombre lo dice).
//
// Necesita la aplicación «Todothon» de profile.intra.42.fr/oauth/applications: su UID y su secreto van
// en los secretos del repo FT_CLIENT_ID y FT_CLIENT_SECRET. Sin ellos devuelve una lista vacía.
import { UA, esperar, FORMATO, tipoDe, soloFecha, limpiarHtml, evento } from '../lib.mjs';

export const nombre = '42';
const API = 'https://api.intra.42.fr';

async function pedir(url, token) {
  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } });
    if (r.status === 429) { await esperar(2000); continue; } // la API deja 2 peticiones por segundo
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    await esperar(600);
    return r.json();
  }
  throw new Error(`${url} → demasiadas peticiones`);
}

export async function recoger() {
  const id = process.env.FT_CLIENT_ID;
  const secreto = process.env.FT_CLIENT_SECRET;
  if (!id || !secreto) return [];

  const r = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secreto }),
  });
  if (!r.ok) throw new Error(`token de 42 → HTTP ${r.status}`);
  const { access_token: token } = await r.json();

  const campus = await pedir(`${API}/v2/campus?filter[country]=Spain&per_page=50`, token);
  const ahora = new Date().toISOString();
  const salida = [];
  for (const c of campus.filter((x) => x.active !== false)) {
    const eventos = await pedir(`${API}/v2/campus/${c.id}/events?range[end_at]=${ahora},2100-01-01T00:00:00Z&per_page=100&sort=begin_at`, token);
    for (const e of eventos) {
      if (e.kind !== 'hackathon' && !FORMATO.test(e.name || '')) continue;
      const direccion = [e.location, c.address, c.zip, c.city].filter(Boolean).join(', ');
      salida.push(evento({
        id: `42-${e.id}`,
        nombre: limpiarHtml(e.name),
        tipo: tipoDe(e.name || ''),
        inicio: soloFecha(e.begin_at),
        fin: soloFecha(e.end_at || e.begin_at),
        modalidad: 'presencial',
        ciudad: c.city || c.name,
        direccion,
        pais: 'ES',
        url: c.website || `https://www.42network.org`,
        organizador: `42 ${c.name}`,
        descripcion: e.description ? limpiarHtml(e.description).slice(0, 600) : null,
        requisitos: ['Pensado para estudiantes de 42: mira en la web del campus si está abierto a más gente'],
        fuente: '42',
        urlFuente: `https://profile.intra.42.fr/events/${e.id}`,
      }));
    }
  }
  return salida;
}
