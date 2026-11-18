# Todothon — decisiones

Buscador de hackathones de España (y online internacionales), sin ánimo de lucro y para la comunidad.
Decidido con Volmer el 2026-11-18.

## Producto
- **Público:** todo el ecosistema (participantes, organizadores, patrocinadores y empresas). Se empieza por los participantes.
- **Objetivo:** comunidad primero; monetizar más adelante (destacados, patrocinios, empleo).
- **Tipos:** hackathones, datathones, ideatones, game jams, CTF y cualquier otro evento con este formato.
- **Online:** también los internacionales abiertos a gente de España.
- **Idioma:** español; catalán, euskera y gallego más adelante.
- **Primera versión sin IA.** La IA llega después.

## La web
- **Buscador como los de vuelos.** Barra principal con dónde (ciudad u online), cuándo (fechas), qué (tipo) y tema o palabra clave.
- **Filtros:** plazo de inscripción abierto; gratis o de pago y premios; perfil y requisitos; duración y formato.
- **Resultados en tarjetas con imagen.**
- **Modo mapa:** cada evento en su dirección exacta y círculos por ciudad al alejar (OpenStreetMap).
- **Ficha propia** por evento (datos, mapa, añadir al calendario) con botón a la web oficial.
- **Banner** de proyecto sin ánimo de lucro: «si quieres donar 1 € para mantener servidor, dominios y API, es bienvenido». Donación por **Ko-fi o Buy Me a Coffee**.
- Que sea **fácil**.

## Marca
- **Nombre: Todothon.** La palabra va cambiando: Hack·athon → Data·thon → Idea·thon → Game·thon → Todo·thon (y game jam, CTF…).
- **Dominios libres** a 2026-11-18: todothon.es, .com, .dev y .org (sin comprar; el .es pide DNI).
- **Tono:** hacker y gamberro.
- **Estética (elegida el 2026-11-18):** base «Pegatina» (B) con **botón de modo terminal** que mantiene el rollo pegatina (oscuro, verde fósforo, mismas sombras duras). Huevo de pascua: escribir `sudo` en el buscador activa el modo terminal.
- **Carteles de los eventos:** cada imagen va «pegada» como una pegatina (marco blanco, un poco torcida, cinta adhesiva, recorte fijo 16:10) para que carteles de cualquier estilo convivan. Si un evento no tiene imagen, se genera una portada propia con el tipo de evento en grande.
  - El cartel se muestra **tal cual** lo hizo el organizador: no se adapta ni se recolorea. Solo el marco es nuestro.
  - Se muestra **entero** (sin recortar texto); el hueco sobrante se rellena con su color dominante, calculado al descargarlo.
  - Cada cartel se **descarga, se pasa a WebP y se guarda** en nuestro servidor al actualizar; nunca se enlaza el original.
  - Uso informativo y con enlace a la web oficial; el organizador puede subir el suyo y se quita si lo piden.

## Comunidad y lanzamiento
- **Organizadores:** formulario sin cuenta; llega un aviso y se publica.
- **Avisos:** canal de Telegram, calendario suscribible (ICS) y newsletter semanal.
- **Difusión:** LinkedIn y X, universidades y asociaciones, Reddit y foros, en los propios hackathones, y hablar con las empresas que organizan hackathones.

## Técnica
- **Código abierto:** repo público.
- **Alojamiento:** el VPS o el hosting de Hostinger, lo que sea mejor. Web estática que se regenera sola cada día.
- Sin trabajo de mantenimiento: todo automático; solo un aviso si una fuente falla.

## Fuentes en marcha (2026-11-18, `npm run recoger`)
| Fuente | Cómo | Eventos | De España |
|---|---|---|---|
| Devpost | JSON interno; online + presenciales en España | 81 | 0 |
| MLH | JSON dentro del HTML de la temporada | 1 | 1 (HackEPS, Lleida) |
| CTFtime | API pública; online + presenciales en España | 21 | 0 |
| itch.io | HTML; jams con ≥150 apuntados o en español, sin las de música o cómic | ~14 | 0 |
| Eventbrite | JSON-LD de las búsquedas de España; solo nombres con formato de hackathon | 2 | 2 |
| dev.events | JSON-LD de su listado de España | 1 | 1 |

Conclusión: **las plataformas internacionales casi no tienen eventos de España**. Lo español está en Meetup, Luma, webs de universidades y ayuntamientos. Sin IA hay que cubrirlo con más recolectores (Meetup, Luma, 42), con la lista a mano `data/manuales.json` y con el formulario de organizadores. Con IA, la búsqueda diaria.

- `jam` a secas no vale como filtro: en Eventbrite cuela sesiones de jazz e impro. Solo «game jam», «gamejam», «jam de (video)juegos».
- El robot se identifica como `Todothon/0.1 (+https://todothon.es)`. Con una tilde en el nombre, MLH respondía 403.
- Nominatim (OpenStreetMap) para las coordenadas, con caché en `data/geocache.json` y una petición por segundo.
- **API de 42** (pendiente): `/v2/campus/:id/events` de Madrid, Barcelona, Málaga y Urduliz, filtrando por `kind`. Hace falta una app de la intranet; credenciales como secretos de GitHub. Marcar los internos como «solo estudiantes de 42».

## Fuentes (prueba del 2026-11-18)
- **Devpost:** `devpost.com/api/hackathons` responde con JSON. Ubicación en texto libre; filtrar por España a mano.
- **CTFtime:** API pública (`ctftime.org/api/v1/events/`).
- **MLH:** la URL de la temporada redirige; falta mirar la buena.
- **itch.io:** no tiene `jams/upcoming.json`; hay que leer el HTML de `itch.io/jams`.
- **Luma:** el endpoint de descubrimiento probado no existe; falta buscar el bueno.
- Pendiente: medir cuántos eventos españoles da cada fuente.
