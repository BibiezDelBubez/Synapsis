<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Backup e ripristino di un intero caso (dati di tutte le entità + immagini caricate) in un unico JSON.
 *
 * Esportazione: { format, version, app_version, exported_at, case, entities: { nome: [righe] }, files: { percorso: base64 } }
 * Ripristino: crea SEMPRE un nuovo caso (non sovrascrive nulla), rinumerando gli id e ricollegando i riferimenti.
 * Tutto è guidato dagli schemi in config/entities: una nuova entità entra nel backup senza toccare questo file.
 */
final class CaseArchive
{
    public const FORMAT = 'sinapsi-case';
    public const VERSION = 1;

    /** Riferimenti "polimorfici": campo id → campo che contiene il nome dell'entità. */
    private const POLYMORPHIC = ['ideas' => ['converted_id' => 'converted_entity']];

    /** @return array<string, mixed> */
    public static function export(int $caseId): array
    {
        $case = Database::fetchOne('SELECT * FROM cases WHERE id = ?', [$caseId]);
        if ($case === null) {
            throw new HttpException(404, 'Caso non trovato.');
        }
        $entities = [];
        $files = [];
        foreach (self::scopedSchemas() as $schema) {
            $rows = Database::fetchAll("SELECT * FROM {$schema->table} WHERE case_id = ? ORDER BY id", [$caseId]);
            $entities[$schema->name] = $rows;
            foreach (self::imageFields($schema) as $field) {
                foreach ($rows as $row) {
                    $path = $row[$field] ?? null;
                    $file = self::filePath($path);
                    if ($file !== null && is_file($file)) {
                        $files[$path] = base64_encode((string) file_get_contents($file));
                    }
                }
            }
        }
        return [
            'format'      => self::FORMAT,
            'version'     => self::VERSION,
            'app_version' => config('app.version'),
            'exported_at' => date('c'),
            'case'        => $case,
            'entities'    => $entities,
            'files'       => (object) $files,
        ];
    }

    /** Ripristina un backup come nuovo caso. @return array{id: int, title: string, records: int} */
    public static function import(array $data): array
    {
        if (($data['format'] ?? null) !== self::FORMAT || !is_array($data['case'] ?? null) || !is_array($data['entities'] ?? null)) {
            throw new HttpException(422, 'Il file non è un backup di un caso di Sinapsi.');
        }
        if ((int) ($data['version'] ?? 0) > self::VERSION) {
            throw new HttpException(422, 'Backup creato con una versione più recente di Sinapsi.');
        }

        $written = [];
        try {
            return Database::transaction(function () use ($data, &$written): array {
                $caseId = self::insertCase($data['case']);
                $schemas = self::importOrder(array_keys($data['entities']));
                $idMap = [];
                $deferred = [];
                $count = 0;
                $files = (array) ($data['files'] ?? []);

                foreach ($schemas as $schema) {
                    foreach ((array) $data['entities'][$schema->name] as $row) {
                        if (!is_array($row) || !isset($row['id'])) {
                            continue;
                        }
                        $values = ['case_id' => $caseId];
                        $later = [];
                        $skip = false;
                        foreach ($schema->fields as $name => $field) {
                            if (!array_key_exists($name, $row)) {
                                continue; // colonna aggiunta dopo il backup: vale il default del database
                            }
                            $value = $row[$name];
                            if ($field['type'] === 'ref' && $value !== null && Schema::get($field['entity'])->scoped) {
                                $target = $field['entity'];
                                if (!empty($field['required']) && $target !== $schema->name) {
                                    $value = $idMap[$target][(int) $value] ?? null;
                                    if ($value === null) {
                                        $skip = true; // il record a cui appartiene non è nel backup
                                        break;
                                    }
                                } else {
                                    $later[$name] = [$target, (int) $value];
                                    $value = null;
                                }
                            } elseif ($field['type'] === 'image' && $value !== null) {
                                $value = isset($files[$value]) ? self::writeImage((string) $files[$value], (string) $value, $caseId, $written) : null;
                            }
                            $values[$name] = $value;
                        }
                        if ($skip) {
                            continue;
                        }
                        $values['created_at'] = $row['created_at'] ?? date('Y-m-d H:i:s');
                        $values['updated_at'] = $row['updated_at'] ?? date('Y-m-d H:i:s');

                        $columns = implode(', ', array_keys($values));
                        $marks = implode(', ', array_fill(0, count($values), '?'));
                        Database::execute("INSERT INTO {$schema->table} ({$columns}) VALUES ({$marks})", array_values($values));
                        $newId = Database::lastInsertId();
                        $idMap[$schema->name][(int) $row['id']] = $newId;
                        $count++;
                        foreach (self::POLYMORPHIC[$schema->name] ?? [] as $idField => $entityField) {
                            if (!empty($row[$idField]) && !empty($row[$entityField])) {
                                $later[$idField] = [(string) $row[$entityField], (int) $row[$idField]];
                            }
                        }
                        if ($later) {
                            $deferred[] = [$schema->table, $newId, $later];
                        }
                    }
                }

                // Secondo passaggio: riferimenti facoltativi, verso sé stessi o verso entità importate dopo
                foreach ($deferred as [$table, $id, $refs]) {
                    $set = [];
                    $params = [];
                    foreach ($refs as $field => [$target, $oldId]) {
                        $set[] = "{$field} = ?";
                        $params[] = $idMap[$target][$oldId] ?? null;
                    }
                    $params[] = $id;
                    Database::execute("UPDATE {$table} SET " . implode(', ', $set) . ' WHERE id = ?', $params);
                }

                $title = (string) Database::fetchValue('SELECT title FROM cases WHERE id = ?', [$caseId]);
                return ['id' => $caseId, 'title' => $title, 'records' => $count];
            });
        } catch (\Throwable $e) {
            foreach ($written as $file) {
                @unlink($file);
            }
            throw $e;
        }
    }

