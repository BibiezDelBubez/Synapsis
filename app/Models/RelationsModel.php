<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Specializzazione dei Legami: se l'etichetta è vuota si usa il nome del tipo di legame (es. "Amicizia").
 * (Che "Da" e "A" siano diversi lo garantisce la regola 'distinct' dello schema.)
 */
final class RelationsModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $labelMissing = $before === null
            ? ($data['label'] ?? null) === null
            : array_key_exists('label', $data) && $data['label'] === null;
        if ($labelMissing) {
            $type = $data['type'] ?? $before['type'] ?? 'other';
            $data['label'] = $this->schema->fields['type']['options'][$type] ?? 'Legame';
        }
        return $data;
    }
}
