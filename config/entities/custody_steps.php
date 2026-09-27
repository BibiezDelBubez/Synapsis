<?php
/** Entità: Passaggio nella catena di custodia di un indizio. */
return [
    'table'          => 'custody_steps',
    'label'          => 'Passaggio',
    'label_plural'   => 'Passaggi di custodia',
    'icon'           => 'fa-link',
    'title_template' => '{action}[ · {holder_id}]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['note'],
    'list_columns'   => ['clue_id', 'action', 'holder_id', 'place_id', 'happened_at', 'chapter', 'secret'],
    'order_by'       => ['happened_at' => 'ASC', 'chapter' => 'ASC', 'id' => 'ASC'],

    'fields' => [
        'clue_id' => ['type' => 'ref', 'entity' => 'clues', 'label' => 'Indizio', 'required' => true],
        'action' => [
            'type' => 'enum', 'label' => 'Cosa succede', 'required' => true, 'default' => 'handed', 'width' => 'half',
            'options' => [
                'planted'   => 'Collocato ad arte',
                'found'     => 'Ritrovato',
                'collected' => 'Repertato / raccolto',
                'handed'    => 'Consegnato a',
                'analyzed'  => 'Analizzato',
                'stored'    => 'Custodito',
                'moved'     => 'Spostato',
                'tampered'  => 'Manomesso / alterato',
                'lost'      => 'Smarrito',
                'destroyed' => 'Distrutto',
                'returned'  => 'Restituito / ricomparso',
            ],
        ],
        'holder_id'   => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Chi lo ha', 'width' => 'half'],
        'place_id'    => ['type' => 'ref', 'entity' => 'places', 'label' => 'Dove', 'width' => 'half'],
        'happened_at' => ['type' => 'datetime', 'label' => 'Quando', 'width' => 'half'],
        'chapter'     => ['type' => 'int', 'label' => 'Capitolo', 'min' => 0, 'width' => 'half'],
        'secret'      => ['type' => 'bool', 'label' => 'Passaggio nascosto (il lettore non lo sa)', 'default' => false, 'width' => 'half'],
        'note'        => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
