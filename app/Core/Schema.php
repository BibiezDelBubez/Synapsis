<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Definizione dichiarativa di un'entità (config/entities/{nome}.php).
 * È l'unica fonte di verità per: tabella, campi, validazione, conversione dei tipi,
 * ricerca e form dell'interfaccia (lo schema viene esposto anche al JavaScript).
 *
 * Chiavi del file di definizione:
 *   table, label, label_plural, icon, title_field, subtitle_field (riga secondaria in elenchi e ricerca),
 *   list_columns (colonne della tabella nell'interfaccia),
 *   children ([[entity, foreign_key, label]]: sotto-elenchi mostrati nel pannello di dettaglio),
 *   quick_search (bool, default true: compare nella ricerca Ctrl+K),
 *   title_template (titolo calcolato, es. '{parent_id} → {child_id}[ ({moment})]': i ref diventano nomi,
 *                   gli enum etichette; le parti tra [ ] spariscono se vuote. Il titolo è nel campo virtuale _title),
 *   distinct ([campoA, campoB]: i due campi non possono avere lo stesso valore, es. genitore ≠ figlio),
 *   gender ('m' | 'f', default 'm': per scrivere "Nuovo personaggio" / "Nuova proprietà"),
 *   scoped (bool: appartiene a un caso → colonna case_id),
 *   searchable (campi per la ricerca testuale), order_by ([campo => ASC|DESC]),
 *   fields: [nome => [type, label, required, default, max, min, options, entity, rows, help, width, format, prefix, suffix]]
 *
 * Tipi supportati: string, text, int, float, bool, enum, date, datetime, color, ref, json,
 *                  image (percorso di un file caricato con POST /api/uploads, es. 'uploads/case-1/ab12.png')
 */
final class Schema
{
    public const TYPES = ['string', 'text', 'int', 'float', 'bool', 'enum', 'date', 'datetime', 'color', 'ref', 'json', 'image'];

    /** @var array<string, self> */
    private static array $cache = [];

    public readonly string $name;
    public readonly string $table;
    public readonly string $label;
    public readonly string $labelPlural;
    public readonly string $icon;
    public readonly string $titleField;
    public readonly ?string $subtitleField;
    /** @var string[] */
    public readonly array $listColumns;
    /** @var array<int, array{entity: string, foreign_key: string, label: string}> */
    public readonly array $children;
    public readonly bool $quickSearch;
    public readonly ?string $titleTemplate;
    public readonly string $gender;
    /** @var string[] */
    public readonly array $distinct;
    public readonly bool $scoped;
    /** @var string[] */
    public readonly array $searchable;
    /** @var array<string, string> */
    public readonly array $orderBy;
    /** @var array<string, array<string, mixed>> */
    public readonly array $fields;

    private function __construct(string $name, array $def)
    {
        $this->name        = $name;
        $this->table       = (string) ($def['table'] ?? $name);
        $this->label       = (string) ($def['label'] ?? ucfirst($name));
        $this->labelPlural = (string) ($def['label_plural'] ?? $this->label);
        $this->icon        = (string) ($def['icon'] ?? 'fa-cube');
        $this->scoped      = (bool) ($def['scoped'] ?? true);
        $this->fields      = self::normalizeFields($name, (array) ($def['fields'] ?? []));
        $this->gender      = ($def['gender'] ?? 'm') === 'f' ? 'f' : 'm';
        $this->titleTemplate = isset($def['title_template']) ? (string) $def['title_template'] : null;
        $this->titleField  = $this->titleTemplate !== null ? '_title' : (string) ($def['title_field'] ?? array_key_first($this->fields));
        $this->distinct    = array_values(array_intersect((array) ($def['distinct'] ?? []), array_keys($this->fields)));
        $this->subtitleField = isset($def['subtitle_field']) && isset($this->fields[$def['subtitle_field']]) ? (string) $def['subtitle_field'] : null;
        $this->listColumns = array_values(array_intersect((array) ($def['list_columns'] ?? array_slice($this->fieldNames(), 0, 4)), array_keys($this->fields)));
        $this->children    = array_values(array_map(static fn (array $c) => [
            'entity'      => (string) $c['entity'],
            'foreign_key' => (string) $c['foreign_key'],
            'label'       => (string) ($c['label'] ?? $c['entity']),
        ], (array) ($def['children'] ?? [])));
        $this->quickSearch = (bool) ($def['quick_search'] ?? true);
        $this->searchable  = array_values(array_intersect((array) ($def['searchable'] ?? [$this->titleField]), array_keys($this->fields)));
        $this->orderBy     = (array) ($def['order_by'] ?? ['id' => 'DESC']);
    }

    /** Carica (una volta sola) lo schema di un'entità. Lancia 404 se non esiste. */
    public static function get(string $name): self
    {
        if (!isset(self::$cache[$name])) {
            if (!preg_match('/^[a-z][a-z0-9_]*$/', $name)) {
                throw new HttpException(404, "Entità sconosciuta: {$name}");
            }
            $file = self::directory() . "/{$name}.php";
            if (!is_file($file)) {
                throw new HttpException(404, "Entità sconosciuta: {$name}");
            }
            self::$cache[$name] = new self($name, (array) require $file);
        }
        return self::$cache[$name];
    }

    public static function exists(string $name): bool
    {
        return (bool) preg_match('/^[a-z][a-z0-9_]*$/', $name) && is_file(self::directory() . "/{$name}.php");
    }

    /** @return string[] Nomi di tutte le entità definite. */
    public static function names(): array
    {
        // I file che iniziano con "_" sono frammenti condivisi (es. _sentiments.php), non entità
        $names = array_filter(
            array_map(static fn ($f) => basename($f, '.php'), glob(self::directory() . '/*.php') ?: []),
            static fn (string $n) => $n[0] !== '_'
        );
        sort($names);
        return array_values($names);
    }

    public static function directory(): string
    {
        return CONFIG_PATH . '/entities';
    }

    /** Colonne scrivibili dall'utente (esclusi id, case_id e timestamp). */
    public function fieldNames(): array
    {
        return array_keys($this->fields);
    }

    /** Tutte le colonne selezionabili/ordinabili della tabella. */
    public function columns(): array
    {
        return array_merge(['id'], $this->scoped ? ['case_id'] : [], $this->fieldNames(), ['created_at', 'updated_at']);
    }

    /**
     * Valida e converte i dati in ingresso.
     * $partial = true (aggiornamento): i campi assenti non sono obbligatori e non ricevono default.
     * @return array<string, mixed> Solo i campi noti, già convertiti nel tipo di database.
     * @throws HttpException 422 con details.fields = [campo => messaggio]
     */
    public function validate(array $input, bool $partial = false): array
    {
        $clean = [];
        $errors = [];

        foreach ($this->fields as $name => $field) {
            $present = array_key_exists($name, $input);
            if (!$present) {
                if ($partial) {
                    continue;
                }
                if (array_key_exists('default', $field)) {
                    $input[$name] = $field['default'];
                } elseif ($field['required']) {
                    $errors[$name] = 'Campo obbligatorio.';
                    continue;
                } else {
                    continue;
                }
            }

            $value = $input[$name];
            if (is_string($value)) {
                $value = trim($value);
            }
            if ($value === '' || $value === null) {
                if ($field['required']) {
                    $errors[$name] = 'Campo obbligatorio.';
                } else {
                    $clean[$name] = $field['type'] === 'bool' ? 0 : null;
                }
                continue;
            }

            $error = null;
            $clean[$name] = $this->convert($field, $value, $error);
            if ($error !== null) {
                $errors[$name] = $error;
                unset($clean[$name]);
            }
        }

        if ($errors !== []) {
            throw new HttpException(422, 'Alcuni campi non sono validi.', ['fields' => $errors]);
        }
        return $clean;
    }

    /** Converte una riga letta dal database nei tipi giusti per il JSON. */
    public function castRow(array $row): array
    {
        $row['id'] = (int) $row['id'];
        if (isset($row['case_id'])) {
            $row['case_id'] = (int) $row['case_id'];
        }
        foreach ($this->fields as $name => $field) {
            if (!array_key_exists($name, $row) || $row[$name] === null) {
                continue;
            }
            $row[$name] = match ($field['type']) {
                'int', 'ref' => (int) $row[$name],
                'float'      => (float) $row[$name],
                'bool'       => (bool) $row[$name],
                'json'       => json_decode((string) $row[$name], true),
                default      => $row[$name],
            };
        }
        return $row;
    }

    /** Rappresentazione pubblica per il frontend (form, etichette, colonne). */
    public function toArray(): array
    {
        return [
            'name'         => $this->name,
            'label'        => $this->label,
            'label_plural' => $this->labelPlural,
            'gender'       => $this->gender,
            'icon'         => $this->icon,
            'title_field'  => $this->titleField,
            'subtitle_field' => $this->subtitleField,
            'list_columns' => $this->listColumns,
            'children'     => $this->children,
            'scoped'       => $this->scoped,
            'searchable'   => $this->searchable,
            'fields'       => $this->fields,
        ];
    }

    // ------------------------------------------------------------------------

    private function convert(array $field, mixed $value, ?string &$error): mixed
    {
        switch ($field['type']) {
            case 'string':
            case 'text':
                if (!is_scalar($value)) {
                    $error = 'Deve essere un testo.';
                    return null;
                }
                $value = (string) $value;
                if (isset($field['max']) && mb_strlen($value) > $field['max']) {
                    $error = "Massimo {$field['max']} caratteri.";
                }
                return $value;

            case 'int':
            case 'ref':
                if (filter_var($value, FILTER_VALIDATE_INT) === false) {
                    $error = 'Deve essere un numero intero.';
                    return null;
                }
                $value = (int) $value;
                return $this->checkRange($field, $value, $error);

            case 'float':
                if (!is_numeric($value)) {
                    $error = 'Deve essere un numero.';
                    return null;
                }
                return $this->checkRange($field, (float) $value, $error);

            case 'bool':
                $bool = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($bool === null) {
                    $error = 'Valore sì/no non valido.';
                }
                return $bool ? 1 : 0;

            case 'enum':
                if (!array_key_exists((string) $value, $field['options'])) {
                    $error = 'Valore non ammesso.';
                }
                return (string) $value;

            case 'date':
                if (!is_string($value) || !self::isDate($value, 'Y-m-d')) {
                    $error = 'Data non valida (AAAA-MM-GG).';
                }
                return $value;

            case 'datetime':
                $value = is_string($value) ? str_replace('T', ' ', $value) : $value;
                if (is_string($value) && strlen($value) === 16) {
                    $value .= ':00';
                }
                if (!is_string($value) || !self::isDate($value, 'Y-m-d H:i:s')) {
                    $error = 'Data e ora non valide.';
                }
                return $value;

            case 'image':
                if (!is_string($value) || !preg_match(Upload::PATH_PATTERN, $value)) {
                    $error = 'Immagine non valida: caricala di nuovo.';
                }
                return $value;

            case 'color':
                if (!is_string($value) || !preg_match('/^#[0-9a-fA-F]{6}$/', $value)) {
                    $error = 'Colore non valido (#RRGGBB).';
                }
                return is_string($value) ? strtolower($value) : null;

            case 'json':
                return is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
        }
        $error = 'Tipo non gestito.';
        return null;
    }

    private function checkRange(array $field, int|float $value, ?string &$error): int|float
    {
        if (isset($field['min']) && $value < $field['min']) {
            $error = "Minimo {$field['min']}.";
        } elseif (isset($field['max']) && $value > $field['max']) {
            $error = "Massimo {$field['max']}.";
        }
        return $value;
    }

    private static function isDate(string $value, string $format): bool
    {
        $date = \DateTime::createFromFormat($format, $value);
        return $date !== false && $date->format($format) === $value;
    }

    /** Completa ogni campo con i valori predefiniti e controlla la definizione. */
    private static function normalizeFields(string $entity, array $fields): array
    {
        $normalized = [];
        foreach ($fields as $name => $field) {
            $type = $field['type'] ?? 'string';
            if (!in_array($type, self::TYPES, true)) {
                throw new \LogicException("Schema '{$entity}': tipo '{$type}' non valido per il campo '{$name}'.");
            }
            if ($type === 'enum' && empty($field['options'])) {
                throw new \LogicException("Schema '{$entity}': il campo enum '{$name}' non ha 'options'.");
            }
            if ($type === 'ref' && empty($field['entity'])) {
                throw new \LogicException("Schema '{$entity}': il campo ref '{$name}' non indica 'entity'.");
            }
            $normalized[$name] = $field + [
                'type'     => $type,
                'label'    => ucfirst(str_replace('_', ' ', (string) $name)),
                'required' => false,
            ];
        }
        return $normalized;
    }
}
