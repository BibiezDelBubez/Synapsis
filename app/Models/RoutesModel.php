<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/**
 * Specializzazione dei Percorsi: non possono esistere due percorsi con lo stesso mezzo
 * tra gli stessi due luoghi (anche invertiti, se uno dei due vale al ritorno).
 */
final class RoutesModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $value = static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null);
        $from = $value('from_place_id');
        $to = $value('to_place_id');
        $mode = $value('mode') ?? 'walk';
        $twoWay = (bool) ($value('two_way') ?? true);

        foreach ($this->list(['filters' => ['mode' => $mode], 'limit' => PHP_INT_MAX])['data'] as $route) {
            if ($before !== null && $route['id'] === $before['id']) {
                continue;
            }
            $same = $route['from_place_id'] === $from && $route['to_place_id'] === $to;
            $reverse = $route['from_place_id'] === $to && $route['to_place_id'] === $from && ($twoWay || $route['two_way']);
            if ($same || $reverse) {
                throw new HttpException(422, 'Percorso già presente.', [
                    'fields' => ['to_place_id' => 'Esiste già un percorso con questo mezzo tra questi luoghi: modifica quello.'],
                ]);
            }
        }
        return $data;
    }
}
