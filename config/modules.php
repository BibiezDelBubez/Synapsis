<?php
/**
 * Registro unico dei moduli di Sinapsi.
 * È la sola fonte di verità per menu laterale, router della SPA e scorciatoie Alt+1…9.
 *
 * Campi:
 *   id       slug univoco
 *   label    nome nel menu
 *   icon     classe FontAwesome
 *   group    sezione del menu
 *   path     indirizzo nella SPA
 *   view     vista JavaScript da caricare (public/assets/js/views/{view}.js)
 *   entity   entità principale del modulo (config/entities/{entity}.php)
 *   quick_create  true: in Ctrl+K compare "Crea «testo» come …" per questa entità
 *   step     step in cui viene attivato
 *   enabled  true quando il modulo è pronto
 */
return [
    ['id' => 'dashboard',  'label' => 'Dashboard',              'icon' => 'fa-gauge-high',           'group' => 'Caso',           'path' => '/',            'view' => 'dashboard',    'step' => 1,  'enabled' => true],

    ['id' => 'personaggi', 'label' => 'Personaggi',             'icon' => 'fa-user-secret',          'group' => 'Archivio',       'path' => '/personaggi',  'view' => 'entity-table', 'entity' => 'characters', 'step' => 4, 'enabled' => true, 'quick_create' => true],
    ['id' => 'luoghi',     'label' => 'Luoghi',                 'icon' => 'fa-location-dot',         'group' => 'Archivio',       'path' => '/luoghi',      'view' => 'entity-table', 'entity' => 'places',     'step' => 4, 'enabled' => true, 'quick_create' => true],
    ['id' => 'asset',      'label' => 'Asset',                  'icon' => 'fa-gem',                  'group' => 'Archivio',       'path' => '/asset',       'view' => 'entity-table', 'entity' => 'assets',     'step' => 4, 'enabled' => true, 'quick_create' => true],

    ['id' => 'relazioni',  'label' => 'Grafo dei legami',       'icon' => 'fa-diagram-project',      'group' => 'Mappatura',      'path' => '/relazioni',   'view' => 'relations',    'entity' => 'relations',  'step' => 5,  'enabled' => true],
    ['id' => 'genealogia', 'label' => 'Alberi genealogici',     'icon' => 'fa-sitemap',              'group' => 'Mappatura',      'path' => '/genealogia',  'view' => 'genealogy',    'entity' => 'lineages',   'step' => 6,  'enabled' => true],
    ['id' => 'patrimonio', 'label' => 'Matrice proprietà',      'icon' => 'fa-vault',                'group' => 'Mappatura',      'path' => '/patrimonio',  'view' => 'ownership',    'entity' => 'ownerships', 'step' => 6,  'enabled' => true],

    ['id' => 'timeline',   'label' => 'Doppia timeline',        'icon' => 'fa-timeline',             'group' => 'Tempo e spazio', 'path' => '/timeline',    'view' => 'timeline',     'entity' => 'events',     'step' => 7,  'enabled' => true, 'quick_create' => true],
    ['id' => 'spazio',     'label' => 'Percorsi e planimetrie', 'icon' => 'fa-map-location-dot',     'group' => 'Tempo e spazio', 'path' => '/spazio',      'view' => 'space',        'entity' => 'routes',     'step' => 8,  'enabled' => true],

    ['id' => 'indizi',     'label' => 'Indizi e prove',         'icon' => 'fa-magnifying-glass',     'group' => 'Indagine',       'path' => '/indizi',      'view' => 'clues',        'entity' => 'clues',      'step' => 9,  'enabled' => true, 'quick_create' => true],
    ['id' => 'matrice',    'label' => 'Matrice e alibi',        'icon' => 'fa-table-cells',          'group' => 'Indagine',       'path' => '/matrice',     'view' => 'matrix',       'step' => 10, 'enabled' => false],
    ['id' => 'conoscenza', 'label' => 'POV e bugie',            'icon' => 'fa-eye',                  'group' => 'Indagine',       'path' => '/conoscenza',  'view' => 'knowledge',    'step' => 11, 'enabled' => false],

    ['id' => 'idee',       'label' => 'Idee orfane',            'icon' => 'fa-lightbulb',            'group' => 'Scrittura',      'path' => '/idee',        'view' => 'ideas',        'step' => 12, 'enabled' => false],
    ['id' => 'coerenza',   'label' => 'Consistency check',      'icon' => 'fa-triangle-exclamation', 'group' => 'Scrittura',      'path' => '/coerenza',    'view' => 'consistency',  'step' => 13, 'enabled' => false],
    ['id' => 'dossier',    'label' => 'Dossier del caso',       'icon' => 'fa-file-export',          'group' => 'Scrittura',      'path' => '/dossier',     'view' => 'dossier',      'step' => 14, 'enabled' => false],
];
