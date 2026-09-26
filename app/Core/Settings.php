<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Impostazioni persistenti chiave/valore (tabella settings).
 */
final class Settings
{
    public static function get(string $name, ?string $default = null): ?string
    {
        $value = Database::fetchValue('SELECT value FROM settings WHERE name = ?', [$name]);
        return $value === null ? $default : (string) $value;
    }

    public static function set(string $name, ?string $value): void
    {
        $now = date('Y-m-d H:i:s');
        if (Database::driver() === 'mysql') {
            Database::execute(
                'INSERT INTO settings (name, value, updated_at) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
                [$name, $value, $now]
            );
            return;
        }
        Database::execute(
            'INSERT INTO settings (name, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
            [$name, $value, $now]
        );
    }

    /** Id del caso attualmente aperto, o null. */
    public static function activeCaseId(): ?int
    {
        $id = self::get('active_case_id');
        return $id === null || $id === '' ? null : (int) $id;
    }

    public static function setActiveCaseId(?int $id): void
    {
        self::set('active_case_id', $id === null ? null : (string) $id);
    }
}
