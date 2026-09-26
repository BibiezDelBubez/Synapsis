<?php
/**
 * Sinapsi — bootstrap comune a web e CLI.
 * Definisce le costanti di percorso, registra l'autoloader PSR-4 (namespace App\ → app/)
 * e carica gli helper globali. Nessuna logica applicativa qui.
 */
declare(strict_types=1);

define('BASE_PATH', __DIR__);
define('APP_PATH', BASE_PATH . '/app');
define('CONFIG_PATH', BASE_PATH . '/config');
define('DATABASE_PATH', BASE_PATH . '/database');
define('STORAGE_PATH', BASE_PATH . '/storage');
define('PUBLIC_PATH', BASE_PATH . '/public');

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = APP_PATH . '/' . $relative . '.php';
    if (is_file($file)) {
        require $file;
    }
});

require APP_PATH . '/Core/helpers.php';

date_default_timezone_set((string) config('app.timezone', 'Europe/Rome'));
mb_internal_encoding('UTF-8');
