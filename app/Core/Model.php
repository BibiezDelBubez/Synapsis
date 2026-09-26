<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Model generico: CRUD, ricerca e paginazione per qualsiasi entità descritta da uno Schema.
 * Le query usano solo nomi di colonna presi dallo schema (mai dall'utente) e parametri preparati.
 *
 * Per aggiungere logica specifica a un'entità si crea App\Models\{NomeStudly}Model che estende
 * questa classe e sovrascrive gli hook (beforeSave, afterSave, afterDelete): Model::for() la usa in automatico.
 *
 * Entità "scoped" (schema.scoped = true): ogni operazione è limitata al caso indicato in $caseId.
 */
class Model
{
    public const MAX_LIMIT = 1000;
    public const DEFAULT_LIMIT = 200;

    public function __construct(
        public readonly Schema $schema,
        protected readonly ?int $caseId = null,
    ) {
        if ($schema->scoped && $caseId === null) {
            throw new HttpException(409, 'Nessun caso attivo: apri o crea un caso prima di continuare.');
        }
    }

    /** Istanzia il model dell'entità, specializzato se esiste App\Models\{Nome}Model. */
    public static function for(string $entity, ?int $caseId = null): static
    {
        $schema = Schema::get($entity);
        $class = 'App\\Models\\' . str_replace(' ', '', ucwords(str_replace('_', ' ', $entity))) . 'Model';
        return class_exists($class) ? new $class($schema, $caseId) : new static($schema, $caseId);
    }

    /**
     * Elenco con filtri.
     * $options: q (testo libero), filters ([campo => valore]), sort, dir, limit, offset
     * @return array{data: array<int, array<string, mixed>>, meta: array{total: int, limit: int, offset: int}}
     */
    public function list(array $options = []): array
    {
        [$where, $params] = $this->buildWhere($options);
        $table = $this->schema->table;

        $total = (int) Database::fetchValue("SELECT COUNT(*) FROM {$table}{$where}", $params);

        $limit = max(1, min(self::MAX_LIMIT, (int) ($options['limit'] ?? self::DEFAULT_LIMIT)));
        $offset = max(0, (int) ($options['offset'] ?? 0));
        $order = $this->buildOrder($options['sort'] ?? null, $options['dir'] ?? null);

        $rows = Database::fetchAll(
            "SELECT * FROM {$table}{$where}{$order} LIMIT {$limit} OFFSET {$offset}",
            $params
        );

        return [
            'data' => array_map([$this->schema, 'castRow'], $rows),
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ];
    }

    /**
     * Elenco leggero (id, titolo, sottotitolo) per ricerca rapida e menu a tendina.
     * @return array<int, array{id: int, title: string, subtitle: ?string}>
     */
    public function summaries(): array
    {
        [$where, $params] = $this->buildWhere([]);
        $title = $this->schema->titleField;
        $subtitle = $this->schema->subtitleField ?? 'NULL';
        $rows = Database::fetchAll(
            "SELECT id, {$title} AS title, {$subtitle} AS subtitle FROM {$this->schema->table}{$where}{$this->buildOrder(null, null)}",
            $params
        );
        return array_map(static fn (array $r) => [
            'id'       => (int) $r['id'],
            'title'    => (string) $r['title'],
            'subtitle' => $r['subtitle'] === null ? null : mb_strimwidth((string) $r['subtitle'], 0, 120, '…'),
        ], $rows);
    }

    public function find(int $id): ?array
    {
        [$scopeSql, $params] = $this->scope();
        $row = Database::fetchOne(
            "SELECT * FROM {$this->schema->table} WHERE id = ?{$scopeSql}",
            array_merge([$id], $params)
        );
        return $row === null ? null : $this->schema->castRow($row);
    }

    /** Come find() ma lancia 404 se il record non esiste. */
    public function findOrFail(int $id): array
    {
        return $this->find($id) ?? throw new HttpException(404, "{$this->schema->label} #{$id} non trovato.");
    }

    public function create(array $input): array
    {
        $data = $this->beforeSave($this->schema->validate($input), null);
        $this->checkReferences($data);

        $now = date('Y-m-d H:i:s');
        $data['created_at'] = $now;
        $data['updated_at'] = $now;
        if ($this->schema->scoped) {
            $data['case_id'] = $this->caseId;
        }

        $columns = array_keys($data);
        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $this->schema->table,
            implode(', ', $columns),
            implode(', ', array_fill(0, count($columns), '?'))
        );

        $record = Database::transaction(function () use ($sql, $data): array {
            Database::execute($sql, array_values($data));
            return $this->findOrFail(Database::lastInsertId());
        });
        $this->afterSave($record, null);
        return $record;
    }

    public function update(int $id, array $input): array
    {
        $before = $this->findOrFail($id);
        $data = $this->beforeSave($this->schema->validate($input, true), $before);
        $this->checkReferences($data);

        if ($data !== []) {
            $data['updated_at'] = date('Y-m-d H:i:s');
            $set = implode(', ', array_map(static fn ($c) => "{$c} = ?", array_keys($data)));
            [$scopeSql, $params] = $this->scope();
            Database::execute(
                "UPDATE {$this->schema->table} SET {$set} WHERE id = ?{$scopeSql}",
                array_merge(array_values($data), [$id], $params)
            );
        }

        $record = $this->findOrFail($id);
        $this->afterSave($record, $before);
        return $record;
    }

    public function delete(int $id): void
    {
        $record = $this->findOrFail($id);
        [$scopeSql, $params] = $this->scope();
        Database::execute(
            "DELETE FROM {$this->schema->table} WHERE id = ?{$scopeSql}",
            array_merge([$id], $params)
        );
        $this->afterDelete($record);
    }

    // --- Hook per i model specializzati -------------------------------------

    /** Ultima modifica ai dati validati prima della scrittura. $before è null in creazione. */
    protected function beforeSave(array $data, ?array $before): array
    {
        return $data;
    }

    protected function afterSave(array $record, ?array $before): void
    {
    }

    protected function afterDelete(array $record): void
    {
    }

    // --- Costruzione delle query --------------------------------------------

    /** @return array{0: string, 1: array} Condizione " AND case_id = ?" per le entità scoped. */
    protected function scope(): array
    {
        return $this->schema->scoped ? [' AND case_id = ?', [$this->caseId]] : ['', []];
    }

    /** @return array{0: string, 1: array} */
    protected function buildWhere(array $options): array
    {
        $conditions = [];
        $params = [];

        if ($this->schema->scoped) {
            $conditions[] = 'case_id = ?';
            $params[] = $this->caseId;
        }

        foreach ((array) ($options['filters'] ?? []) as $column => $value) {
            if (!in_array($column, $this->schema->fieldNames(), true)) {
                continue;
            }
            if ($value === null || $value === 'null') {
                $conditions[] = "{$column} IS NULL";
            } else {
                $conditions[] = "{$column} = ?";
                $params[] = $value;
            }
        }

        $q = trim((string) ($options['q'] ?? ''));
        if ($q !== '' && $this->schema->searchable !== []) {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
            $parts = array_map(static fn ($c) => "{$c} LIKE ? ESCAPE '\\'", $this->schema->searchable);
            $conditions[] = '(' . implode(' OR ', $parts) . ')';
            array_push($params, ...array_fill(0, count($parts), $like));
        }

        return [$conditions === [] ? '' : ' WHERE ' . implode(' AND ', $conditions), $params];
    }

    protected function buildOrder(?string $sort, ?string $dir): string
    {
        $columns = $this->schema->columns();
        if ($sort !== null && in_array($sort, $columns, true)) {
            $order = [$sort => strtoupper((string) $dir) === 'DESC' ? 'DESC' : 'ASC'];
        } else {
            $order = $this->schema->orderBy;
        }

        $parts = [];
        foreach ($order as $column => $direction) {
            if (in_array($column, $columns, true)) {
                $parts[] = $column . (strtoupper($direction) === 'DESC' ? ' DESC' : ' ASC');
            }
        }
        $parts[] = 'id DESC';
        return ' ORDER BY ' . implode(', ', array_unique($parts));
    }

    /** I campi di tipo ref devono puntare a un record esistente (nello stesso caso, se scoped). */
    protected function checkReferences(array $data): void
    {
        $errors = [];
        foreach ($this->schema->fields as $name => $field) {
            if ($field['type'] !== 'ref' || !isset($data[$name])) {
                continue;
            }
            $target = self::for($field['entity'], $this->caseId);
            if ($target->find((int) $data[$name]) === null) {
                $errors[$name] = "{$target->schema->label} inesistente.";
            }
        }
        if ($errors !== []) {
            throw new HttpException(422, 'Alcuni collegamenti non sono validi.', ['fields' => $errors]);
        }
    }
}
