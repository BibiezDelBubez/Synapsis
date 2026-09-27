<?php
/** Entità: Percorso tra due luoghi con tempo di percorrenza (per verificare spostamenti e alibi). */
return [
    'table'          => 'routes',
    'label'          => 'Percorso',
    'label_plural'   => 'Percorsi',
    'icon'           => 'fa-route',
    'title_template' => '{from_place_id} → {to_place_id}[ ({mode})]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['note'],
    'list_columns'   => ['from_place_id', 'to_place_id', 'mode', 'minutes', 'distance_km', 'two_way'],
    'order_by'       => ['from_place_id' => 'ASC', 'minutes' => 'ASC'],
    'distinct'       => ['from_place_id', 'to_place_id'],

    'fields' => [
        'from_place_id' => ['type' => 'ref', 'entity' => 'places', 'label' => 'Da', 'required' => true, 'width' => 'half'],
        'to_place_id'   => ['type' => 'ref', 'entity' => 'places', 'label' => 'A', 'required' => true, 'width' => 'half'],
        'mode' => [
            'type' => 'enum', 'label' => 'Mezzo', 'required' => true, 'default' => 'walk', 'width' => 'half',
            'options' => [
                'walk'   => 'A piedi',
                'car'    => 'Auto',
                'bike'   => 'Bicicletta',
                'public' => 'Mezzi pubblici',
                'boat'   => 'Barca',
                'other'  => 'Altro',
            ],
        ],
        'minutes'     => ['type' => 'int', 'label' => 'Tempo', 'required' => true, 'min' => 0, 'suffix' => 'min', 'width' => 'half'],
        'distance_km' => ['type' => 'float', 'label' => 'Distanza', 'min' => 0, 'suffix' => 'km', 'width' => 'half'],
        'two_way'     => ['type' => 'bool', 'label' => 'Vale anche al ritorno', 'default' => true, 'width' => 'half'],
        'note'        => ['type' => 'text', 'label' => 'Note', 'rows' => 2, 'help' => 'Es. "solo di giorno", "strada chiusa dopo le 22".'],
    ],
];
