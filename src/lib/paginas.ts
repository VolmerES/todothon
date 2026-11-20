// Páginas fijas por tipo y por ciudad («Game jams en España», «Hackathones en Madrid»…).
// Son las que Google enseña cuando alguien busca eso: cada una lista los eventos que tocan y se
// rehace sola cada día con los datos nuevos. Si una se queda sin eventos, enseña los online.
import { ciudadCorta, etiquetas, type Evento } from './formato';
import { TEMAS } from '../config';

const IA = new RegExp(TEMAS.find((t) => t.clave === 'ia')!.patron, 'i');
const textoDe = (e: Evento) => `${e.nombre} ${e.organizador || ''} ${(e.temas || []).join(' ')} ${e.descripcion || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export interface Pagina {
  slug: string;
  titulo: string;        // <title> y h1
  resalte: string;       // la palabra del h1 que va en pegatina
  descripcion: string;   // meta description
  intro: string;         // párrafo de arriba, con algo útil, no solo palabras clave
  filtro: (e: Evento) => boolean;
  guia?: string;         // slug de la guía relacionada
}

const sinTildes = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const anio = new Date().getUTCFullYear();

export const PAGINAS_TIPO: Pagina[] = [
  {
    slug: 'hackathones-espana',
    titulo: `Hackathones en España ${anio}`, resalte: 'Hackathones',
    descripcion: `Todos los hackathones presenciales de España en ${anio}: fechas, ciudad, premios y enlace a la inscripción. Se actualiza cada día.`,
    intro: 'Los hackathones de universidades, empresas, ayuntamientos y comunidades de toda España, juntos y ordenados por fecha. Cada mañana se repasan las webs donde se anuncian, así que lo que ves aquí está al día.',
    filtro: (e) => e.pais === 'ES' && e.tipo === 'hackathon',
    guia: 'que-es-un-hackathon',
  },
  {
    slug: 'hackathones-online',
    titulo: `Hackathones online ${anio}`, resalte: 'online',
    descripcion: 'Hackathones online a los que puedes apuntarte desde casa, desde España: fechas, premios y enlace a la inscripción.',
    intro: 'Sin moverte de casa: hackathones online abiertos a gente de España, con premios y fechas. Ideales para estrenarte o para un finde con amigos.',
    filtro: (e) => e.modalidad === 'online' && e.tipo === 'hackathon',
    guia: 'primer-hackathon',
  },
  {
    slug: 'game-jams',
    titulo: `Game jams ${anio} en España y online`, resalte: 'Game jams',
    descripcion: `Game jams presenciales en España y online en ${anio}: fechas, temas y enlace para apuntarte. Se actualiza cada día.`,
    intro: 'Haz un videojuego en un fin de semana. Aquí están las game jams presenciales de España y las online más interesantes, de itch.io a la Global Game Jam.',
    filtro: (e) => e.tipo === 'gamejam',
    guia: 'que-es-una-game-jam',
  },
  {
    slug: 'ctf',
    titulo: `CTF ${anio}: competiciones de ciberseguridad`, resalte: 'CTF',
    descripcion: `Competiciones CTF de ciberseguridad en España y online en ${anio}: fechas, formato y enlace para apuntarte.`,
    intro: 'Capture the flag: retos de ciberseguridad para resolver en equipo. Los presenciales de España y los online de todo el mundo en los que puedes participar.',
    filtro: (e) => e.tipo === 'ctf',
    guia: 'que-es-un-ctf',
  },
  {
    slug: 'datathones',
    titulo: `Datathones ${anio} en España y online`, resalte: 'Datathones',
    descripcion: `Datathones y hackathones de datos en España y online en ${anio}: fechas, premios y enlace a la inscripción.`,
    intro: 'Competiciones de análisis de datos, ciencia de datos y machine learning, de universidades, hospitales y empresas.',
    filtro: (e) => e.tipo === 'datathon',
  },
  {
    slug: 'hackathones-ia',
    titulo: `Hackathones de IA ${anio} en España y online`, resalte: 'IA',
    descripcion: `Hackathones de inteligencia artificial, agentes y machine learning en España y online en ${anio}: fechas, premios y enlace a la inscripción.`,
    intro: 'Agentes, modelos de lenguaje, visión artificial, machine learning… Todos los hackathones con la inteligencia artificial en el centro.',
    filtro: (e) => IA.test(textoDe(e)) && (e.pais === 'ES' || e.modalidad !== 'presencial'),
  },
  {
    slug: 'hackathones-principiantes',
    titulo: `Hackathones para principiantes ${anio}`, resalte: 'principiantes',
    descripcion: 'Hackathones y game jams pensados para gente que empieza: sin experiencia previa, con mentores y buen ambiente.',
    intro: 'Si es tu primera vez, estos son los que lo ponen fácil: abiertos a gente sin experiencia, con mentores y talleres.',
    filtro: (e) => etiquetas(e).includes('Para principiantes'),
    guia: 'primer-hackathon',
  },
  {
    slug: 'hackathones-con-premios',
    titulo: `Hackathones con premios ${anio}`, resalte: 'premios',
    descripcion: `Hackathones, datathones y CTF con premios en metálico, viajes o prácticas, en España y online en ${anio}.`,
    intro: 'Premios en metálico, viajes, prácticas o créditos: los que tienen algo más que la gloria en juego.',
    filtro: (e) => etiquetas(e).includes('Con premios') && (e.pais === 'ES' || e.modalidad !== 'presencial'),
  },
  {
    slug: 'ideatones',
    titulo: `Ideatones ${anio} en España y online`, resalte: 'Ideatones',
    descripcion: `Ideatones en España y online en ${anio}: retos de ideas y emprendimiento, sin necesidad de programar.`,
    intro: 'Retos de ideas: en vez de programar, se diseña una solución y se presenta. Perfectos si no programas o si te interesa emprender.',
    filtro: (e) => e.tipo === 'ideathon',
  },
];

// Ciudades con página propia siempre (aunque hoy no tengan eventos), más las que tengan alguno.
const CIUDADES_FIJAS = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Zaragoza'];

export function paginasCiudad(eventos: Evento[]): Pagina[] {
  const deEspana = eventos.filter((e) => e.pais === 'ES' && e.modalidad !== 'online');
  const conEventos = deEspana.map(ciudadCorta).filter((c) => c !== 'Lugar por confirmar');
  // Una sola página por ciudad aunque una fuente escriba «Malaga» y otra «Málaga»: gana la primera (las fijas, con tilde).
  const porClave = new Map<string, string>();
  for (const c of [...CIUDADES_FIJAS, ...conEventos]) if (!porClave.has(sinTildes(c))) porClave.set(sinTildes(c), c);
  const ciudades = [...porClave.values()];
  return ciudades.map((c) => {
    const clave = sinTildes(c);
    return {
      slug: `hackathones-${clave.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      titulo: `Hackathones en ${c} ${anio}`, resalte: c,
      descripcion: `Hackathones, game jams, datathones y CTF en ${c} en ${anio}: fechas, lugar y enlace a la inscripción. Se actualiza cada día.`,
      intro: `Todo lo que se celebra en ${c}: hackathones, game jams, datathones, ideatones y CTF, presenciales y ordenados por fecha.`,
      filtro: (e: Evento) => e.pais === 'ES' && e.modalidad !== 'online' && sinTildes(ciudadCorta(e)) === clave,
    };
  });
}
