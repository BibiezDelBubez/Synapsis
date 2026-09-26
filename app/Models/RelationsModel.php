<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/**
 * Specializzazione dei Legami:
 * - un personaggio non può essere legato a sé stesso;
 * - se l'etichetta è vuota si usa il nome del tipo di legame (es. "Amicizia").
 */
final class RelationsModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $source = array_key_exists('source_id', $data) ? $data['source_id'] : ($before['source_id'] ?? null);
        $target = array_key_exists('target_id', $data) ? $data['target_id'] : ($before['target_id'] ?? null);
        if ($source !== null && $source === $target) {
            throw new HttpException(422, 'Un personaggio non può essere legato a sé stesso.', [
                'fields' => ['target_id' => 'Scegli un personaggio diverso da "Da".'],
            ]);
        }

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
