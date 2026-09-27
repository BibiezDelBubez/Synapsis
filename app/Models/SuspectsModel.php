<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/** Specializzazione dei Sospettati: un personaggio compare una sola volta per ciascun delitto. */
final class SuspectsModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $value = static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null);
        $filters = ['crime_event_id' => $value('crime_event_id'), 'character_id' => $value('character_id')];
        foreach ($this->list(['filters' => $filters, 'limit' => 2])['data'] as $row) {
            if ($before === null || $row['id'] !== $before['id']) {
                throw new HttpException(422, 'Sospettato già presente.', [
                    'fields' => ['character_id' => 'Questo personaggio è già tra i sospettati di questo delitto.'],
                ]);
            }
        }
        return $data;
    }
}
