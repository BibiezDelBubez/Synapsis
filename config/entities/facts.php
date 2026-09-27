<?php
/** Entità: Informazione (segreto, verità, diceria) che i personaggi e il lettore possono conoscere. */
return [
    'table'          => 'facts',
    'label'          => 'Informazione',
    'label_plural'   => 'Informazioni',
    'gender'         => 'f',
    'icon'           => 'fa-key',
    'title_field'    => 'title',
    'subtitle_field' => 'category',
    'scoped'         => true,
    'searchable'     => ['title', 'description'],
    'list_columns'   => ['title', 'category', 'is_true', 'subject_id', 'reader_chapter'],
    'order_by'       => ['reader_chapter' => 'ASC', 'title' => 'ASC'],
    'children'       => [['entity' => 'knowledge', 'foreign_key' => 'fact_id', 'label' => 'Chi lo sa']],

    'fields' => [
        'title' => ['type' => 'string', 'label' => 'Informazione', 'required' => true, 'max' => 250, 'help' => 'Es. "Livia è la figlia illegittima del conte".'],
        'category' => [
            'type' => 'enum', 'label' => 'Tipo', 'required' => true, 'default' => 'secret', 'width' => 'half',
            'options' => [
                'secret'       => 'Segreto',
                'identity'     => 'Identità',
                'relationship' => 'Relazione',
                'crime'        => 'Delitto',
                'motive'       => 'Movente',
                'past'         => 'Passato',
                'other'        => 'Altro',
            ],
        ],
        'is_true'        => ['type' => 'bool', 'label' => 'È vero (spento = diceria o convinzione falsa)', 'default' => true, 'width' => 'half'],
        'subject_id'     => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Riguarda', 'width' => 'half'],
        'reader_chapter' => ['type' => 'int', 'label' => 'Il lettore lo scopre al capitolo', 'min' => 0, 'width' => 'half'],
        'description'    => ['type' => 'text', 'label' => 'Dettagli', 'rows' => 3],
    ],
];
