<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;
use App\Core\Settings;

/**
 * Specializzazione dei Casi: se si elimina il caso aperto, nessun caso resta attivo.
 * (Le entità collegate verranno eliminate dal database con ON DELETE CASCADE.)
 */
final class CasesModel extends Model
{
    protected function afterDelete(array $record): void
    {
        if (Settings::activeCaseId() === $record['id']) {
            Settings::setActiveCaseId(null);
        }
    }
}
