<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Controller;
use App\Core\Model;
use App\Core\Settings;

/**
 * Stato di lavoro corrente: quale caso è aperto.
 *   GET /api/session          → { active_case: {...} | null }
 *   PUT /api/session/case     body { "id": 3 } per aprire un caso, { "id": null } per chiuderlo
 */
final class SessionController extends Controller
{
    public function show(): array
    {
        return ['active_case' => $this->activeCase()];
    }

    public function setCase(): array
    {
        $id = $this->request->json()['id'] ?? null;
        if ($id === null) {
            Settings::setActiveCaseId(null);
            return ['active_case' => null];
        }
        if (filter_var($id, FILTER_VALIDATE_INT) === false) {
            $this->abort(422, 'Id del caso non valido.');
        }
        $case = Model::for('cases')->findOrFail((int) $id);
        Settings::setActiveCaseId($case['id']);
        return ['active_case' => $case];
    }

    private function activeCase(): ?array
    {
        $id = Settings::activeCaseId();
        if ($id === null) {
            return null;
        }
        $case = Model::for('cases')->find($id);
        if ($case === null) {
            Settings::setActiveCaseId(null);
        }
        return $case;
    }
}
