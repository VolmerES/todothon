// Calendarios para suscribirse desde Google Calendar o el móvil:
//   /calendario/todo.ics, /calendario/espana.ics, /calendario/online.ics, uno por tipo (/calendario/gamejam.ics…)
//   y uno por página temática (/calendario/hackathones-madrid.ics…).
import type { APIRoute } from 'astro';
import { calendario } from '../../lib/ics';
import { FILTROS, EVENTOS_FILTRO as eventos } from '../../lib/filtros';

export function getStaticPaths() {
  return Object.keys(FILTROS).map((filtro) => ({ params: { filtro } }));
}

export const GET: APIRoute = ({ params, site }) => {
  const f = FILTROS[params.filtro!];
  return new Response(calendario(eventos.filter(f.cumple), site!, f.nombre), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
