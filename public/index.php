<?php
/**
 * Sinapsi — unico punto d'ingresso HTTP (front controller).
 */
declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

// Con il server integrato di PHP (php -S) i file statici vanno serviti direttamente
if (PHP_SAPI === 'cli-server') {
    $file = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($file !== __FILE__ && is_file($file)) {
        return false;
    }
}

(new App\Core\App())->run();
