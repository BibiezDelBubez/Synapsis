<?php
/** Entità: Luogo. Un luogo può stare dentro un altro (es. Biblioteca → Villa Aurora). */
return [
    'table'          => 'places',
    'label'          => 'Luogo',
    'label_plural'   => 'Luoghi',
    'icon'           => 'fa-location-dot',
    'title_field'    => 'name',
    'subtitle_field' => 'address',
    'scoped'         => true,
    'searchable'     => ['name', 'address', 'description'],
    'list_columns'   => ['name', 'type', 'parent_id', 'address'],
    'order_by'       => ['name' => 'ASC'],

    'fields' => [
        'name' => ['type' => 'string', 'label' => 'Nome', 'required' => true, 'max' => 150],
        'type' => [
            'type' => 'enum', 'label' => 'Tipo',
            'options' => [
                'building' => 'Edificio',
                'room'     => 'Stanza / ambiente',
                'home'     => 'Abitazione',
                'public'   => 'Locale pubblico',
                'office'   => 'Ufficio',
                'outdoor'  => 'Esterno',
                'vehicle'  => 'Veicolo',
                'city'     => 'Città / zona',
                'other'    => 'Altro',
            ],
        ],
        'parent_id'   => ['type' => 'ref', 'entity' => 'places', 'label' => 'Si trova in'],
        'address'     => ['type' => 'string', 'label' => 'Indirizzo', 'max' => 255],
        'description' => ['type' => 'text', 'label' => 'Descrizione', 'rows' => 4],
    ],
];
