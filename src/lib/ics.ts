// Ficheros de calendario (RFC 5545), con eventos de día entero.
import type { Evento } from './formato';

const escapar = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Las líneas no pueden pasar de 75 octetos: se parten con CRLF + espacio.
function plegar(linea: string): string {
  const bytes = new TextEncoder().encode(linea);
  if (bytes.length <= 75) return linea;
  const trozos: string[] = [];
  let actual = '';
  let largo = 0;
  for (const c of linea) {
    const n = new TextEncoder().encode(c).length;
    if (largo + n > (trozos.length ? 74 : 75)) { trozos.push(actual); actual = ''; largo = 0; }
    actual += c; largo += n;
  }
  trozos.push(actual);
  return trozos.join('\r\n ');
}

const dia = (s: string) => s.replace(/-/g, '');
function diaSiguiente(s: string) { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }

export function vevento(e: Evento, sitio: URL): string[] {
  if (!e.inicio) return [];
  const lugar = e.modalidad === 'online' ? 'Online' : (e.direccion || e.ciudad || '');
  const ficha = new URL(`/evento/${e.slug}`, sitio).href;
  return [
    'BEGIN:VEVENT',
    `UID:${e.id}@todothon.es`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${dia(e.inicio)}`,
    `DTEND;VALUE=DATE:${dia(diaSiguiente(e.fin || e.inicio))}`,
    `SUMMARY:${escapar(e.nombre)}`,
    `LOCATION:${escapar(lugar)}`,
    `DESCRIPTION:${escapar(`${e.url || ''}\n\nMás información: ${ficha}`)}`,
    `URL:${e.url || ficha}`,
    'END:VEVENT',
  ];
}

export function calendario(eventos: Evento[], sitio: URL, nombre = 'Todothon'): string {
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Todothon//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapar(nombre)}`, 'X-WR-TIMEZONE:Europe/Madrid',
    ...eventos.flatMap((e) => vevento(e, sitio)),
    'END:VCALENDAR',
  ];
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
