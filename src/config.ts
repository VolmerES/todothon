// Datos de la web que se cambian a mano.

// Página de Ko-fi para las donaciones. PENDIENTE: crear la cuenta y poner aquí la dirección buena.
export const URL_DONAR = 'https://ko-fi.com/todothon';

// Canal de Telegram con los eventos nuevos. PENDIENTE: crearlo.
export const URL_TELEGRAM = 'https://t.me/todothon';

// Autor, para el «Desarrollado por» del pie.
export const AUTOR = { nombre: 'Juan Bautista', url: 'https://volmer.es' };

// Repo público con el código y los eventos añadidos a mano.
export const URL_REPO = 'https://github.com/VolmerES/todothon';

// La palabra que va cambiando en el logo y en la portada.
export const PALABRAS = ['Hack', 'Data', 'Idea', 'Game', 'CTF', 'Todo'];
export const PLURALES = ['hackathon', 'datathon', 'ideatón', 'game jam', 'CTF', 'todothon'];

// Webs de las que salen los eventos, para el carrusel de la portada.
// `fuente` es el valor del campo `fuente` de cada evento (lo pone su recolector).
// Solo se muestran las que hoy aportan algún evento.
export const FUENTES: { fuente: string; url: string }[] = [
  { fuente: 'Devpost', url: 'https://devpost.com/hackathons' },
  { fuente: 'MLH', url: 'https://www.mlh.com' },
  { fuente: 'CTFtime', url: 'https://ctftime.org' },
  { fuente: 'itch.io', url: 'https://itch.io/jams' },
  { fuente: 'Eventbrite', url: 'https://www.eventbrite.es' },
  { fuente: 'dev.events', url: 'https://dev.events' },
  { fuente: 'Meetup', url: 'https://www.meetup.com' },
  { fuente: 'Luma', url: 'https://luma.com' },
  { fuente: 'GDG', url: 'https://gdg.community.dev' },
  { fuente: '42', url: 'https://www.42network.org' },
  { fuente: 'Taikai', url: 'https://taikai.network' },
  { fuente: 'Global Game Jam', url: 'https://globalgamejam.org' },
  { fuente: 'Todothon', url: '/publicar' },
];

export const TIPOS: Record<string, { nombre: string; color: string }> = {
  hackathon: { nombre: 'Hackathon', color: 'var(--lima)' },
  datathon: { nombre: 'Datathon', color: 'var(--azul)' },
  ideathon: { nombre: 'Ideatón', color: 'var(--ambar)' },
  gamejam: { nombre: 'Game jam', color: 'var(--rosa)' },
  ctf: { nombre: 'CTF', color: '#B8A6FF' },
  otro: { nombre: 'Otro', color: 'var(--tarjeta)' },
};
