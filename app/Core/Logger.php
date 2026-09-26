<?php
declare(strict_types=1);

namespace App\Core;

use Throwable;

/** Log su file (storage/logs/app.log). Non blocca mai l'app se la scrittura fallisce. */
final class Logger
{
    public static function error(Throwable|string $error): void
    {
        $text = $error instanceof Throwable
            ? sprintf("%s: %s in %s:%d\n%s", $error::class, $error->getMessage(), $error->getFile(), $error->getLine(), $error->getTraceAsString())
            : $error;
        self::write('ERROR', $text);
    }

    public static function info(string $message): void
    {
        self::write('INFO', $message);
    }

    private static function write(string $level, string $text): void
    {
        $file = (string) config('log.file');
        $dir = dirname($file);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        @file_put_contents($file, sprintf("[%s] %s %s\n", date('Y-m-d H:i:s'), $level, $text), FILE_APPEND | LOCK_EX);
    }
}
