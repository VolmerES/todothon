// Datos de la web que se cambian a mano.

// Página de Ko-fi para las donaciones (la misma que la de los juegos de volmer.es/juegos).
export const URL_DONAR = 'https://ko-fi.com/juanbautistadev';

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
  { fuente: 'Búsqueda IA', url: '/sobre' },
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

// Temas del buscador, en español. Las fuentes los dan en inglés («Machine Learning/AI»…), así que cada
// tema busca varias palabras en el texto del evento (nombre, organizador, temas), ya sin tildes.
export const TEMAS: { clave: string; nombre: string; patron: string }[] = [
  { clave: 'ia', nombre: 'IA y machine learning', patron: 'machine learning|\bai\b|\bia\b|inteligencia artificial|\bllm|genai|\bagent' },
  { clave: 'principiantes', nombre: 'Para principiantes', patron: 'beginner|principiante|first.?time|novato' },
  { clave: 'social', nombre: 'Impacto social', patron: 'social good|impacto|sostenib|climat|clima|\bods\b|sdg|green' },
  { clave: 'educacion', nombre: 'Educación', patron: 'educa|edtech' },
  { clave: 'salud', nombre: 'Salud', patron: 'health|salud|medic|\bbio' },
  { clave: 'web', nombre: 'Web y apps', patron: '\bweb\b|mobile|\bapps?\b' },
  { clave: 'datos', nombre: 'Datos', patron: '\bdata|datos|database|datath' },
  { clave: 'seguridad', nombre: 'Ciberseguridad', patron: 'cyber|ciber|security|seguridad|\bctf\b' },
  { clave: 'juegos', nombre: 'Videojuegos', patron: 'gaming|game|juego|\bjam\b' },
  { clave: 'fintech', nombre: 'Fintech y blockchain', patron: 'fintech|blockchain|crypto|web3|financ' },
  { clave: 'diseno', nombre: 'Diseño', patron: 'design|diseno|\bux\b|\bui\b' },
  { clave: 'hardware', nombre: 'Hardware, IoT y robots', patron: '\biot\b|hardware|robot|arduino|maker' },
  { clave: 'nocode', nombre: 'No-code', patron: 'no.?code|low.?code' },
  { clave: 'xr', nombre: 'Realidad virtual', patron: 'ar/vr|\bvr\b|\bxr\b|realidad (virtual|aumentada)' },
  { clave: 'cuantica', nombre: 'Computación cuántica', patron: 'quantum|cuantic' },
  { clave: 'espacio', nombre: 'Espacio', patron: '\bspace\b|espacio|\bnasa\b|satelit' },
];
