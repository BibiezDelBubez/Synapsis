<?php
/** Entità: Sospettato per un delitto (riga della matrice Chi/Cosa/Dove/Quando/Perché). */
return [
    'table'          => 'suspects',
    'label'          => 'Sospettato',
    'label_plural'   => 'Sospettati',
    'icon'           => 'fa-user-ninja',
    'title_template' => '{character_id}[ → {crime_event_id}]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['motive', 'means', 'note'],
    'list_columns'   => ['crime_event_id', 'character_id', 'motive_strength', 'means_access', 'is_culprit'],
    'order_by'       => ['crime_event_id' => 'ASC', 'id' => 'ASC'],

    'fields' => [
        'crime_event_id' => ['type' => 'ref', 'entity' => 'events', 'label' => 'Delitto (evento)', 'required' => true, 'width' => 'half'],
        'character_id'   => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Chi', 'required' => true, 'width' => 'half'],
        'motive'         => ['type' => 'text', 'label' => 'Perché (movente)', 'rows' => 2],
        'motive_strength' => [
            'type' => 'enum', 'label' => 'Forza del movente', 'required' => true, 'default' => 'none', 'width' => 'half',
            'options' => ['none' => 'Nessuno', 'weak' => 'Debole', 'medium' => 'Medio', 'strong' => 'Forte'],
        ],
        'means_access' => [
            'type' => 'enum', 'label' => 'Accesso al mezzo', 'required' => true, 'default' => 'unknown', 'width' => 'half',
            'options' => ['unknown' => 'Da stabilire', 'none' => 'Nessuno', 'possible' => 'Possibile', 'easy' => 'Facile'],
        ],
        'means'      => ['type' => 'text', 'label' => 'Cosa (arma / mezzo)', 'rows' => 2],
        'is_culprit' => ['type' => 'bool', 'label' => 'È il colpevole (verità dell\'autore)', 'default' => false],
        'note'       => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
