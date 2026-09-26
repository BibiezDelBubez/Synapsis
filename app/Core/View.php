<?php
declare(strict_types=1);

namespace App\Core;

use RuntimeException;

/**
 * Motore di viste in PHP puro.
 * render('home') esegue app/Views/home.php e ne inserisce l'output in app/Views/layout.php
 * come variabile $content. partial() include frammenti riutilizzabili da app/Views/partials/.
 */
final class View
{
    public static function render(string $template, array $data = [], ?string $layout = 'layout'): string
    {
        $content = self::capture($template, $data);
        if ($layout === null) {
            return $content;
        }
        return self::capture($layout, $data + ['content' => $content]);
    }

    public static function partial(string $name, array $data = []): string
    {
        return self::capture('partials/' . $name, $data);
    }

    private static function capture(string $template, array $data): string
    {
        $file = APP_PATH . '/Views/' . $template . '.php';
        if (!is_file($file)) {
            throw new RuntimeException('Vista non trovata: ' . $template);
        }
        extract($data, EXTR_SKIP);
        ob_start();
        try {
            require $file;
            return (string) ob_get_clean();
        } catch (\Throwable $e) {
            ob_end_clean();
            throw $e;
        }
    }
}
