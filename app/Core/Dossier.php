<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Dossier del caso in Markdown, generato dagli schemi delle entità (nessun modello di pagina da mantenere).
 * Ogni sezione è un'entità "principale"; le entità figlie (schema.children) compaiono dentro il record padre.
 */
final class Dossier
{
    /** Sezioni disponibili, nell'ordine del dossier. */
    public const SECTIONS = [
        'characters', 'places', 'assets', 'relations', 'lineages', 'unions', 'wills', 'events', 'routes', 'maps',
        'clues', 'suspects', 'alibis', 'chapters', 'facts', 'lies', 'tropes', 'ideas',
    ];

    /** @var array<string, array<int, string>> entità → [id → titolo] */
    private array $titles = [];

    /** @var array<string, array<int, array<string, mixed>>> entità → righe */
    private array $rows = [];

    public function __construct(private readonly int $caseId, private readonly string $baseUrl = '')
    {
    }

    /** @param string[] $sections */
    public function markdown(array $sections): string
    {
        $case = Model::for('cases')->findOrFail($this->caseId);
        $caseSchema = Schema::get('cases');
        $sections = array_values(array_intersect(self::SECTIONS, $sections ?: self::SECTIONS));

        $out = ['# ' . $this->text((string) $case['title'])];
        if (!empty($case['subtitle'])) {
            $out[] = '*' . $this->text((string) $case['subtitle']) . '*';
        }
        $out[] = '';
        $out[] = '> Dossier generato da Sinapsi il ' . date('d/m/Y \a\l\l\e H:i') . '.';
        $out[] = '';
        foreach ($caseSchema->fields as $name => $field) {
            if (in_array($name, ['title', 'subtitle', 'color'], true) || empty($case[$name])) {
                continue;
            }
            $out[] = $field['type'] === 'text'
                ? "**{$field['label']}**\n\n" . $this->text((string) $case[$name]) . "\n"
                : "**{$field['label']}:** " . $this->value($field, $case[$name]) . '  ';
        }

        $blocks = [];
        $toc = [];
        foreach ($sections as $name) {
            $schema = Schema::get($name);
            $rows = $this->load($name);
            if (!$rows) {
                continue;
            }
            $toc[] = "- [{$schema->labelPlural}](#" . $this->anchor($schema->labelPlural) . ') (' . count($rows) . ')';
            $blocks[] = $this->section($schema, $rows);
        }
        if (!$blocks) {
            $out[] = '';
            $out[] = '*Il caso non contiene ancora dati nelle sezioni scelte.*';
            return implode("\n", $out) . "\n";
        }
        $out[] = '';
        $out[] = '## Indice';
        $out[] = '';
        array_push($out, ...$toc);
        $out[] = '';
        array_push($out, ...$blocks);
        return implode("\n", $out) . "\n";
    }

    private function section(Schema $schema, array $rows): string
    {
        $lines = ['## ' . $schema->labelPlural, ''];
        foreach ($rows as $row) {
            $lines[] = '### ' . $this->text($this->titleOf($schema, $row));
            $lines[] = '';
            array_push($lines, ...$this->fields($schema, $row, [$schema->titleField]));
            foreach ($schema->children as $child) {
                if (in_array($child['entity'], self::SECTIONS, true)) {
                    continue; // ha già la sua sezione
                }
                $childSchema = Schema::get($child['entity']);
                $children = array_values(array_filter($this->load($child['entity']), static fn ($r) => (int) ($r[$child['foreign_key']] ?? 0) === (int) $row['id']));
                if (!$children) {
                    continue;
                }
                if (end($lines) !== '') {
                    $lines[] = '';
                }
                $lines[] = "**{$child['label']}**";
                $lines[] = '';
                foreach ($children as $c) {
                    $details = $this->inline($childSchema, $c, [$child['foreign_key']]);
                    $lines[] = '- ' . ($details !== '' ? $details : $this->text($this->titleOf($childSchema, $c)));
                }
            }
            if (end($lines) !== '') {
                $lines[] = '';
            }
        }
        return implode("\n", $lines);
    }

