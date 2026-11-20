// Sitemap para Google: portada, páginas fijas, páginas por tipo y ciudad, guías y cada evento.
import type { APIRoute } from 'astro';
import { PAGINAS_TIPO, paginasCiudad } from '../lib/paginas';
import { GUIAS } from '../lib/guias';
import { ANUALES, ARCHIVO } from '../lib/anuales';
import type { Evento } from '../lib/formato';
import datos from '../data/eventos.json';

export const GET: APIRoute = ({ site }) => {
  const eventos = datos as unknown as Evento[];
  const hoy = new Date().toISOString().slice(0, 10);
  const rutas: [string, string][] = [
    ['/', hoy], ['/sobre', hoy], ['/publicar', hoy], ['/guias', hoy], ['/cada-ano', hoy], ['/archivo', hoy], ['/organizadores', hoy],
    ...ANUALES.map((a): [string, string] => [`/cada-ano/${a.clave}`, hoy]),
    ...[...PAGINAS_TIPO, ...paginasCiudad(eventos)].map((p): [string, string] => [`/${p.slug}`, hoy]),
    ...GUIAS.map((g): [string, string] => [`/guias/${g.slug}`, g.fecha]),
    ...eventos.map((e): [string, string] => [`/evento/${e.slug}`, hoy]),
    ...ARCHIVO.filter((e) => !eventos.some((x) => x.slug === e.slug)).map((e): [string, string] => [`/evento/${e.slug}`, (e.fin || e.inicio || hoy)]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map(([r, f]) => `  <url><loc>${new URL(r, site).href}</loc><lastmod>${f}</lastmod></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
