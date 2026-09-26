<?php
/** Entità: Lascito (una voce di un testamento). */
return [
    'table'          => 'bequests',
    'label'          => 'Lascito',
    'label_plural'   => 'Lasciti',
    'icon'           => 'fa-hand-holding-heart',
    'title_template' => '{heir_id}[: {asset_id}][ ({share})]',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['share', 'note'],
    'list_columns'   => ['heir_id', 'asset_id', 'share', 'note'],
    'order_by'       => ['id' => 'ASC'],

    'fields' => [
        'will_id'  => ['type' => 'ref', 'entity' => 'wills', 'label' => 'Testamento', 'required' => true],
        'heir_id'  => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Erede', 'required' => true],
        'asset_id' => ['type' => 'ref', 'entity' => 'assets', 'label' => 'Bene'],
        'share'    => ['type' => 'string', 'label' => 'Quota', 'max' => 60, 'help' => 'Es. "50%", "la legittima", "tutto il resto".'],
        'note'     => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
