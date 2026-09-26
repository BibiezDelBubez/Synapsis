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

    /** Cache per richiesta delle mappe id → titolo usate dai titoli calcolati (title_template). */
    private static array $titleMaps = [];

    public function __construct(
        public readonly Schema $schema,
        protected readonly ?int $caseId = null,
    ) {
        if ($schema->scoped && $caseId === null) {
            throw new HttpException(409, 'Nessun caso attivo: apri o crea un caso prima di continuare.');
        }
    }

    /** Istanzia il model dell'entità, specializzato se esiste App\Models\{Nome}Model. */
    public static function for(string $entity, ?int $caseId = null): self
    {
        $schema = Schema::get($entity);
        $class = 'App\\Models\\' . str_replace(' ', '', ucwords(str_replace('_', ' ', $entity))) . 'Model';
        // Sempre la classe dell'entità richiesta (mai quella da cui si chiama: self, non static)
        return class_exists($class) ? new $class($schema, $caseId) : new self($schema, $caseId);
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
            'data' => $this->decorate(array_map([$this->schema, 'castRow'], $rows)),
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ];
    }

    /**
     * Elenco leggero (id, titolo, sottotitolo) per ricerca rapida e menu a tendina.
     * @return array<int, array{id: int, title: string, subtitle: ?string}>
     */
    public function summaries(): array
    {
        if ($this->schema->titleTemplate !== null) {
            $subtitle = $this->schema->subtitleField;
            return array_map(static fn (array $r) => [
                'id'       => $r['id'],
                'title'    => $r['_title'],
                'subtitle' => $subtitle && $r[$subtitle] !== null ? mb_strimwidth((string) $r[$subtitle], 0, 120, '…') : null,
            ], $this->list(['limit' => self::MAX_LIMIT])['data']);
        }

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
        return $row === null ? null : $this->decorate([$this->schema->castRow($row)])[0];
    }

    /** Come find() ma lancia 404 se il record non esiste. */
    public function findOrFail(int $id): array
    {
        return $this->find($id) ?? throw new HttpException(404, "{$this->schema->label} #{$id} non trovato.");
    }

    public function create(array $input): array
    {
        $data = $this->schema->validate($input);
        $this->checkDistinct($data, null);
        $data = $this->beforeSave($data, null);
        $this->checkReferences($data);
        self::$titleMaps = [];

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
        $data = $this->schema->validate($input, true);
        $this->checkDistinct($data, $before);
        $data = $this->beforeSave($data, $before);
        $this->checkReferences($data);
        self::$titleMaps = [];

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
        self::$titleMaps = [];
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

    // --- Titoli calcolati e regole generiche ------------------------------------

    /** Aggiunge _title alle righe se lo schema ha un title_template. */
    protected function decorate(array $rows): array
    {
        $template = $this->schema->titleTemplate;
        if ($template === null || $rows === []) {
            return $rows;
        }
        return array_map(function (array $row) use ($template): array {
            // Parti opzionali [ … ]: spariscono se i loro segnaposto sono tutti vuoti
            $title = preg_replace_callback('/\[([^\]]*)\]/u', function (array $m) use ($row): string {
                $filled = false;
                $text = $this->fillPlaceholders($m[1], $row, $filled);
                return $filled ? $text : '';
            }, $template);
            $unused = false;
            $row['_title'] = trim($this->fillPlaceholders((string) $title, $row, $unused));
            return $row;
        }, $rows);
    }

    private function fillPlaceholders(string $text, array $row, bool &$filled): string
    {
        return (string) preg_replace_callback('/\{(\w+)\}/', function (array $m) use ($row, &$filled): string {
            $field = $this->schema->fields[$m[1]] ?? null;
            $value = $row[$m[1]] ?? null;
            if ($field === null || $value === null || $value === '') {
                return '';
            }
            $filled = true;
            return match ($field['type']) {
                'ref'   => $this->titleOf($field['entity'], (int) $value),
                'enum'  => (string) ($field['options'][$value] ?? $value),
                'bool'  => $value ? 'sì' : 'no',
                default => (string) $value,
            };
        }, $text);
    }

    /** Titolo di un record di un'altra entità (mappa caricata una volta per richiesta). */
    protected function titleOf(string $entity, int $id): string
    {
        $key = $entity . ':' . ($this->caseId ?? 0);
        if (!isset(self::$titleMaps[$key])) {
            self::$titleMaps[$key] = array_column(self::for($entity, $this->caseId)->summaries(), 'title', 'id');
        }
        return (string) (self::$titleMaps[$key][$id] ?? "#{$id}");
    }

    /** Regola 'distinct' dello schema: i campi indicati non possono coincidere (es. genitore e figlio). */
    protected function checkDistinct(array $data, ?array $before): void
    {
        if (count($this->schema->distinct) < 2) {
            return;
        }
        $values = array_map(
            static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null),
            $this->schema->distinct
        );
        $present = array_filter($values, static fn ($v) => $v !== null);
        if (count($present) > 1 && count(array_unique($present)) < count($present)) {
            $fields = $this->schema->distinct;
            $last = $fields[count($fields) - 1];
            $labels = array_map(fn (string $f) => $this->schema->fields[$f]['label'], $fields);
            throw new HttpException(422, 'Valori uguali non ammessi.', [
                'fields' => [$last => implode(' e ', $labels) . ' devono essere diversi.'],
            ]);
        }
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
