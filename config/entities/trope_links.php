<?php
/** Entità: Collegamento tra un archetipo/tropo e un personaggio o un capitolo. */
return [
    'table'          => 'trope_links',
    'label'          => 'Collegamento',
    'label_plural'   => 'Collegamenti',
    'icon'           => 'fa-link',
    'title_template' => '{trope_id}[ · {character_id}][ · cap. {chapter}]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['note'],
    'list_columns'   => ['trope_id', 'character_id', 'chapter', 'note'],
    'order_by'       => ['id' => 'ASC'],

    'fields' => [
        'trope_id'     => ['type' => 'ref', 'entity' => 'tropes', 'label' => 'Archetipo / tropo', 'required' => true],
        'character_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Personaggio', 'width' => 'half'],
        'chapter'      => ['type' => 'int', 'label' => 'Capitolo', 'min' => 0, 'width' => 'half'],
        'note'         => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
