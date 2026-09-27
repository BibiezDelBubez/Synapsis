<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/**
 * Specializzazione degli Indizi: il significato non può essere svelato prima che l'indizio sia scoperto.
 */
final class CluesModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $value = static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null);
        $found = $value('found_chapter');
        $revealed = $value('revealed_chapter');
        if ($found !== null && $revealed !== null && $revealed < $found) {
            throw new HttpException(422, 'Capitoli incoerenti.', [
                'fields' => ['revealed_chapter' => 'Non può essere svelato prima di essere scoperto (capitolo ' . $found . ').'],
            ]);
        }
        return $data;
    }
}
