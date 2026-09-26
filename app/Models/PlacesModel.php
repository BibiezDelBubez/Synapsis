<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/**
 * Specializzazione dei Luoghi: impedisce che un luogo stia dentro sé stesso,
 * direttamente o attraverso una catena (A dentro B dentro A).
 */
final class PlacesModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $parentId = $data['parent_id'] ?? null;
        if ($before === null || $parentId === null) {
            return $data;
        }

        $visited = [];
        while ($parentId !== null) {
            if ($parentId === $before['id'] || isset($visited[$parentId])) {
                throw new HttpException(422, 'Collegamento circolare tra luoghi.', [
                    'fields' => ['parent_id' => 'Un luogo non può trovarsi dentro sé stesso.'],
                ]);
            }
            $visited[$parentId] = true;
            $parentId = $this->find($parentId)['parent_id'] ?? null;
        }
        return $data;
    }
}
