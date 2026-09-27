<?php
/**
 * Entità: Idea orfana (spunto non ancora collocato nella storia).
 * Quando viene trasformata in un elemento del caso, converted_entity/converted_id puntano al nuovo record.
 */
$targets = [
    'characters' => 'Personaggio',
    'places'     => 'Luogo',
    'assets'     => 'Asset',
    'events'     => 'Evento',
    'clues'      => 'Indizio',
    'facts'      => 'Informazione / segreto',
    'lies'       => 'Bugia',
    'chapters'   => 'Capitolo',
];

return [
    'table'          => 'ideas',
    'label'          => 'Idea',
    'label_plural'   => 'Idee',
    'gender'         => 'f',
    'icon'           => 'fa-lightbulb',
    'title_field'    => 'title',
    'subtitle_field' => 'status',
    'scoped'         => true,
    'searchable'     => ['title', 'body', 'tags'],
    'list_columns'   => ['title', 'kind', 'priority', 'status', 'tags', 'chapter', 'converted_entity'],
    'order_by'       => ['created_at' => 'DESC'],

    'fields' => [
        'title' => ['type' => 'string', 'label' => 'Idea', 'required' => true, 'max' => 250],
        'body'  => ['type' => 'text', 'label' => 'Dettagli', 'rows' => 4],
        'kind' => [
            'type' => 'enum', 'label' => 'Potrebbe diventare', 'required' => true, 'default' => 'other', 'width' => 'half',
            'options' => $targets + ['twist' => 'Colpo di scena', 'scene' => 'Scena', 'other' => 'Non so ancora'],
        ],
        'priority' => [
            'type' => 'enum', 'label' => 'Priorità', 'required' => true, 'default' => 'normal', 'width' => 'half',
            'options' => ['low' => 'Bassa', 'normal' => 'Normale', 'high' => 'Alta'],
        ],
        'status' => [
            'type' => 'enum', 'label' => 'Stato', 'required' => true, 'default' => 'open', 'width' => 'half',
            'options' => ['open' => 'Da collocare', 'parked' => 'Parcheggiata', 'used' => 'Usata', 'discarded' => 'Scartata'],
        ],
        'chapter' => ['type' => 'int', 'label' => 'Capitolo previsto', 'min' => 0, 'width' => 'half'],
        'tags'    => ['type' => 'string', 'label' => 'Etichette', 'max' => 250, 'help' => 'Parole separate da spazi o virgole (es. movente, finale).'],
        'converted_entity' => ['type' => 'enum', 'label' => 'Diventata', 'options' => $targets, 'width' => 'half', 'help' => 'Si compila da solo con "Converti in…".'],
        'converted_id'     => ['type' => 'int', 'label' => 'Id dell\'elemento', 'min' => 1, 'width' => 'half'],
    ],
];
