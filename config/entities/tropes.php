<?php
/** Entità: Archetipo, tropo o regola del genere usati (o evitati) nel caso. */
return [
    'table'          => 'tropes',
    'label'          => 'Tropo',
    'label_plural'   => 'Archetipi e tropi',
    'icon'           => 'fa-masks-theater',
    'title_field'    => 'name',
    'subtitle_field' => 'kind',
    'scoped'         => true,
    'searchable'     => ['name', 'description', 'note'],
    'list_columns'   => ['name', 'kind', 'status', 'chapter'],
    'order_by'       => ['kind' => 'ASC', 'name' => 'ASC'],
    'children'       => [['entity' => 'trope_links', 'foreign_key' => 'trope_id', 'label' => 'Chi lo incarna / dove compare']],

    'fields' => [
        'name' => ['type' => 'string', 'label' => 'Nome', 'required' => true, 'max' => 150],
        'kind' => [
            'type' => 'enum', 'label' => 'Tipo', 'required' => true, 'default' => 'trope', 'width' => 'half',
            'options' => ['archetype' => 'Archetipo di personaggio', 'trope' => 'Tropo / espediente', 'rule' => 'Regola del genere'],
        ],
        'status' => [
            'type' => 'enum', 'label' => 'Uso', 'required' => true, 'default' => 'planned', 'width' => 'half',
            'options' => ['planned' => 'Previsto', 'used' => 'Usato', 'subverted' => 'Ribaltato', 'avoided' => 'Da evitare'],
        ],
        'chapter'     => ['type' => 'int', 'label' => 'Capitolo', 'min' => 0, 'width' => 'half'],
        'description' => ['type' => 'text', 'label' => 'Descrizione', 'rows' => 3],
        'note'        => ['type' => 'text', 'label' => 'Come lo uso', 'rows' => 3],
    ],
];
