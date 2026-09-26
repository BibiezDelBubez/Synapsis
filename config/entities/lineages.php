<?php
/**
 * Entità: Filiazione (genitore → figlio).
 * "Presunta" = ciò che tutti credono (ma non è vero); "Segreta" = la verità nascosta.
 * L'albero genealogico mostra entrambe in modalità "Verità" e solo la versione pubblica in modalità "Pubblica".
 */
return [
    'table'          => 'lineages',
    'label'          => 'Filiazione',
    'label_plural'   => 'Filiazioni',
    'gender'         => 'f',
    'icon'           => 'fa-sitemap',
    'title_template' => '{parent_id} → {child_id}',
    'subtitle_field' => 'note',
    'scoped'         => true,
    'quick_search'   => false,
    'searchable'     => ['note'],
    'list_columns'   => ['parent_id', 'child_id', 'kind', 'note'],
    'order_by'       => ['parent_id' => 'ASC'],
    'distinct'       => ['parent_id', 'child_id'],

    'fields' => [
        'parent_id' => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Genitore', 'required' => true],
        'child_id'  => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Figlio/a', 'required' => true],
        'kind' => [
            'type' => 'enum', 'label' => 'Tipo', 'required' => true, 'default' => 'biological',
            'options' => [
                'biological' => 'Biologica',
                'adoptive'   => 'Adottiva',
                'presumed'   => 'Presunta (creduta, non vera)',
                'secret'     => 'Segreta (vera, nascosta)',
            ],
        ],
        'note' => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
