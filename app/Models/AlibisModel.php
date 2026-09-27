<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/** Specializzazione degli Alibi: fine ≥ inizio, non crolla prima di essere dichiarato. */
final class AlibisModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $value = static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null);
        $errors = [];
        if ($value('start_at') !== null && $value('end_at') !== null && $value('end_at') < $value('start_at')) {
            $errors['end_at'] = 'La fine non può precedere l\'inizio.';
        }
        if ($value('given_chapter') !== null && $value('broken_chapter') !== null && $value('broken_chapter') < $value('given_chapter')) {
            $errors['broken_chapter'] = 'Non può crollare prima di essere dichiarato (capitolo ' . $value('given_chapter') . ').';
        }
        if ($errors) {
            throw new HttpException(422, 'Alcuni campi non sono validi.', ['fields' => $errors]);
        }
        return $data;
    }
}
