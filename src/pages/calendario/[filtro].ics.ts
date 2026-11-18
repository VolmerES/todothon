// Calendarios para suscribirse desde Google Calendar o el móvil:
//   /calendario/todo.ics, /calendario/espana.ics, /calendario/online.ics y uno por tipo (/calendario/gamejam.ics…).
import type { APIRoute } from 'astro';
import { calendario } from '../../lib/ics';
import { TIPOS } from '../../config';
import type { Evento } from '../../lib/formato';
import datos from '../../data/eventos.json';

const eventos = datos as unknown as Evento[];

const FILTROS: Record<string, { nombre: string; cumple: (e: Evento) => boolean }> = {
  todo: { nombre: 'Todothon · todos los eventos', cumple: () => true },
  espana: { nombre: 'Todothon · España', cumple: (e) => e.pais === 'ES' },
  online: { nombre: 'Todothon · online', cumple: (e) => e.modalidad !== 'presencial' },
  ...Object.fromEntries(Object.entries(TIPOS).map(([k, t]) => [k, { nombre: `Todothon · ${t.nombre}`, cumple: (e: Evento) => e.tipo === k }])),
};

export function getStaticPaths() {
  return Object.keys(FILTROS).map((filtro) => ({ params: { filtro } }));
}

export const GET: APIRoute = ({ params, site }) => {
  const f = FILTROS[params.filtro!];
  return new Response(calendario(eventos.filter(f.cumple), site!, f.nombre), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