    /** Campi di un record: brevi in elenco, testi lunghi come paragrafi. @return string[] */
    private function fields(Schema $schema, array $row, array $skip): array
    {
        $short = [];
        $long = [];
        foreach ($schema->fields as $name => $field) {
            $value = $row[$name] ?? null;
            if (in_array($name, $skip, true) || $value === null || $value === '' || $field['type'] === 'color') {
                continue;
            }
            if ($field['type'] === 'bool' && !$value) {
                continue;
            }
            if ($field['type'] === 'text') {
                $long[] = "**{$field['label']}.** " . str_replace("\n", "  \n", $this->text((string) $value));
                $long[] = '';
            } elseif ($field['type'] === 'image') {
                $long[] = '![' . $this->text($this->titleOf($schema, $row)) . '](' . $this->baseUrl . '/' . $value . ')';
                $long[] = '';
            } else {
                $short[] = "- **{$field['label']}:** " . $this->value($field, $value);
            }
        }
        return array_merge($short, $short ? [''] : [], $long);
    }

    /** Campi brevi di un record figlio su una riga. */
    private function inline(Schema $schema, array $row, array $skip): string
    {
        $parts = [];
        foreach ($schema->fields as $name => $field) {
            $value = $row[$name] ?? null;
            if (in_array($name, $skip, true) || $value === null || $value === '' || in_array($field['type'], ['color', 'image'], true)) {
                continue;
            }
            if ($field['type'] === 'bool' && !$value) {
                continue;
            }
            $text = $field['type'] === 'text' ? $this->text((string) $value) : $this->value($field, $value);
            $parts[] = "{$field['label']}: {$text}";
        }
        return implode('; ', $parts);
    }

    private function value(array $field, mixed $value): string
    {
        $affix = static fn (string $v) => ($field['prefix'] ?? '') . $v . ($field['suffix'] ?? '');
        return match ($field['type']) {
            'bool'     => 'sì',
            'enum'     => $this->text((string) ($field['options'][$value] ?? $value)),
            'ref'      => $this->text($this->title($field['entity'], (int) $value)),
            'date'     => date('d/m/Y', strtotime((string) $value) ?: 0),
            'datetime' => date('d/m/Y H:i', strtotime((string) $value) ?: 0),
            'float'    => ($field['format'] ?? null) === 'currency'
                ? '€ ' . number_format((float) $value, 2, ',', '.')
                : $affix(rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',')),
            'int'      => $affix((string) $value),
            'json'     => '`' . json_encode($value, JSON_UNESCAPED_UNICODE) . '`',
            default    => $affix($this->text((string) $value)),
        };
    }

    private function titleOf(Schema $schema, array $row): string
    {
        return (string) ($row[$schema->titleField] ?? $row['_title'] ?? ('#' . $row['id']));
    }

    private function title(string $entity, int $id): string
    {
        if (!isset($this->titles[$entity])) {
            $schema = Schema::get($entity);
            $this->titles[$entity] = [];
            foreach ($schema->scoped ? $this->load($entity) : Model::for($entity)->list(['limit' => 1000])['data'] as $row) {
                $this->titles[$entity][(int) $row['id']] = $this->titleOf($schema, $row);
            }
        }
        return $this->titles[$entity][$id] ?? "#{$id}";
    }

    /** @return array<int, array<string, mixed>> */
    private function load(string $entity): array
    {
        return $this->rows[$entity] ??= Model::for($entity, $this->caseId)->list(['limit' => 1000])['data'];
    }

    /** Testo dell'utente: niente HTML attivo nel dossier. */
    private function text(string $value): string
    {
        return str_replace(['<', '>'], ['&lt;', '&gt;'], $value);
    }

    private function anchor(string $label): string
    {
        $slug = mb_strtolower($label);
        $slug = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $slug) ?? '';
        return preg_replace('/\s+/', '-', trim($slug)) ?? '';
    }
}
