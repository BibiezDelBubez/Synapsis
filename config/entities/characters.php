<?php
/** Entità: Personaggio. */
return [
    'table'          => 'characters',
    'label'          => 'Personaggio',
    'label_plural'   => 'Personaggi',
    'icon'           => 'fa-user-secret',
    'title_field'    => 'name',
    'subtitle_field' => 'occupation',
    'scoped'         => true,
    'searchable'     => ['name', 'alias', 'occupation', 'description'],
    'list_columns'   => ['name', 'alias', 'role', 'status', 'family', 'age', 'occupation'],
    'order_by'       => ['name' => 'ASC'],

    'children' => [
        ['entity' => 'ownerships', 'foreign_key' => 'owner_id', 'label' => 'Beni posseduti'],
    ],

    'fields' => [
        'name'       => ['type' => 'string', 'label' => 'Nome', 'required' => true, 'max' => 150],
        'alias'      => ['type' => 'string', 'label' => 'Alias / soprannome', 'max' => 150, 'width' => 'half'],
        'occupation' => ['type' => 'string', 'label' => 'Professione', 'max' => 150, 'width' => 'half'],
        'role' => [
            'type' => 'enum', 'label' => 'Ruolo nella trama',
            'options' => [
                'victim'       => 'Vittima',
                'suspect'      => 'Sospettato',
                'investigator' => 'Investigatore',
                'witness'      => 'Testimone',
                'accomplice'   => 'Complice',
                'culprit'      => 'Colpevole',
                'secondary'    => 'Secondario',
            ],
        ],
        'status' => [
            'type' => 'enum', 'label' => 'Stato', 'default' => 'alive',
            'options' => [
                'alive'   => 'Vivo',
                'dead'    => 'Morto',
                'missing' => 'Scomparso',
                'unknown' => 'Sconosciuto',
            ],
        ],
        'age'         => ['type' => 'int', 'label' => 'Età', 'min' => 0, 'max' => 130],
        'family'      => ['type' => 'string', 'label' => 'Casato / famiglia', 'max' => 100, 'width' => 'half', 'help' => 'Serve a filtrare l\'albero genealogico.'],
        'born'        => ['type' => 'string', 'label' => 'Nascita', 'max' => 60, 'width' => 'half', 'help' => 'Anno o data, anche approssimativa.'],
        'died'        => ['type' => 'string', 'label' => 'Morte', 'max' => 60, 'width' => 'half'],
        'color'       => ['type' => 'color', 'label' => 'Colore', 'default' => '#adb5bd'],
        'description' => ['type' => 'text', 'label' => 'Descrizione', 'rows' => 4],
        'secret'      => ['type' => 'text', 'label' => 'Segreto', 'rows' => 3, 'help' => 'Ciò che il personaggio nasconde (non noto al lettore all\'inizio).'],
    ],
];