    /** Elimina le immagini del caso che nessun record usa più. @return int file rimossi */
    public static function cleanupUploads(int $caseId): int
    {
        $dir = rtrim((string) config('uploads.dir'), '/') . '/case-' . $caseId;
        if (!is_dir($dir)) {
            return 0;
        }
        $used = [];
        foreach (self::scopedSchemas() as $schema) {
            foreach (self::imageFields($schema) as $field) {
                foreach (Database::fetchAll("SELECT {$field} AS p FROM {$schema->table} WHERE case_id = ? AND {$field} IS NOT NULL", [$caseId]) as $row) {
                    $used[basename((string) $row['p'])] = true;
                }
            }
        }
        $removed = 0;
        foreach (glob($dir . '/*') ?: [] as $file) {
            if (is_file($file) && !isset($used[basename($file)]) && @unlink($file)) {
                $removed++;
            }
        }
        return $removed;
    }

    // --- Interni ------------------------------------------------------------------------------------

    /** @return Schema[] */
    private static function scopedSchemas(): array
    {
        return array_values(array_filter(array_map([Schema::class, 'get'], Schema::names()), static fn (Schema $s) => $s->scoped));
    }

    /** @return string[] */
    private static function imageFields(Schema $schema): array
    {
        return array_keys(array_filter($schema->fields, static fn (array $f) => $f['type'] === 'image'));
    }

    private static function filePath(?string $path): ?string
    {
        if ($path === null || !preg_match(Upload::PATH_PATTERN, $path)) {
            return null;
        }
        return dirname(rtrim((string) config('uploads.dir'), '/')) . '/' . $path;
    }

    private static function insertCase(array $case): int
    {
        $schema = Schema::get('cases');
        $values = array_intersect_key($case, $schema->fields);
        $title = trim((string) ($values['title'] ?? 'Caso ripristinato')) ?: 'Caso ripristinato';
        if ((int) Database::fetchValue('SELECT COUNT(*) FROM cases WHERE title = ?', [$title]) > 0) {
            $title .= ' (ripristinato ' . date('d/m/Y H:i') . ')';
        }
        $values['title'] = $title;
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['updated_at'] = $values['created_at'];
        $columns = implode(', ', array_keys($values));
        $marks = implode(', ', array_fill(0, count($values), '?'));
        Database::execute("INSERT INTO cases ({$columns}) VALUES ({$marks})", array_values($values));
        return Database::lastInsertId();
    }

    /**
     * Ordina le entità in modo che quelle a cui un'altra fa riferimento con un campo obbligatorio arrivino prima.
     * @param string[] $names
     * @return Schema[]
     */
    private static function importOrder(array $names): array
    {
        $pending = [];
        foreach ($names as $name) {
            if (Schema::exists((string) $name) && Schema::get((string) $name)->scoped) {
                $pending[$name] = Schema::get((string) $name);
            }
        }
        $ordered = [];
        while ($pending) {
            $progress = false;
            foreach ($pending as $name => $schema) {
                $ready = true;
                foreach ($schema->fields as $field) {
                    if ($field['type'] === 'ref' && !empty($field['required']) && $field['entity'] !== $name && isset($pending[$field['entity']])) {
                        $ready = false;
                        break;
                    }
                }
                if ($ready) {
                    $ordered[] = $schema;
                    unset($pending[$name]);
                    $progress = true;
                }
            }
            if (!$progress) {
                throw new \RuntimeException('Dipendenze circolari tra entità: impossibile ripristinare.');
            }
        }
        return $ordered;
    }

    /** @param string[] $written */
    private static function writeImage(string $base64, string $oldPath, int $caseId, array &$written): ?string
    {
        $bytes = base64_decode($base64, true);
        if ($bytes === false || @getimagesizefromstring($bytes) === false) {
            return null;
        }
        $ext = pathinfo($oldPath, PATHINFO_EXTENSION);
        if (!in_array($ext, ['png', 'jpg', 'gif', 'webp'], true)) {
            return null;
        }
        $dir = rtrim((string) config('uploads.dir'), '/') . '/case-' . $caseId;
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException('Impossibile creare la cartella delle immagini.');
        }
        $name = bin2hex(random_bytes(8)) . '.' . $ext;
        file_put_contents("{$dir}/{$name}", $bytes);
        $written[] = "{$dir}/{$name}";
        return "uploads/case-{$caseId}/{$name}";
    }
}
