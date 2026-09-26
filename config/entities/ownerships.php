<?php
/**
 * Entità: Proprietà (chi possiede un asset, in che quota e da/fino a quale capitolo).
 * Un capitolo vuoto significa "da sempre" (da) o "per sempre" (fino a).
 */
return [
    'table'          => 'ownerships',
    'label'          => 'Proprietà',
    'label_plural'   => 'Proprietà',
    'gender'         => 'f',
    'icon'           => 'fa-vault',
    'title_template' => '{owner_id} — {asset_id}',
    'subtitle_field' => 'note',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['moment', 'note'],
    'list_columns'   => ['owner_id', 'asset_id', 'share', 'acquisition', 'from_chapter', 'to_chapter', 'secret'],
    'order_by'       => ['asset_id' => 'ASC'],

    'fields' => [
        'owner_id'     => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Proprietario', 'required' => true],
        'asset_id'     => ['type' => 'ref', 'entity' => 'assets', 'label' => 'Bene', 'required' => true],
        'share'        => ['type' => 'float', 'label' => 'Quota', 'required' => true, 'default' => 100, 'min' => 0, 'max' => 100, 'suffix' => ' %'],
        'acquisition' => [
            'type' => 'enum', 'label' => 'Come l\'ha avuto',
            'options' => [
                'purchase'    => 'Acquisto',
                'inheritance' => 'Eredità',
                'gift'        => 'Dono',
                'dowry'       => 'Dote / matrimonio',
                'theft'       => 'Furto',
                'fraud'       => 'Frode',
                'other'       => 'Altro',
            ],
        ],
        'from_chapter' => ['type' => 'int', 'label' => 'Dal capitolo', 'min' => 0, 'max' => 999, 'prefix' => 'dal cap. '],
        'to_chapter'   => ['type' => 'int', 'label' => 'Fino al capitolo', 'min' => 0, 'max' => 999, 'prefix' => 'al cap. ', 'help' => 'Il capitolo in cui smette di possederlo.'],
        'secret'       => ['type' => 'bool', 'label' => 'Proprietà nascosta (prestanome, intestazione fittizia)', 'default' => false],
        'moment'       => ['type' => 'string', 'label' => 'Momento nella storia', 'max' => 120],
        'note'         => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
