# Todothon

**Todos los hackathones, datathones, ideatones, game jams y CTF de España (y los online), en un solo buscador.**

Proyecto sin ánimo de lucro, hecho por y para la comunidad. La palabra va cambiando: Hack·thon → Data·thon → Idea·thon → Game·thon → **Todo·thon**.

## Qué hace

- Junta eventos de varias webs cada día y los muestra con un buscador como los de vuelos: dónde, cuándo, qué y tema.
- Filtros (en España, presencial, online, gratis, con premios…), tarjetas con el cartel de cada evento y un mapa.
- Ficha de cada evento con enlace a la web oficial y botón para añadirlo al calendario.
- Calendarios para suscribirse: `/calendario/todo.ics`, `/calendario/espana.ics`, `/calendario/online.ics` y uno por tipo.

## Fuentes

| Fuente | Cómo |
|---|---|
| Devpost | JSON de su listado |
| MLH | JSON dentro de la página de la temporada |
| CTFtime | API pública |
| itch.io | Listado de jams (las que tienen bastante gente o están en español) |
| Eventbrite | JSON-LD de las búsquedas de España |
| dev.events | JSON-LD de su listado de España |
| A mano | `data/manuales.json` |

Cada recolector está en `scripts/fuentes/`. Si una fuente que daba eventos pasa a dar cero, `npm run recoger` termina con error.

## Desarrollo

```bash
npm install
npm run recoger   # descarga los eventos a src/data/eventos.json
npm run dev       # http://localhost:4321
npm run build     # web estática en dist/
```

Hecho con [Astro](https://astro.build), [Leaflet](https://leafletjs.com) y mapas de [OpenStreetMap](https://www.openstreetmap.org/copyright).

## ¿Falta tu evento?

Usa el formulario de «Publica tu evento» en la web, o añádelo a `data/manuales.json` con un pull request.

## Licencia

Código bajo licencia MIT. Los datos y los carteles de cada evento pertenecen a sus organizadores; Todothon solo los enlaza para informar.

Desarrollado por [Juan Bautista](https://volmer.es).
