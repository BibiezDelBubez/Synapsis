<?php
/**
 * Configurazione principale di Sinapsi.
 * Tutti i valori si leggono con config('chiave.sottochiave').
 */
return [
    'app' => [
        'name'     => 'Sinapsi',
        'version'  => '0.7.0',
        'debug'    => true,              // false = messaggi d'errore generici
        'timezone' => 'Europe/Rome',
        'locale'   => 'it',
    ],

    'db' => [
        // 'sqlite' (consigliato) oppure 'mysql'
        'driver'       => 'sqlite',
        // Applica automaticamente le migrazioni mancanti a ogni avvio
        'auto_migrate' => true,

        'sqlite' => [
            'path'         => DATABASE_PATH . '/sinapsi.sqlite',
            // DELETE è il più sicuro su cartelle sincronizzate (OneDrive, Dropbox).
            // Su un disco locale non sincronizzato puoi usare 'WAL' (più veloce).
            'journal_mode' => 'DELETE',
            'busy_timeout' => 5000,
        ],

        'mysql' => [
            'host'     => '127.0.0.1',
            'port'     => 3306,
            'database' => 'sinapsi',
            'username' => 'root',
            'password' => '',
            'charset'  => 'utf8mb4',
        ],
    ],

    'log' => [
        'file' => STORAGE_PATH . '/logs/app.log',
    ],
];
