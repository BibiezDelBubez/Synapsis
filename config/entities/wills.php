<?php
/** Entità: Testamento. I singoli lasciti sono nella sezione "Lasciti" del pannello. */
return [
    'table'          => 'wills',
    'label'          => 'Testamento',
    'label_plural'   => 'Testamenti',
    'icon'           => 'fa-scroll',
    'title_template' => 'Testamento di {testator_id}[ ({moment})]',
    'subtitle_field' => 'description',
    'scoped'         => true,
    'searchable'     => ['moment', 'description'],
    'list_columns'   => ['testator_id', 'moment', 'status', 'location_id'],
    'order_by'       => ['testator_id' => 'ASC'],

    'children' => [
        ['entity' => 'bequests', 'foreign_key' => 'will_id', 'label' => 'Lasciti'],
    ],

    'fields' => [
        'testator_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Testatore', 'required' => true],
        'moment'      => ['type' => 'string', 'label' => 'Data / momento', 'max' => 120],
        'status' => [
            'type' => 'enum', 'label' => 'Stato', 'required' => true, 'default' => 'valid',
            'options' => [
                'valid'     => 'Valido',
                'revoked'   => 'Revocato',
                'forged'    => 'Falso',
                'contested' => 'Impugnato',
                'secret'    => 'Segreto',
                'lost'      => 'Scomparso',
            ],
        ],
        'location_id' => ['type' => 'ref', 'entity' => 'places', 'label' => 'Dove è custodito'],
        'description' => ['type' => 'text', 'label' => 'Contenuto e circostanze', 'rows' => 4],
    ],
];
