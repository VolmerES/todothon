<?php
// «¿Vas a ir?» y «Busco equipo» de cada ficha: dos contadores por evento, sin cuentas ni datos personales.
//
//   GET  voy.php?slug=…                              → {"voy": n, "equipo": n}
//   POST voy.php  slug, tipo=voy|equipo, marcar=1|0, quien=<id aleatorio del navegador>
//
// - `quien` lo genera el navegador (localStorage) y aquí solo se guarda su huella (sha256 con sal), para que
//   un mismo navegador cuente una vez y pueda desmarcarse. No se guarda la IP.
// - Como mucho 40 cambios por hora y por IP (la IP se usa solo en memoria para el límite, con huella).
// - Todo vive en api/privado/voy/, que no se sirve nunca (.htaccess).

declare(strict_types=1);

const TIPOS = ['voy', 'equipo'];
const MAX_POR_HORA = 40;

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos);
    exit;
}

$slug = (string)($_REQUEST['slug'] ?? '');
if (!preg_match('/^[a-z0-9][a-z0-9-]{2,150}$/', $slug)) responder(400, ['error' => 'slug']);

$carpeta = __DIR__ . '/privado/voy';
if (!is_dir($carpeta)) mkdir($carpeta, 0750, true);
$fichero = "$carpeta/$slug.json";
// Sal propia del servidor, para que las huellas no se puedan comparar con nada de fuera.
$ficheroSal = "$carpeta/.sal";
if (!is_file($ficheroSal)) file_put_contents($ficheroSal, bin2hex(random_bytes(16)));
$sal = trim((string)file_get_contents($ficheroSal));

function leer(string $f): array {
    $d = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    return is_array($d) ? $d + ['voy' => [], 'equipo' => []] : ['voy' => [], 'equipo' => []];
}
function cuentas(array $d): array {
    return ['voy' => count($d['voy']), 'equipo' => count($d['equipo'])];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(200, cuentas(leer($fichero)));

// --- Escribir ---------------------------------------------------------------------------------------
$tipo = (string)($_POST['tipo'] ?? '');
$quien = (string)($_POST['quien'] ?? '');
$marcar = ($_POST['marcar'] ?? '1') === '1';
if (!in_array($tipo, TIPOS, true) || !preg_match('/^[a-f0-9]{32}$/', $quien)) responder(400, ['error' => 'datos']);

// Límite por IP.
$limite = "$carpeta/.limite-" . substr(hash('sha256', $sal . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 20);
$hora = date('YmdH');
[$h, $n] = is_file($limite) ? explode(' ', (string)file_get_contents($limite) . ' 0') : ['', '0'];
$n = $h === $hora ? (int)$n : 0;
if ($n >= MAX_POR_HORA) responder(429, ['error' => 'demasiados']);
file_put_contents($limite, "$hora " . ($n + 1));

$huella = substr(hash('sha256', "$sal|$slug|$quien"), 0, 24);
$fp = fopen($fichero, 'c+');
flock($fp, LOCK_EX);
$d = json_decode((string)stream_get_contents($fp), true);
$d = is_array($d) ? $d + ['voy' => [], 'equipo' => []] : ['voy' => [], 'equipo' => []];
$d[$tipo] = array_values(array_filter($d[$tipo], fn($x) => $x !== $huella));
if ($marcar) $d[$tipo][] = $huella;
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($d));
flock($fp, LOCK_UN);
fclose($fp);
responder(200, cuentas($d));
