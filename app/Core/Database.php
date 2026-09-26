<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOStatement;
use RuntimeException;
use Throwable;

/**
 * Unico punto di accesso al database (PDO).
 * Il driver si sceglie in config/config.php → db.driver ('sqlite' | 'mysql').
 * Tutti i Model passeranno da qui: query preparate, transazioni, helper di lettura.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        return self::$pdo ??= self::connect();
    }

    public static function driver(): string
    {
        return (string) config('db.driver', 'sqlite');
    }

    /** Esegue una query preparata e restituisce lo statement. */
    public static function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = self::connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /** @return array<int, array<string, mixed>> */
    public static function fetchAll(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public static function fetchOne(string $sql, array $params = []): ?array
    {
        $row = self::query($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    public static function fetchValue(string $sql, array $params = []): mixed
    {
        $value = self::query($sql, $params)->fetchColumn();
        return $value === false ? null : $value;
    }

    /** Esegue INSERT/UPDATE/DELETE e restituisce le righe coinvolte. */
    public static function execute(string $sql, array $params = []): int
    {
        return self::query($sql, $params)->rowCount();
    }

    public static function lastInsertId(): int
    {
        return (int) self::connection()->lastInsertId();
    }

    /**
     * Esegue la callback in una transazione: commit se va a buon fine, rollback in caso di eccezione.
     * @template T
     * @param callable(PDO): T $callback
     * @return T
     */
    public static function transaction(callable $callback): mixed
    {
        $pdo = self::connection();
        $pdo->beginTransaction();
        try {
            $result = $callback($pdo);
            // In MySQL i comandi DDL (CREATE/ALTER) chiudono da soli la transazione
            if ($pdo->inTransaction()) {
                $pdo->commit();
            }
            return $result;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /** Versione del motore di database, per diagnostica. */
    public static function serverVersion(): string
    {
        return (string) self::connection()->getAttribute(PDO::ATTR_SERVER_VERSION);
    }

    private static function connect(): PDO
    {
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        return match (self::driver()) {
            'sqlite' => self::connectSqlite($options),
            'mysql'  => self::connectMysql($options),
            default  => throw new RuntimeException('Driver database non supportato: ' . self::driver()),
        };
    }

    private static function connectSqlite(array $options): PDO
    {
        if (!extension_loaded('pdo_sqlite')) {
            throw new RuntimeException("Estensione PHP 'pdo_sqlite' non attiva. Abilitala nel php.ini.");
        }
        $cfg = (array) config('db.sqlite');
        $path = (string) $cfg['path'];
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Impossibile creare la cartella del database: ' . $dir);
        }

        $pdo = new PDO('sqlite:' . $path, null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = ' . preg_replace('/[^A-Z]/', '', strtoupper((string) ($cfg['journal_mode'] ?? 'DELETE'))));
        $pdo->exec('PRAGMA busy_timeout = ' . (int) ($cfg['busy_timeout'] ?? 5000));
        return $pdo;
    }

    private static function connectMysql(array $options): PDO
    {
        $cfg = (array) config('db.mysql');
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $cfg['host'],
            (int) $cfg['port'],
            $cfg['database'],
            $cfg['charset'] ?? 'utf8mb4'
        );
        return new PDO($dsn, (string) $cfg['username'], (string) $cfg['password'], $options);
    }
}
