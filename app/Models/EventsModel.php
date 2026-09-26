<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/**
 * Specializzazione degli Eventi:
 * - un evento accaduto (noto o nascosto) deve avere l'inizio "verità";
 * - un evento falso deve avere l'inizio "come viene creduto";
 * - la fine non può precedere l'inizio.
 */
final class EventsModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $value = static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null);
        $errors = [];

        $kind = $value('kind') ?? 'fact';
        if ($kind === 'false') {
            if ($value('perceived_start') === null) {
                $errors['perceived_start'] = 'Un evento falso va collocato quando viene creduto.';
            }
        } elseif ($value('real_start') === null) {
            $errors['real_start'] = 'Serve l\'inizio per collocare l\'evento nella timeline.';
        }

        foreach (['real', 'perceived'] as $line) {
            $start = $value("{$line}_start");
            $end = $value("{$line}_end");
            if ($start !== null && $end !== null && $end < $start) {
                $errors["{$line}_end"] = 'La fine non può precedere l\'inizio.';
            }
        }

        if ($errors !== []) {
            throw new HttpException(422, 'Date dell\'evento non valide.', ['fields' => $errors]);
        }
        return $data;
    }
}
