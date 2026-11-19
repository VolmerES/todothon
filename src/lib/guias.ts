// Guías (las «entradas» de la web): textos que no caducan y que traen visitas desde Google.
// Cada una es un .md en src/guias/ con su título, descripción y fecha en el frontmatter.
import type { MarkdownInstance } from 'astro';

export interface Guia {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string;        // AAAA-MM-DD
  emoji: string;
  listado?: string;     // slug de la página con los eventos de ese tipo
  Content: MarkdownInstance<Record<string, unknown>>['Content'];
}

const ficheros = import.meta.glob<MarkdownInstance<Record<string, string>>>('../guias/*.md', { eager: true });

export const GUIAS: Guia[] = Object.entries(ficheros)
  .map(([ruta, m]) => ({
    slug: ruta.split('/').pop()!.replace(/\.md$/, ''),
    titulo: m.frontmatter.titulo,
    descripcion: m.frontmatter.descripcion,
    // YAML convierte 2026-11-19 en una fecha: se deja siempre como texto AAAA-MM-DD.
    fecha: new Date(m.frontmatter.fecha as unknown as string).toISOString().slice(0, 10),
    emoji: m.frontmatter.emoji || '📌',
    listado: m.frontmatter.listado,
    Content: m.Content,
  }))
  .sort((a, b) => Number(a.fecha < b.fecha) - Number(a.fecha > b.fecha) || a.titulo.localeCompare(b.titulo, 'es'));
