<?php
// Recibe el formulario «Publica tu evento».
//
// - Comprueba los datos y frena el spam: campo trampa, tiempo mínimo para rellenar y como mucho
//   5 envíos al día por IP.
// - Manda un correo de aviso al autor con el evento.
// - Lo añade a pendientes.json SIN el correo del organizador. La GitHub Action diaria lo lee y
//   abre un pull request; al aprobarlo, el evento sale publicado.
//
// No guarda ninguna contraseña ni clave. pendientes.json es público a propósito: solo lleva
// datos que de todas formas se van a publicar.

declare(strict_types=1);

const AVISAR_A = 'juanbautista.dev@volmer.es';
const REMITENTE = 'no-responder@volmer.es';
const MAX_POR_DIA = 5;
const SEGUNDOS_MINIMOS = 4;
const TIPOS = ['hackathon', 'datathon', 'ideathon', 'gamejam', 'ctf', 'otro'];
const MODALIDADES = ['presencial', 'online', 'hibrido'];

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function texto(string $campo, int $max = 200): ?string {
    $v = trim((string)($_POST[$campo] ?? ''));
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '';
    if ($v === '') return null;
    return mb_substr($v, 0, $max);
}

function fecha(string $campo): ?string {
    $v = texto($campo, 10);
    if ($v === null) return null;
    $d = DateTime::createFromFormat('!Y-m-d', $v);
    return ($d && $d->format('Y-m-d') === $v) ? $v : null;
}

function urlValida(?string $v): ?string {
    if ($v === null) return null;
    if (!filter_var($v, FILTER_VALIDATE_URL)) return null;
    return preg_match('#^https?://#i', $v) ? $v : null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['ok' => false, 'error' => 'Solo se admite POST.']);
}

// Trampas para robots: un campo oculto que una persona deja vacío, y un tiempo mínimo.
if (!empty($_POST['web_empresa'])) responder(200, ['ok' => true]);
$abierto = (int)($_POST['abierto'] ?? 0);
if ($abierto > 0 && (time() - intdiv($abierto, 1000)) < SEGUNDOS_MINIMOS) {
    responder(429, ['ok' => false, 'error' => 'Demasiado rápido. Revisa los datos y vuelve a enviar.']);
}

// Límite por IP (se guarda solo un hash, no la IP).
$dirPrivado = __DIR__ . '/privado';
if (!is_dir($dirPrivado)) @mkdir($dirPrivado, 0750, true);
$hashIp = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d'));
$ficheroLimite = $dirPrivado . '/limite-' . date('Y-m-d') . '.json';
$limites = is_file($ficheroLimite) ? (json_decode((string)file_get_contents($ficheroLimite), true) ?: []) : [];
if (($limites[$hashIp] ?? 0) >= MAX_POR_DIA) {
    responder(429, ['ok' => false, 'error' => 'Has enviado muchos eventos hoy. Vuelve mañana o escríbenos.']);
}

// Datos.
$nombre = texto('nombre', 140);
$url = urlValida(texto('url', 500));
$tipo = in_array($_POST['tipo'] ?? '', TIPOS, true) ? $_POST['tipo'] : null;
$modalidad = in_array($_POST['modalidad'] ?? '', MODALIDADES, true) ? $_POST['modalidad'] : null;
$inicio = fecha('inicio');
$fin = fecha('fin') ?? $inicio;
$correo = filter_var(texto('correo', 200) ?? '', FILTER_VALIDATE_EMAIL) ?: null;

$errores = [];
if (!$nombre) $errores[] = 'Falta el nombre del evento.';
if (!$url) $errores[] = 'La web oficial no es una dirección válida (tiene que empezar por https://).';
if (!$tipo) $errores[] = 'Elige el tipo de evento.';
if (!$modalidad) $errores[] = 'Elige el formato.';
if (!$inicio) $errores[] = 'Falta la fecha de inicio.';
if ($inicio && $inicio < date('Y-m-d')) $errores[] = 'El evento ya ha empezado: solo se publican eventos futuros.';
if ($inicio && $fin && $fin < $inicio) $errores[] = 'La fecha de fin es anterior a la de inicio.';
if ($errores) responder(422, ['ok' => false, 'error' => implode(' ', $errores)]);

$direccion = $modalidad === 'online' ? null : texto('direccion', 300);
$gratis = ($_POST['gratis'] ?? '') === '1' ? true : ((($_POST['gratis'] ?? '') === '0') ? false : null);
$requisitos = texto('requisitos', 200);

$evento = [
    'id' => 'todothon-' . substr(hash('sha256', $nombre . $inicio . $url), 0, 12),
    'nombre' => $nombre,
    'tipo' => $tipo,
    'inicio' => $inicio,
    'fin' => $fin,
    'plazo' => fecha('plazo'),
    'modalidad' => $modalidad,
    'ciudad' => $direccion ? trim((string)preg_replace('/^.*,\s*/', '', $direccion)) : null,
    'direccion' => $direccion,
    'pais' => $modalidad === 'online' ? null : 'ES',
    'url' => $url,
    'imagen' => urlValida(texto('imagen', 500)),
    'premio' => texto('premio', 120),
    'gratis' => $gratis,
    'requisitos' => $requisitos ? [$requisitos] : [],
    'fuente' => 'Todothon',
    'urlFuente' => $url,
    'enviado' => date('c'),
];

// Pendientes (sin el correo del organizador). Se quitan los de hace más de 60 días.
$ficheroPendientes = __DIR__ . '/pendientes.json';
$fp = fopen($ficheroPendientes, 'c+');
if (!$fp || !flock($fp, LOCK_EX)) responder(500, ['ok' => false, 'error' => 'No se ha podido guardar. Prueba en un rato.']);
$pendientes = json_decode((string)stream_get_contents($fp), true) ?: [];
$limite = date('c', strtotime('-60 days'));
$pendientes = array_values(array_filter($pendientes, fn($e) => ($e['enviado'] ?? '') >= $limite && $e['id'] !== $evento['id']));
$pendientes[] = $evento;
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($pendientes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
flock($fp, LOCK_UN);
fclose($fp);

$limites[$hashIp] = ($limites[$hashIp] ?? 0) + 1;
@file_put_contents($ficheroLimite, json_encode($limites));
foreach (glob($dirPrivado . '/limite-*.json') ?: [] as $viejo) {
    if ($viejo !== $ficheroLimite) @unlink($viejo);
}

// Aviso por correo.
$cuerpo = "Nuevo evento enviado a Todothon. Mañana la Action abrirá un pull request para aprobarlo.\n\n"
    . "Nombre: {$nombre}\nTipo: {$tipo} · {$modalidad}\nFechas: {$inicio} – {$fin}\nWeb: {$url}\n"
    . ($direccion ? "Dirección: {$direccion}\n" : '')
    . 'Correo del organizador: ' . ($correo ?: '(no lo ha dejado)') . "\n\n"
    . json_encode($evento, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
$cabeceras = [
    'From: Todothon <' . REMITENTE . '>',
    'Content-Type: text/plain; charset=utf-8',
];
if ($correo) $cabeceras[] = 'Reply-To: ' . $correo;
@mail(AVISAR_A, '=?UTF-8?B?' . base64_encode("Todothon: nuevo evento «{$nombre}»") . '?=', $cuerpo, implode("\r\n", $cabeceras));

responder(200, ['ok' => true]);
