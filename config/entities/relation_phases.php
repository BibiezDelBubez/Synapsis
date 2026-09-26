<?php
/** Entità: Fase di un legame ("dal capitolo N il legame diventa …"). */
$sentiments = require __DIR__ . '/_sentiments.php';

return [
    'table'          => 'relation_phases',
    'label'          => 'Fase',
    'label_plural'   => 'Fasi',
    'icon'           => 'fa-clock-rotate-left',
    'title_field'    => 'moment',
    'scoped'         => true,
    'quick_search'   => false,      // non compare nella ricerca Ctrl+K
    'searchable'     => ['moment', 'note'],
    'list_columns'   => ['chapter', 'moment', 'sentiment', 'note'],
    'order_by'       => ['chapter' => 'ASC'],

    'fields' => [
        'relation_id' => ['type' => 'ref', 'entity' => 'relations', 'label' => 'Legame', 'required' => true],
        'chapter'     => ['type' => 'int', 'label' => 'Dal capitolo', 'required' => true, 'min' => 0, 'max' => 999, 'width' => 'half'],
        'sentiment'   => ['type' => 'enum', 'label' => 'Diventa', 'required' => true, 'default' => 'enemy', 'options' => $sentiments],
        'moment'      => ['type' => 'string', 'label' => 'Momento nella storia', 'max' => 120, 'help' => 'Es. "Dopo la lettura del testamento".'],
        'note'        => ['type' => 'text', 'label' => 'Cosa cambia', 'rows' => 2],
    ],
];
