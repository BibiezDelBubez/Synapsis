<?php
/** Entità: Unione tra due personaggi (matrimonio, convivenza, relazione clandestina…). */
return [
    'table'          => 'unions',
    'label'          => 'Unione',
    'label_plural'   => 'Unioni',
    'gender'         => 'f',
    'icon'           => 'fa-ring',
    'title_template' => '{partner_a} & {partner_b}[ ({moment})]',
    'subtitle_field' => 'note',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['moment', 'note'],
    'list_columns'   => ['partner_a', 'partner_b', 'kind', 'status', 'moment', 'secret'],
    'order_by'       => ['partner_a' => 'ASC'],
    'distinct'       => ['partner_a', 'partner_b'],

    'fields' => [
        'partner_a' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Partner 1', 'required' => true],
        'partner_b' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Partner 2', 'required' => true],
        'kind' => [
            'type' => 'enum', 'label' => 'Tipo', 'required' => true, 'default' => 'marriage',
            'options' => [
                'marriage'     => 'Matrimonio',
                'cohabitation' => 'Convivenza',
                'engagement'   => 'Fidanzamento',
                'affair'       => 'Relazione clandestina',
            ],
        ],
        'status' => [
            'type' => 'enum', 'label' => 'Stato', 'required' => true, 'default' => 'ongoing',
            'options' => [
                'ongoing'   => 'In corso',
                'separated' => 'Separati',
                'divorced'  => 'Divorziati',
                'widowed'   => 'Vedovanza',
                'annulled'  => 'Annullata',
            ],
        ],
        'moment' => ['type' => 'string', 'label' => 'Quando', 'max' => 120, 'help' => 'Es. "Dal 1962", "Prima della guerra".'],
        'secret' => ['type' => 'bool', 'label' => 'Unione segreta', 'default' => false],
        'note'   => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
