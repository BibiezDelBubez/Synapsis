<?php
/** Entità: Partecipazione di un personaggio a un evento (serve anche per eventi simultanei e alibi). */
return [
    'table'          => 'event_participants',
    'label'          => 'Partecipante',
    'label_plural'   => 'Partecipanti',
    'icon'           => 'fa-user-group',
    'title_template' => '{character_id}[ ({role})]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['note'],
    'list_columns'   => ['event_id', 'character_id', 'role', 'note'],
    'order_by'       => ['id' => 'ASC'],

    'fields' => [
        'event_id'     => ['type' => 'ref', 'entity' => 'events', 'label' => 'Evento', 'required' => true],
        'character_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Personaggio', 'required' => true],
        'role' => [
            'type' => 'enum', 'label' => 'Ruolo', 'required' => true, 'default' => 'present',
            'options' => [
                'present'     => 'Presente',
                'perpetrator' => 'Autore',
                'victim'      => 'Vittima',
                'witness'     => 'Testimone',
                'claimed'     => 'Dichiara di esserci (non verificato)',
            ],
        ],
        'note' => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
