<?php
/** Entità: Capitolo del romanzo (punto di vista, tempo della storia, stato di scrittura). */
return [
    'table'          => 'chapters',
    'label'          => 'Capitolo',
    'label_plural'   => 'Capitoli',
    'icon'           => 'fa-book-open',
    'title_template' => 'Cap. {number}[ · {title}]',
    'subtitle_field' => 'pov_character_id',
    'scoped'         => true,
    'searchable'     => ['title', 'summary'],
    'list_columns'   => ['number', 'title', 'pov_character_id', 'story_time', 'status'],
    'order_by'       => ['number' => 'ASC'],

    'fields' => [
        'number'           => ['type' => 'int', 'label' => 'Numero', 'required' => true, 'min' => 0, 'width' => 'half'],
        'status' => [
            'type' => 'enum', 'label' => 'Stato', 'required' => true, 'default' => 'idea', 'width' => 'half',
            'options' => ['idea' => 'Idea', 'draft' => 'Bozza', 'revised' => 'Rivisto', 'final' => 'Definitivo'],
        ],
        'title'            => ['type' => 'string', 'label' => 'Titolo', 'max' => 200],
        'pov_character_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Punto di vista', 'width' => 'half'],
        'story_time'       => ['type' => 'datetime', 'label' => 'Quando si svolge', 'width' => 'half'],
        'summary'          => ['type' => 'text', 'label' => 'Sintesi', 'rows' => 4],
    ],
];
