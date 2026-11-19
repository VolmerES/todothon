// Datos para la consola del modo terminal: una lista mínima de eventos y las páginas a las que se puede
// hacer «cd». Solo se descarga cuando alguien activa el modo terminal.
import type { APIRoute } from 'astro';
import { PAGINAS_TIPO, paginasCiudad } from '../lib/paginas';
import { GUIAS } from '../lib/guias';
import { ciudadCorta, type Evento } from '../lib/formato';
import datos from '../data/eventos.json';

export const GET: APIRoute = () => {
  const eventos = (datos as unknown as Evento[])
    .filter((e) => e.inicio)
    .sort((a, b) => a.inicio!.localeCompare(b.inicio!))
    .map((e) => ({
      s: e.slug, n: e.nombre, t: e.tipo, i: e.inicio, f: e.fin || e.inicio,
      c: ciudadCorta(e), es: e.pais === 'ES' ? 1 : 0, o: e.organizador || '',
    }));
  const paginas = [...PAGINAS_TIPO, ...paginasCiudad(datos as unknown as Evento[])].map((p) => ({ s: p.slug, n: p.titulo }));
  const guias = GUIAS.map((g) => ({ s: g.slug, n: g.titulo }));
  return new Response(JSON.stringify({ eventos, paginas, guias }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
