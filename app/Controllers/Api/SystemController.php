<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Migrator;
use App\Core\Schema;

/** Endpoint di sistema: diagnostica e metadati usati dall'interfaccia. */
final class SystemController extends Controller
{
    /** GET /api/health — verifica PHP, database e migrazioni. */
    public function health(): array
    {
        $driver = Database::driver();
        $applied = Migrator::applied();

        return [
            'status' => 'ok',
            'app' => [
                'name'    => config('app.name'),
                'version' => config('app.version'),
                'debug'   => (bool) config('app.debug'),
            ],
            'php' => [
                'version'    => PHP_VERSION,
                'extensions' => [
                    'pdo_sqlite' => extension_loaded('pdo_sqlite'),
                    'pdo_mysql'  => extension_loaded('pdo_mysql'),
                    'mbstring'   => extension_loaded('mbstring'),
                ],
            ],
            'database' => [
                'driver'   => $driver,
                'version'  => Database::serverVersion(),
                'file'     => $driver === 'sqlite' ? basename((string) config('db.sqlite.path')) : null,
                'size_kb'  => $driver === 'sqlite' ? round(filesize((string) config('db.sqlite.path')) / 1024, 1) : null,
                'cases'    => (int) Database::fetchValue('SELECT COUNT(*) FROM cases'),
            ],
            'migrations' => [
                'applied' => $applied,
                'pending' => array_map('basename', Migrator::pending()),
            ],
            'server_time' => date('c'),
        ];
    }

    /** GET /api/modules — registro dei moduli (config/modules.php). */
    public function modules(): array
    {
        return ['modules' => config('modules', [])];
    }

    /** GET /api/schema — definizioni di tutte le entità, usate dai form dell'interfaccia. */
    public function schemas(): array
    {
        $schemas = [];
        foreach (Schema::names() as $name) {
            $schemas[$name] = Schema::get($name)->toArray();
        }
        return ['schemas' => $schemas];
    }
}
