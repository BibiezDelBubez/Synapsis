<?php
/** Entità: Alibi dichiarato da un personaggio (registro alibi). */
return [
    'table'          => 'alibis',
    'label'          => 'Alibi',
    'label_plural'   => 'Alibi',
    'icon'           => 'fa-user-shield',
    'title_template' => '{character_id}[ · {status}]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['claim', 'truth', 'note'],
    'list_columns'   => ['character_id', 'claim', 'claimed_place_id', 'start_at', 'witness_id', 'status', 'broken_chapter'],
    'order_by'       => ['start_at' => 'ASC', 'id' => 'ASC'],

    'fields' => [
        'character_id'     => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Chi', 'required' => true, 'width' => 'half'],
        'event_id'         => ['type' => 'ref', 'entity' => 'events', 'label' => 'Per quale evento', 'width' => 'half', 'help' => 'Il delitto o il fatto che l\'alibi deve coprire.'],
        'claim'            => ['type' => 'text', 'label' => 'Cosa dichiara', 'required' => true, 'rows' => 2],
        'claimed_place_id' => ['type' => 'ref', 'entity' => 'places', 'label' => 'Dove dice di essere', 'width' => 'half'],
        'witness_id'       => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Chi lo conferma', 'width' => 'half'],
        'start_at'         => ['type' => 'datetime', 'label' => 'Dalle', 'width' => 'half'],
        'end_at'           => ['type' => 'datetime', 'label' => 'Alle', 'width' => 'half'],
        'status' => [
            'type' => 'enum', 'label' => 'Tenuta', 'required' => true, 'default' => 'unverified', 'width' => 'half',
            'options' => ['solid' => 'Solido', 'weak' => 'Debole', 'false' => 'Falso', 'unverified' => 'Non verificato'],
        ],
        'given_chapter'  => ['type' => 'int', 'label' => 'Dichiarato al capitolo', 'min' => 0, 'width' => 'half'],
        'broken_chapter' => ['type' => 'int', 'label' => 'Crolla al capitolo', 'min' => 0, 'width' => 'half', 'help' => 'Quando viene smentito nella storia.'],
        'truth'          => ['type' => 'text', 'label' => 'Cosa è successo davvero', 'rows' => 2],
        'note'           => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
