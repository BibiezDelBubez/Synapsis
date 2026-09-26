<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Controller;
use App\Core\Model;
use App\Core\Schema;
use App\Core\Settings;

/**
 * GET /api/search — indice leggero di tutto ciò che appartiene al caso aperto
 * (personaggi, luoghi, asset e ogni futura entità "scoped").
 * La ricerca fuzzy avviene nel browser (Fuse.js), quindi è istantanea mentre si digita.
 */
final class SearchController extends Controller
{
    public function index(): array
    {
        $caseId = Settings::activeCaseId();
        if ($caseId === null) {
            return ['case_id' => null, 'items' => []];
        }

        $items = [];
        foreach (Schema::names() as $name) {
            $schema = Schema::get($name);
            if (!$schema->scoped || !$schema->quickSearch) {
                continue;
            }
            foreach (Model::for($name, $caseId)->summaries() as $row) {
                $items[] = ['entity' => $name] + $row;
            }
        }
        return ['case_id' => $caseId, 'items' => $items];
    }
}
