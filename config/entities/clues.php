<?php
/** Entità: Indizio o prova, con classificazione (reale / falsa pista / errore) e catena di custodia. */
return [
    'table'          => 'clues',
    'label'          => 'Indizio',
    'label_plural'   => 'Indizi',
    'icon'           => 'fa-magnifying-glass',
    'title_field'    => 'title',
    'subtitle_field' => 'classification',
    'scoped'         => true,
    'searchable'     => ['title', 'apparent_meaning', 'true_meaning', 'description'],
    'list_columns'   => ['title', 'kind', 'classification', 'status', 'points_to_id', 'found_chapter', 'revealed_chapter', 'importance'],
    'order_by'       => ['found_chapter' => 'ASC', 'title' => 'ASC'],
    'children'       => [['entity' => 'custody_steps', 'foreign_key' => 'clue_id', 'label' => 'Catena di custodia']],

    'fields' => [
        'title' => ['type' => 'string', 'label' => 'Indizio', 'required' => true, 'max' => 200],
        'classification' => [
            'type' => 'enum', 'label' => 'Classificazione', 'required' => true, 'default' => 'real', 'width' => 'half',
            'options' => [
                'real'        => 'Reale (porta alla verità)',
                'red_herring' => 'Falsa pista (depistaggio)',
                'misread'     => 'Errore d\'interpretazione',
            ],
        ],
        'kind' => [
            'type' => 'enum', 'label' => 'Tipo', 'required' => true, 'default' => 'physical', 'width' => 'half',
            'options' => [
                'physical'  => 'Oggetto / traccia fisica',
                'document'  => 'Documento',
                'testimony' => 'Testimonianza',
                'forensic'  => 'Reperto scientifico',
                'digital'   => 'Traccia digitale / telefonica',
                'behavior'  => 'Comportamento',
                'other'     => 'Altro',
            ],
        ],
        'status' => [
            'type' => 'enum', 'label' => 'Stato', 'required' => true, 'default' => 'hidden', 'width' => 'half',
            'options' => [
                'hidden'    => 'Non ancora trovato',
                'found'     => 'Trovato',
                'analyzed'  => 'Analizzato',
                'presented' => 'Reso noto',
                'lost'      => 'Perso / distrutto',
            ],
        ],
        'importance'       => ['type' => 'int', 'label' => 'Importanza', 'min' => 1, 'max' => 5, 'width' => 'half', 'help' => 'Da 1 (dettaglio) a 5 (decisivo).'],
        'apparent_meaning' => ['type' => 'text', 'label' => 'Cosa sembra indicare', 'rows' => 2],
        'true_meaning'     => ['type' => 'text', 'label' => 'Cosa significa davvero', 'rows' => 2, 'help' => 'La verità dell\'autore: non la vede il lettore.'],
        'points_to_id'     => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Sembra indicare', 'width' => 'half'],
        'planted_by_id'    => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Messo lì da', 'width' => 'half', 'help' => 'Per le false piste: chi l\'ha costruita.'],
        'place_id'         => ['type' => 'ref', 'entity' => 'places', 'label' => 'Dove si trova', 'width' => 'half'],
        'event_id'         => ['type' => 'ref', 'entity' => 'events', 'label' => 'Evento collegato', 'width' => 'half'],
        'found_chapter'    => ['type' => 'int', 'label' => 'Scoperto al capitolo', 'min' => 0, 'width' => 'half'],
        'revealed_chapter' => ['type' => 'int', 'label' => 'Significato svelato al capitolo', 'min' => 0, 'width' => 'half'],
        'description'      => ['type' => 'text', 'label' => 'Descrizione', 'rows' => 3],
    ],
];
