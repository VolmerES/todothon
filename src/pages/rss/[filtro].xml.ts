// RSS de cada filtro (/rss/espana.xml, /rss/hackathones-madrid.xml…): para enterarse de los nuevos desde un
// lector de RSS, o para conectarlo a lo que uno quiera (correo, Slack, Discord…) sin darnos ningún dato.
import type { APIRoute } from 'astro';
import { FILTROS, EVENTOS_FILTRO as eventos } from '../../lib/filtros';
import { rangoFechas, ciudadCorta } from '../../lib/formato';

export function getStaticPaths() {
  return Object.keys(FILTROS).map((filtro) => ({ params: { filtro } }));
}

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

export const GET: APIRoute = ({ params, site }) => {
  const f = FILTROS[params.filtro!];
  const lista = eventos.filter(f.cumple).slice(0, 100);
  const items = lista.map((e) => {
    const url = new URL(`/evento/${e.slug}`, site).href;
    const resumen = `${rangoFechas(e.inicio, e.fin)} · ${ciudadCorta(e)}${e.organizador ? ` · ${e.organizador}` : ''}`;
    return `  <item>
    <title>${esc(e.nombre)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${esc(resumen)}</description>
  </item>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(f.nombre)}</title>
  <link>${site}</link>
  <atom:link href="${new URL(`/rss/${params.filtro}.xml`, site).href}" rel="self" type="application/rss+xml" />
  <description>${esc(f.nombre)}: hackathones, game jams y CTF, actualizado cada día.</description>
  <language>es</language>
${items}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
