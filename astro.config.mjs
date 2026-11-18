// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Dominio propio. todothon.volmer.es sigue sirviendo la misma web (alias en Hostinger).
  site: 'https://todothon.es',
  trailingSlash: 'ignore',
});
