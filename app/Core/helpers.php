<?php
/**
 * Helper globali: brevi scorciatoie usate da controller e viste.
 * Ogni funzione delega a una classe del Core, così la logica resta in un solo posto.
 */
declare(strict_types=1);

use App\Core\Config;
use App\Core\Request;

if (!function_exists('config')) {
    /** Legge un valore di configurazione con notazione a punti: config('db.driver'). */
    function config(string $key, mixed $default = null): mixed
    {
        return Config::get($key, $default);
    }
}

if (!function_exists('e')) {
    /** Escape HTML sicuro per l'output nelle viste. */
    function e(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

if (!function_exists('url')) {
    /** URL assoluto (rispetto al dominio) di un percorso dell'app, funziona anche in sottocartella. */
    function url(string $path = '/'): string
    {
        return rtrim(Request::basePath(), '/') . '/' . ltrim($path, '/');
    }
}

if (!function_exists('asset')) {
    /** URL di un file in public/ con versione basata sulla data di modifica (niente cache vecchie). */
    function asset(string $path): string
    {
        $path = ltrim($path, '/');
        $file = PUBLIC_PATH . '/' . $path;
        $version = is_file($file) ? (string) filemtime($file) : (string) config('app.version');
        return url($path) . '?v=' . $version;
    }
}
