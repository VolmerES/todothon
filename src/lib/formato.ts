// Formato de fechas y textos para las tarjetas y las fichas.

export interface Evento {
  id: string; slug: string; nombre: string; tipo: string;
  inicio: string | null; fin: string | null; plazo: string | null;
  modalidad: 'presencial' | 'online' | 'hibrido';
  ciudad: string | null; direccion: string | null; pais: string | null;
  lat: number | null; lon: number | null;
  url: string | null; imagen: string | null; organizador: string | null;
  temas: string[]; premio: string | null; gratis: boolean | null;
  requisitos: string[]; descripcion: string | null; fuente: string; urlFuente: string | null;
}

const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const diaAnio = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fecha = (s: string) => new Date(`${s}T00:00:00Z`);

export function rangoFechas(inicio: string | null, fin: string | null): string {
  if (!inicio) return 'Fecha por confirmar';
  const a = fecha(inicio);
  if (!fin || fin === inicio) return diaAnio.format(a);
  const b = fecha(fin);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${diaAnio.format(a)} – ${diaAnio.format(b)}`;
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${diaAnio.format(b)}`;
  return `${dia.format(a)} – ${diaAnio.format(b)}`;
}

// Solo la ciudad, sin «Lleida, Lleida, Spain».
export function ciudadCorta(e: Evento): string {
  if (e.modalidad === 'online') return 'Online';
  const c = (e.ciudad || '').split(',')[0].trim();
  return c || 'Lugar por confirmar';
}

export function modalidadTexto(m: Evento['modalidad']): string {
  return { presencial: 'Presencial', online: 'Online', hibrido: 'Híbrido' }[m] || m;
}

// Inclinación estable por evento, para que cada cartel quede torcido siempre igual.
export function inclinacion(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `${((Math.abs(h) % 50) / 10 - 2.5).toFixed(1)}deg`;
}

export function diasHasta(s: string | null, hoy = new Date()): number | null {
  if (!s) return null;
  const h = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Math.round((fecha(s).getTime() - h) / 86400000);
}
