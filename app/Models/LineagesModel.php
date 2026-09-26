<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use App\Core\HttpException;
use App\Core\Model;

/**
 * Specializzazione delle Filiazioni: impedisce i cicli nell'albero
 * (un figlio non può essere anche antenato del proprio genitore).
 */
final class LineagesModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $parent = $data['parent_id'] ?? $before['parent_id'] ?? null;
        $child = $data['child_id'] ?? $before['child_id'] ?? null;
        if ($parent === null || $child === null) {
            return $data;
        }

        // Risale gli antenati del genitore: se incontra il figlio, sarebbe un ciclo
        $queue = [$parent];
        $seen = [];
        while ($queue !== []) {
            $current = array_shift($queue);
            if ($current === $child) {
                throw new HttpException(422, 'Albero genealogico circolare.', [
                    'fields' => ['child_id' => 'Questo personaggio è già un antenato del genitore scelto.'],
                ]);
            }
            if (isset($seen[$current])) {
                continue;
            }
            $seen[$current] = true;
            $rows = Database::fetchAll(
                'SELECT parent_id FROM lineages WHERE child_id = ? AND case_id = ? AND id <> ?',
                [$current, $this->caseId, $before['id'] ?? 0]
            );
            foreach ($rows as $row) {
                $queue[] = (int) $row['parent_id'];
            }
        }
        return $data;
    }
}
