<?php
/** Entità: Bugia detta da un personaggio (mappa delle bugie e smentite). */
return [
    'table'          => 'lies',
    'label'          => 'Bugia',
    'label_plural'   => 'Bugie',
    'gender'         => 'f',
    'icon'           => 'fa-mask',
    'title_template' => '{liar_id}[ → {told_to_id}]',
    'scoped'         => true,
    'searchable'     => ['statement', 'truth', 'motive', 'note'],
    'list_columns'   => ['liar_id', 'told_to_id', 'statement', 'told_chapter', 'exposed_chapter', 'exposed_by_id'],
    'order_by'       => ['told_chapter' => 'ASC', 'id' => 'ASC'],

    'fields' => [
        'liar_id'         => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Chi mente', 'required' => true, 'width' => 'half'],
        'told_to_id'      => ['type' => 'ref', 'entity' => 'characters', 'label' => 'A chi', 'width' => 'half', 'help' => 'Vuoto = a tutti / agli inquirenti.'],
        'statement'       => ['type' => 'text', 'label' => 'Cosa dice', 'required' => true, 'rows' => 2],
        'truth'           => ['type' => 'text', 'label' => 'La verità', 'rows' => 2],
        'motive'          => ['type' => 'text', 'label' => 'Perché mente', 'rows' => 2],
        'fact_id'         => ['type' => 'ref', 'entity' => 'facts', 'label' => 'Informazione che nasconde', 'width' => 'half'],
        'event_id'        => ['type' => 'ref', 'entity' => 'events', 'label' => 'Evento collegato', 'width' => 'half'],
        'told_chapter'    => ['type' => 'int', 'label' => 'Detta al capitolo', 'min' => 0, 'width' => 'half'],
        'exposed_chapter' => ['type' => 'int', 'label' => 'Smascherata al capitolo', 'min' => 0, 'width' => 'half'],
        'exposed_by_id'   => ['type' => 'ref', 'entity' => 'characters', 'label' => 'Smascherata da', 'width' => 'half'],
        'note'            => ['type' => 'text', 'label' => 'Note', 'rows' => 2],
    ],
];
