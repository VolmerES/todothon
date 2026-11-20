// Filtros para los calendarios (.ics) y los RSS: los generales, uno por tipo y uno por cada página temática.
import { TIPOS } from '../config';
import { PAGINAS_TIPO, paginasCiudad } from './paginas';
import type { Evento } from './formato';
import datos from '../data/eventos.json';

export const EVENTOS_FILTRO = datos as unknown as Evento[];

export const FILTROS: Record<string, { nombre: string; cumple: (e: Evento) => boolean }> = {
  todo: { nombre: 'Todothon · todos los eventos', cumple: () => true },
  espana: { nombre: 'Todothon · España', cumple: (e) => e.pais === 'ES' },
  online: { nombre: 'Todothon · online', cumple: (e) => e.modalidad !== 'presencial' },
  ...Object.fromEntries(Object.entries(TIPOS).map(([k, t]) => [k, { nombre: `Todothon · ${t.nombre}`, cumple: (e: Evento) => e.tipo === k }])),
  ...Object.fromEntries([...PAGINAS_TIPO, ...paginasCiudad(EVENTOS_FILTRO)].map((p) => [p.slug, { nombre: `Todothon · ${p.titulo.replace(/ \d{4}.*$/, '')}`, cumple: p.filtro }])),
};
