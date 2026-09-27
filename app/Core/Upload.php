<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Salvataggio e rimozione delle immagini caricate (planimetrie, mappe…).
 * I file finiscono in public/uploads/case-{id}/ con un nome casuale; nel database si salva il percorso relativo.
 * Sono accettate solo immagini raster verificate (PNG, JPEG, GIF, WebP).
 */
final class Upload
{
    /** Percorso valido salvabile in un campo di tipo image. */
    public const PATH_PATTERN = '#^uploads/case-\d+/[a-f0-9]{16}\.(png|jpg|gif|webp)$#';

    private const TYPES = [
        IMAGETYPE_PNG  => 'png',
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_GIF  => 'gif',
        IMAGETYPE_WEBP => 'webp',
    ];

    /**
     * @param array{tmp_name: string, error: int, size: int} $file  voce di $_FILES
     * @return array{path: string, width: int, height: int}
     */
    public static function storeImage(array $file, int $caseId): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpException(422, self::errorMessage((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE)));
        }
        $maxBytes = (int) config('uploads.max_mb', 15) * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            throw new HttpException(422, 'Immagine troppo grande (massimo ' . config('uploads.max_mb', 15) . ' MB).');
        }
        $info = @getimagesize($file['tmp_name']);
        if ($info === false || !isset(self::TYPES[$info[2]])) {
            throw new HttpException(422, 'Formato non supportato: usa PNG, JPEG, GIF o WebP.');
        }

        $folder = 'case-' . $caseId;
        $dir = rtrim((string) config('uploads.dir'), '/') . '/' . $folder;
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException('Impossibile creare la cartella dei caricamenti.');
        }
        $name = bin2hex(random_bytes(8)) . '.' . self::TYPES[$info[2]];
        if (!move_uploaded_file($file['tmp_name'], "{$dir}/{$name}")) {
            throw new \RuntimeException('Impossibile salvare l\'immagine.');
        }
        return ['path' => "uploads/{$folder}/{$name}", 'width' => (int) $info[0], 'height' => (int) $info[1]];
    }

    /** Elimina un file caricato (solo percorsi validi dentro uploads/). */
    public static function delete(?string $path): void
    {
        if ($path === null || !preg_match(self::PATH_PATTERN, $path)) {
            return;
        }
        $file = dirname(rtrim((string) config('uploads.dir'), '/')) . '/' . $path;
        if (is_file($file)) {
            @unlink($file);
        }
    }

    /** Elimina tutte le immagini di un caso (quando il caso viene eliminato). */
    public static function deleteCaseFolder(int $caseId): void
    {
        $dir = rtrim((string) config('uploads.dir'), '/') . '/case-' . $caseId;
        if (!is_dir($dir)) {
            return;
        }
        foreach (glob($dir . '/*') ?: [] as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
        @rmdir($dir);
    }

    private static function errorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Immagine troppo grande per le impostazioni di PHP (upload_max_filesize).',
            UPLOAD_ERR_NO_FILE => 'Nessun file ricevuto.',
            default => 'Caricamento non riuscito (codice ' . $code . ').',
        };
    }
}
