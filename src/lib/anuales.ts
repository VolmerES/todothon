// Los eventos que se repiten cada año (src/data/anuales.json, a mano) y sus ediciones:
// las próximas salen de eventos.json y las pasadas, de data/archivo.json.
import anuales from '../data/anuales.json';
import datos from '../data/eventos.json';
import archivo from '../../data/archivo.json';
import type { Evento } from './formato';

export type Anual = (typeof anuales)[number];
export const ANUALES = anuales as Anual[];
export const EVENTOS = datos as unknown as Evento[];
export const ARCHIVO = archivo as unknown as Evento[];

const sinTildes = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const es = (a: Anual, e: Evento) => new RegExp(a.buscar, 'i').test(sinTildes(e.nombre));
const porFecha = (x: Evento, y: Evento) => (x.inicio || '9').localeCompare(y.inicio || '9');

export const proximaDe = (a: Anual) => EVENTOS.filter((e) => es(a, e)).sort(porFecha)[0] || null;
export const pasadasDe = (a: Anual) => ARCHIVO.filter((e) => es(a, e)).sort(porFecha).reverse();
export const anualDe = (e: Evento) => ANUALES.find((a) => es(a, e)) || null;
