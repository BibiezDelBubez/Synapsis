<?php
/** Entità: Conoscenza di un personaggio (chi sa cosa, da quale capitolo, come). */
return [
    'table'          => 'knowledge',
    'label'          => 'Conoscenza',
    'label_plural'   => 'Conoscenze',
    'gender'         => 'f',
    'icon'           => 'fa-eye',
    'title_template' => '{character_id}[ · {level}][ dal cap. {chapter}]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['note'],
    'list_columns'   => ['fact_id', 'character_id', 'level', 'chapter', 'how', 'source_id', 'hides'],
    'order_by'       => ['chapter' => 'ASC', 'id' => 'ASC'],

    'fields' => [
        'fact_id'      => ['type' => 'ref', 'entity' => 'facts', 'label' => 'Informazione', 'required' => true],
        'character_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Chi', 'required' => true, 'width' => 'half'],
        'level' => [
            'type' => 'enum', 'label' => 'Quanto sa', 'required' => true, 'default' => 'knows', 'width' => 'half',
            'options' => ['knows' => 'Lo sa', 'suspects' => 'Lo sospetta'],
        ],
        'chapter' => ['type' => 'int', 'label' => 'Dal capitolo', 'min' => 0, 'width' => 'half', 'help' => 'Vuoto = lo sa fin dall\'inizio.'],
        'how' => [
            'type' => 'enum', 'label' => 'Come lo sa', 'required' => true, 'default' => 'always', 'width' => 'half',
            'options' => [
                'always'    => 'Lo sa da sempre',
                'witnessed' => 'L\'ha visto',
                'told'      => 'Gliel\'hanno detto',
                'overheard' => 'Ha origliato',
                'document'  => 'Da un documento',
                'deduced'   => 'L\'ha dedotto',
            ],
        ],
        'source_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Da chi', 'width' => 'half'],
        'hides'     => ['type' => 'bool', 'label' => 'Lo tiene nascosto', 'default' => false, 'width' => 'half'],
        'note'      => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
