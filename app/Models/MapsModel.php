<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;
use App\Core\Upload;

/**
 * Specializzazione delle Planimetrie: quando l'immagine viene sostituita, tolta
 * o la planimetria eliminata, il file non più usato viene rimosso dal disco.
 */
final class MapsModel extends Model
{
    protected function afterSave(array $record, ?array $before): void
    {
        if ($before !== null && ($before['image'] ?? null) !== ($record['image'] ?? null)) {
            Upload::delete($before['image'] ?? null);
        }
    }

    protected function afterDelete(array $record): void
    {
        Upload::delete($record['image'] ?? null);
    }
}
