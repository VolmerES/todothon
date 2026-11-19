<?php
// Intermediario para las fuentes que bloquean a los servidores de GitHub (dev.events, Eventbrite, 42).
// La Action diaria pide aquí lo que necesita y este PHP lo trae desde el hosting, que no está bloqueado.
//
// - Solo trae una lista cerrada de direcciones (no es un proxy abierto).
// - Guarda cada respuesta 3 horas en api/privado/cache: aunque alguien lo llame mil veces, a cada web
//   se le pide como mucho una vez cada 3 horas.
// - Para 42 necesita la aplicación de la intranet. Su UID y su secreto van en un fichero FUERA de la
//   web, en la carpeta del dominio (al lado de public_html): todothon-secretos.php, con este contenido:
//     <?php return ['ft_id' => 'UID de la aplicación', 'ft_secreto' => 'secreto de la aplicación'];

declare(strict_types=1);

const UA = 'Todothon/0.1 (+https://todothon.es)';
const CADUCA = 3 * 3600;
const EVENTBRITE = ['hackathon', 'hackaton', 'datathon', 'ideathon', 'game-jam', 'ctf', 'buildathon'];

header('X-Robots-Tag: noindex');

function fallar(int $codigo, string $motivo): void {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $motivo], JSON_UNESCAPED_UNICODE);
    exit;
}

/** GET (o POST si $formulario) con cURL. Devuelve [estado, cuerpo]. */
function pedir(string $url, array $cabeceras = [], ?array $formulario = null): array {
    $c = curl_init($url);
    curl_setopt_array($c, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 4,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_USERAGENT => UA,
        CURLOPT_HTTPHEADER => array_merge(['Accept-Language: es-ES,es;q=0.9,en;q=0.8'], $cabeceras),
        CURLOPT_ENCODING => '',
    ]);
    if ($formulario !== null) {
        curl_setopt($c, CURLOPT_POST, true);
        curl_setopt($c, CURLOPT_POSTFIELDS, http_build_query($formulario));
    }
    $cuerpo = curl_exec($c);
    $estado = (int)curl_getinfo($c, CURLINFO_RESPONSE_CODE);
    curl_close($c);
    return [$estado, $cuerpo === false ? '' : (string)$cuerpo];
}

/** Los eventos de los campus de 42 en España, en un solo JSON: [{campus, eventos}]. */
function eventos42(): array {
    $fichero = dirname(__DIR__, 2) . '/todothon-secretos.php';
    if (!is_file($fichero)) fallar(503, 'Falta todothon-secretos.php fuera de la web');
    $s = require $fichero;
    if (empty($s['ft_id']) || empty($s['ft_secreto'])) fallar(503, 'Faltan ft_id o ft_secreto');

    [$estado, $cuerpo] = pedir('https://api.intra.42.fr/oauth/token', [], [
        'grant_type' => 'client_credentials', 'client_id' => $s['ft_id'], 'client_secret' => $s['ft_secreto'],
    ]);
    $token = json_decode($cuerpo, true)['access_token'] ?? null;
    if (!$token) fallar(502, "Token de 42: HTTP $estado");
    $auth = ["Authorization: Bearer $token"];

    [$estado, $cuerpo] = pedir('https://api.intra.42.fr/v2/campus?filter%5Bcountry%5D=Spain&per_page=50', $auth);
    $campus = json_decode($cuerpo, true);
    if (!is_array($campus)) fallar(502, "Campus de 42: HTTP $estado");

    $ahora = gmdate('Y-m-d\TH:i:s\Z');
    $salida = [];
    foreach ($campus as $c) {
        if (($c['active'] ?? true) === false) continue;
        usleep(600000); // la API deja 2 peticiones por segundo
        [, $cuerpo] = pedir("https://api.intra.42.fr/v2/campus/{$c['id']}/events?range%5Bend_at%5D=$ahora,2100-01-01T00:00:00Z&per_page=100&sort=begin_at", $auth);
        $salida[] = ['campus' => $c, 'eventos' => json_decode($cuerpo, true) ?: []];
    }
    return $salida;
}

// --- Qué se pide -------------------------------------------------------------------------------------
$f = (string)($_GET['f'] ?? '');
$p = max(1, min(3, (int)($_GET['p'] ?? 1)));
$q = (string)($_GET['q'] ?? '');

if ($f === 'devevents') {
    $clave = 'devevents';
    $url = 'https://dev.events/hackathons/EU/ES';
} elseif ($f === 'eventbrite' && in_array($q, EVENTBRITE, true)) {
    $clave = "eventbrite-$q-$p";
    $url = "https://www.eventbrite.es/d/spain/$q/" . ($p > 1 ? "?page=$p" : '');
} elseif ($f === '42') {
    $clave = '42';
    $url = null;
} else {
    fallar(400, 'Fuente no admitida');
}

// --- Caché -------------------------------------------------------------------------------------------
$carpeta = __DIR__ . '/privado/cache';
if (!is_dir($carpeta)) mkdir($carpeta, 0750, true);
$cache = "$carpeta/$clave.dat";
$tipo = $f === '42' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8';

if (is_file($cache) && time() - filemtime($cache) < CADUCA) {
    header("Content-Type: $tipo");
    header('X-Cache: si');
    readfile($cache);
    exit;
}

// Que dos llamadas a la vez no pidan lo mismo dos veces.
$cerrojo = fopen("$cache.lock", 'c');
flock($cerrojo, LOCK_EX);

if ($f === '42') {
    $cuerpo = json_encode(eventos42(), JSON_UNESCAPED_UNICODE);
} else {
    [$estado, $cuerpo] = pedir($url);
    if ($estado < 200 || $estado >= 300 || $cuerpo === '') fallar(502, "$url → HTTP $estado");
}
file_put_contents($cache, $cuerpo, LOCK_EX);
flock($cerrojo, LOCK_UN);

header("Content-Type: $tipo");
header('X-Cache: no');
echo $cuerpo;
