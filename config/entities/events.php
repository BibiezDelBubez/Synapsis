<?php
/**
 * Entità: Evento della storia, con doppia collocazione nel tempo.
 *   Verità:    real_start / real_end        (quando è accaduto davvero)
 *   Percepito: perceived_start / perceived_end (quando si crede sia accaduto; vuoto = come la verità)
 * Narrazione: capitolo in cui viene raccontato e modo (in ordine, flashback, deposizione…).
 */
return [
    'table'          => 'events',
    'label'          => 'Evento',
    'label_plural'   => 'Eventi',
    'icon'           => 'fa-calendar-day',
    'title_field'    => 'title',
    'subtitle_field' => 'description',
    'scoped'         => true,
    'searchable'     => ['title', 'description'],
    'list_columns'   => ['title', 'real_start', 'kind', 'place_id', 'chapter', 'narration'],
    'order_by'       => ['real_start' => 'ASC'],

    'children' => [
        ['entity' => 'event_participants', 'foreign_key' => 'event_id', 'label' => 'Chi è coinvolto'],
    ],

    'fields' => [
        'title' => ['type' => 'string', 'label' => 'Titolo', 'required' => true, 'max' => 150],
        'kind' => [
            'type' => 'enum', 'label' => 'Verità dell\'evento', 'required' => true, 'default' => 'fact',
            'options' => [
                'fact'   => 'Accaduto e noto',
                'hidden' => 'Accaduto ma nascosto',
                'false'  => 'Creduto ma falso (messinscena, alibi falso)',
            ],
        ],
        'place_id'        => ['type' => 'ref', 'entity' => 'places', 'label' => 'Dove'],
        'real_start'      => ['type' => 'datetime', 'label' => 'Inizio (verità)'],
        'real_end'        => ['type' => 'datetime', 'label' => 'Fine (verità)'],
        'perceived_start' => ['type' => 'datetime', 'label' => 'Inizio (come viene creduto)', 'help' => 'Vuoto = coincide con la verità.'],
        'perceived_end'   => ['type' => 'datetime', 'label' => 'Fine (come viene creduto)'],
        'chapter'         => ['type' => 'int', 'label' => 'Raccontato nel capitolo', 'min' => 0, 'max' => 999, 'prefix' => 'Cap. '],
        'narration' => [
            'type' => 'enum', 'label' => 'Come viene raccontato', 'default' => 'linear',
            'options' => [
                'linear'       => 'In ordine',
                'flashback'    => 'Flashback',
                'testimony'    => 'Deposizione / racconto',
                'flashforward' => 'Anticipazione',
                'untold'       => 'Non raccontato',
            ],
        ],
        'description' => ['type' => 'text', 'label' => 'Descrizione', 'rows' => 4],
    ],
];
