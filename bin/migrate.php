<?php
/**
 * Applica le migrazioni da riga di comando:
 *   php bin/migrate.php          → applica quelle mancanti
 *   php bin/migrate.php status   → mostra applicate e in attesa
 */
declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

use App\Core\Database;
use App\Core\Migrator;

if (PHP_SAPI !== 'cli') {
    exit('Solo da riga di comando.');
}

$command = $argv[1] ?? 'migrate';
echo 'Database: ' . Database::driver() . ' ' . Database::serverVersion() . PHP_EOL;

if ($command === 'status') {
    foreach (Migrator::applied() as $m) {
        echo "  [x] {$m['filename']}  ({$m['applied_at']})" . PHP_EOL;
    }
    foreach (Migrator::pending() as $file) {
        echo '  [ ] ' . basename($file) . PHP_EOL;
    }
    exit(0);
}

$applied = Migrator::migrate();
echo $applied === []
    ? 'Nessuna migrazione da applicare.' . PHP_EOL
    : 'Applicate: ' . implode(', ', $applied) . PHP_EOL;
