// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Hasta que se compre todothon.es, la web vive en el subdominio de volmer.es.
  site: 'https://todothon.volmer.es',
  trailingSlash: 'ignore',
});
