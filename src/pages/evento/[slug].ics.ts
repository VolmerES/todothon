import type { APIRoute } from 'astro';
import { calendario } from '../../lib/ics';
import type { Evento } from '../../lib/formato';
import datos from '../../data/eventos.json';

export function getStaticPaths() {
  return (datos as unknown as Evento[]).filter((e) => e.inicio).map((e) => ({ params: { slug: e.slug }, props: { evento: e } }));
}

export const GET: APIRoute = ({ props, site }) =>
  new Response(calendario([props.evento as Evento], site!, (props.evento as Evento).nombre), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
