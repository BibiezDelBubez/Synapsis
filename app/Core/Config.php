<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Accesso in sola lettura ai file in /config.
 * config('app.name') carica config/config.php; config('modules') carica config/modules.php.
 * Il primo segmento della chiave indica il file quando non è una sezione di config.php.
 */
final class Config
{
    /** @var array<string, array<mixed>> */
    private static array $files = [];

    public static function get(string $key, mixed $default = null): mixed
    {
        $segments = explode('.', $key);
        $main = self::load('config');

        if (array_key_exists($segments[0], $main)) {
            $value = $main;
        } else {
            $value = self::load(array_shift($segments));
            if ($segments === []) {
                return $value ?: $default;
            }
        }

        foreach ($segments as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }
        return $value;
    }

    /** @return array<mixed> */
    private static function load(string $name): array
    {
        if (!isset(self::$files[$name])) {
            $file = CONFIG_PATH . '/' . basename($name) . '.php';
            self::$files[$name] = is_file($file) ? (array) require $file : [];
        }
        return self::$files[$name];
    }
}
