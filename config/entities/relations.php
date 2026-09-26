<?php
/**
 * Entità: Legame tra due personaggi.
 * Lo stato iniziale (sentiment) può cambiare nel corso della storia con le fasi (relation_phases).
 */
$sentiments = require __DIR__ . '/_sentiments.php';

return [
    'table'          => 'relations',
    'label'          => 'Legame',
    'label_plural'   => 'Legami',
    'icon'           => 'fa-diagram-project',
    'title_field'    => 'label',
    'subtitle_field' => 'description',
    'scoped'         => true,
    'searchable'     => ['label', 'description'],
    'list_columns'   => ['label', 'source_id', 'target_id', 'type', 'sentiment', 'secret'],
    'order_by'       => ['label' => 'ASC'],
    'distinct'       => ['source_id', 'target_id'],

    // Sezione "Evoluzione nel tempo" nel pannello di dettaglio
    'children' => [
        ['entity' => 'relation_phases', 'foreign_key' => 'relation_id', 'label' => 'Evoluzione nel tempo'],
    ],

    'fields' => [
        'source_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Da', 'required' => true],
        'target_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'A', 'required' => true],
        'type' => [
            'type' => 'enum', 'label' => 'Tipo di legame', 'required' => true, 'default' => 'friendship',
            'options' => [
                'family'     => 'Parentela',
                'friendship' => 'Amicizia',
                'love'       => 'Amore',
                'affair'     => 'Relazione segreta',
                'business'   => 'Affari',
                'work'       => 'Lavoro / subordinazione',
                'debt'       => 'Debito',
                'blackmail'  => 'Ricatto',
                'rivalry'    => 'Rivalità',
                'hatred'     => 'Odio',
                'other'      => 'Altro',
            ],
        ],
        'label' => [
            'type' => 'string', 'label' => 'Etichetta', 'max' => 100,
            'help' => 'Es. "Fratelli", "Le deve 50.000 lire". Se vuota si usa il tipo di legame.',
        ],
        'sentiment' => [
            'type' => 'enum', 'label' => 'Stato iniziale', 'required' => true, 'default' => 'neutral',
            'options' => $sentiments,
        ],
        'intensity' => ['type' => 'int', 'label' => 'Intensità (1–5)', 'min' => 1, 'max' => 5, 'default' => 3],
        'directed'  => ['type' => 'bool', 'label' => 'Unidirezionale (da → a)', 'default' => false],
        'secret'    => ['type' => 'bool', 'label' => 'Legame segreto', 'default' => false],
        'description' => ['type' => 'text', 'label' => 'Note', 'rows' => 3],
    ],
];
