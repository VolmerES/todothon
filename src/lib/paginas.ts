// Páginas fijas por tipo y por ciudad («Game jams en España», «Hackathones en Madrid»…).
// Son las que Google enseña cuando alguien busca eso: cada una lista los eventos que tocan y se
// rehace sola cada día con los datos nuevos. Si una se queda sin eventos, enseña los online.
import { ciudadCorta, type Evento } from './formato';

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
  const ciudades = [...new Set([...CIUDADES_FIJAS, ...conEventos])];
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
