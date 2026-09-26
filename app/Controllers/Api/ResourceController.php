<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Controller;
use App\Core\Model;
use App\Core\Response;
use App\Core\Schema;
use App\Core\Settings;

/**
 * API REST generica per ogni entità definita in config/entities/.
 *
 *   GET    /api/{entity}           elenco   (?q=testo &campo=valore &sort= &dir= &limit= &offset=)
 *   POST   /api/{entity}           crea
 *   GET    /api/{entity}/{id}      dettaglio
 *   PUT    /api/{entity}/{id}      modifica (anche PATCH: si inviano solo i campi da cambiare)
 *   DELETE /api/{entity}/{id}      elimina
 *
 * Le entità "scoped" lavorano sul caso attivo (o su ?case_id=N se indicato).
 */
final class ResourceController extends Controller
{
    private const RESERVED_QUERY = ['q', 'sort', 'dir', 'limit', 'offset', 'case_id'];

    public function index(string $entity): array
    {
        $model = $this->model($entity);
        $filters = array_intersect_key(
            array_diff_key($this->request->query, array_flip(self::RESERVED_QUERY)),
            array_flip($model->schema->fieldNames())
        );

        return $model->list([
            'q'       => $this->request->query['q'] ?? null,
            'filters' => $filters,
            'sort'    => $this->request->query['sort'] ?? null,
            'dir'     => $this->request->query['dir'] ?? null,
            'limit'   => $this->request->query['limit'] ?? null,
            'offset'  => $this->request->query['offset'] ?? null,
        ]);
    }

    public function show(string $entity, int $id): array
    {
        return ['data' => $this->model($entity)->findOrFail($id)];
    }

    public function store(string $entity): Response
    {
        return $this->json(['data' => $this->model($entity)->create($this->request->json())], 201);
    }

    public function update(string $entity, int $id): array
    {
        return ['data' => $this->model($entity)->update($id, $this->request->json())];
    }

    public function destroy(string $entity, int $id): Response
    {
        $this->model($entity)->delete($id);
        return new Response('', 204);
    }

    private function model(string $entity): Model
    {
        $schema = Schema::get($entity);
        $caseId = null;
        if ($schema->scoped) {
            $requested = $this->request->query['case_id'] ?? null;
            $caseId = $requested !== null && ctype_digit((string) $requested) ? (int) $requested : Settings::activeCaseId();
        }
        return Model::for($entity, $caseId);
    }
}
