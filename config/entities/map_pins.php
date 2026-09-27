<?php
/** Entità: Segnaposto su una planimetria (x, y = frazioni 0–1 dell'immagine). */
return [
    'table'          => 'map_pins',
    'label'          => 'Segnaposto',
    'label_plural'   => 'Segnaposto',
    'icon'           => 'fa-location-dot',
    'title_field'    => 'label',
    'subtitle_field' => 'kind',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['label', 'note'],
    'list_columns'   => ['map_id', 'label', 'kind', 'place_id', 'character_id'],
    'order_by'       => ['label' => 'ASC'],

    'fields' => [
        'map_id' => ['type' => 'ref', 'entity' => 'maps', 'label' => 'Planimetria', 'required' => true],
        'label'  => ['type' => 'string', 'label' => 'Etichetta', 'required' => true, 'max' => 120],
        'kind' => [
            'type' => 'enum', 'label' => 'Tipo', 'required' => true, 'default' => 'place', 'width' => 'half',
            'options' => [
                'place'  => 'Punto / stanza',
                'person' => 'Persona',
                'body'   => 'Corpo / vittima',
                'clue'   => 'Indizio',
                'door'   => 'Accesso (porta, finestra)',
                'other'  => 'Altro',
            ],
        ],
        'color'        => ['type' => 'color', 'label' => 'Colore', 'width' => 'half'],
        'place_id'     => ['type' => 'ref', 'entity' => 'places', 'label' => 'Luogo collegato', 'width' => 'half'],
        'character_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Personaggio collegato', 'width' => 'half'],
        'x'            => ['type' => 'float', 'label' => 'X', 'min' => 0, 'max' => 1, 'default' => 0.5, 'width' => 'half', 'help' => 'Si imposta trascinando il segnaposto.'],
        'y'            => ['type' => 'float', 'label' => 'Y', 'min' => 0, 'max' => 1, 'default' => 0.5, 'width' => 'half'],
        'note'         => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
