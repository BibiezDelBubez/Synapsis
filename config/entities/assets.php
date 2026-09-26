<?php
/** Entità: Asset (beni e oggetti). La proprietà nel tempo arriverà con la Matrice proprietà. */
return [
    'table'          => 'assets',
    'label'          => 'Asset',
    'label_plural'   => 'Asset',
    'icon'           => 'fa-gem',
    'title_field'    => 'name',
    'subtitle_field' => 'description',
    'scoped'         => true,
    'searchable'     => ['name', 'description'],
    'list_columns'   => ['name', 'type', 'value', 'location_id'],
    'order_by'       => ['name' => 'ASC'],

    'fields' => [
        'name' => ['type' => 'string', 'label' => 'Nome', 'required' => true, 'max' => 150],
        'type' => [
            'type' => 'enum', 'label' => 'Tipo',
            'options' => [
                'real_estate' => 'Immobile',
                'vehicle'     => 'Veicolo',
                'weapon'      => 'Arma',
                'shares'      => 'Quote societarie',
                'art'         => 'Opera d\'arte',
                'safe_box'    => 'Cassetta di sicurezza',
                'money'       => 'Denaro',
                'document'    => 'Documento',
                'jewel'       => 'Gioiello',
                'other'       => 'Altro',
            ],
        ],
        'value'       => ['type' => 'float', 'label' => 'Valore (€)', 'min' => 0, 'format' => 'currency'],
        'location_id' => ['type' => 'ref', 'entity' => 'places', 'label' => 'Dove si trova'],
        'description' => ['type' => 'text', 'label' => 'Descrizione', 'rows' => 4],
    ],
];
