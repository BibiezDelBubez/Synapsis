<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/** Specializzazione delle Conoscenze: una sola voce per personaggio e informazione. */
final class KnowledgeModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $value = static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null);
        $filters = ['fact_id' => $value('fact_id'), 'character_id' => $value('character_id')];
        foreach ($this->list(['filters' => $filters, 'limit' => 2])['data'] as $row) {
            if ($before === null || $row['id'] !== $before['id']) {
                throw new HttpException(422, 'Conoscenza già registrata.', [
                    'fields' => ['character_id' => 'Questo personaggio ha già una voce per questa informazione: modifica quella.'],
                ]);
            }
        }
        return $data;
    }
}
