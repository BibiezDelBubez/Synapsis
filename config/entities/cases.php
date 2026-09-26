<?php
/**
 * Entità: Caso (un romanzo).
 * Formato valido per ogni file in config/entities/ — vedi App\Core\Schema.
 */
return [
    'table'        => 'cases',
    'label'        => 'Caso',
    'label_plural' => 'Casi',
    'icon'         => 'fa-folder-open',
    'title_field'  => 'title',
    'scoped'       => false,          // i Casi non appartengono a un altro caso
    'searchable'   => ['title', 'subtitle', 'synopsis'],
    'order_by'     => ['updated_at' => 'DESC'],

    'fields' => [
        'title' => [
            'type' => 'string', 'label' => 'Titolo', 'required' => true, 'max' => 200,
        ],
        'subtitle' => [
            'type' => 'string', 'label' => 'Sottotitolo', 'max' => 200,
        ],
        'status' => [
            'type' => 'enum', 'label' => 'Stato', 'default' => 'draft',
            'options' => [
                'draft'    => 'Bozza',
                'writing'  => 'In scrittura',
                'revision' => 'Revisione',
                'closed'   => 'Chiuso',
            ],
        ],
        'color' => [
            'type' => 'color', 'label' => 'Colore', 'default' => '#6ea8fe',
        ],
        'synopsis' => [
            'type' => 'text', 'label' => 'Sinossi', 'rows' => 5,
        ],
    ],
];
