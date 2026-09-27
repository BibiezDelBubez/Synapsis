<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/** Specializzazione dei Capitoli: il numero è unico nel caso. */
final class ChaptersModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $number = array_key_exists('number', $data) ? $data['number'] : ($before['number'] ?? null);
        foreach ($this->list(['filters' => ['number' => $number], 'limit' => 2])['data'] as $row) {
            if ($before === null || $row['id'] !== $before['id']) {
                throw new HttpException(422, 'Capitolo già presente.', [
                    'fields' => ['number' => "Esiste già il capitolo {$number}."],
                ]);
            }
        }
        return $data;
    }
}
