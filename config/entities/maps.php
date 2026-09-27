<?php
/** Entità: Planimetria o mappa (immagine caricata) su cui posizionare segnaposto. */
return [
    'table'          => 'maps',
    'label'          => 'Planimetria',
    'label_plural'   => 'Planimetrie',
    'gender'         => 'f',
    'icon'           => 'fa-map',
    'title_field'    => 'name',
    'subtitle_field' => 'place_id',
    'scoped'         => true,
    'searchable'     => ['name', 'description'],
    'list_columns'   => ['image', 'name', 'place_id', 'scale_note'],
    'order_by'       => ['name' => 'ASC'],
    'children'       => [['entity' => 'map_pins', 'foreign_key' => 'map_id', 'label' => 'Segnaposto']],

    'fields' => [
        'name'        => ['type' => 'string', 'label' => 'Nome', 'required' => true, 'max' => 150],
        'place_id'    => ['type' => 'ref', 'entity' => 'places', 'label' => 'Luogo', 'width' => 'half'],
        'scale_note'  => ['type' => 'string', 'label' => 'Scala', 'max' => 100, 'width' => 'half', 'help' => 'Es. "1 quadretto = 1 m".'],
        'image'       => ['type' => 'image', 'label' => 'Immagine', 'help' => 'PNG, JPEG, GIF o WebP: pianta, mappa, schizzo fotografato.'],
        'description' => ['type' => 'text', 'label' => 'Descrizione', 'rows' => 3],
    ],
];
