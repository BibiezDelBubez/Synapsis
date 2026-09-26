<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Applica in ordine i file .sql di database/migrations/{driver}/ non ancora eseguiti.
 * Ogni file viene eseguito in una transazione e registrato nella tabella `migrations`.
 * Convenzione nomi: 001_descrizione.sql, 002_descrizione.sql, ...
 */
final class Migrator
{
    public static function directory(): string
    {
        return DATABASE_PATH . '/migrations/' . Database::driver();
    }

    /** @return string[] Nomi dei file applicati in questa esecuzione. */
    public static function migrate(): array
    {
        self::ensureTable();
        $applied = [];

        foreach (self::pending() as $file) {
            $name = basename($file);
            $sql = (string) file_get_contents($file);

            Database::transaction(static function (\PDO $pdo) use ($sql, $name): void {
                $pdo->exec($sql);
                Database::execute(
                    'INSERT INTO migrations (filename, applied_at) VALUES (?, ?)',
                    [$name, date('Y-m-d H:i:s')]
                );
            });
            $applied[] = $name;
        }
        return $applied;
    }

    /** @return array<int, array{filename: string, applied_at: string}> */
    public static function applied(): array
    {
        self::ensureTable();
        return Database::fetchAll('SELECT filename, applied_at FROM migrations ORDER BY filename');
    }

    /** @return string[] Percorsi completi dei file non ancora applicati. */
    public static function pending(): array
    {
        self::ensureTable();
        $done = array_column(Database::fetchAll('SELECT filename FROM migrations'), 'filename');
        $files = glob(self::directory() . '/*.sql') ?: [];
        sort($files, SORT_STRING);

        return array_values(array_filter($files, static fn (string $f) => !in_array(basename($f), $done, true)));
    }

    private static function ensureTable(): void
    {
        $id = Database::driver() === 'mysql'
            ? 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY'
            : 'INTEGER PRIMARY KEY AUTOINCREMENT';

        Database::connection()->exec(
            "CREATE TABLE IF NOT EXISTS migrations (
                id {$id},
                filename VARCHAR(190) NOT NULL UNIQUE,
                applied_at VARCHAR(19) NOT NULL
            )"
        );
    }
}
