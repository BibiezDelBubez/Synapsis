# Sinapsi — dashboard investigativa per autori di gialli

Web app locale (PHP 8.1+ · SQLite · Bootstrap 5.3 · JS ES modules), completamente offline.

## Struttura

```
Synapsis/
├── .htaccess              inoltra tutto a public/ (protegge il resto)
├── bootstrap.php          costanti, autoloader PSR-4 (App\ → app/), helper
├── app/
│   ├── Core/              App, Router, Request, Response, Controller, View,
│   │                      Database, Migrator, Config, Logger, HttpException, helpers
│   ├── Controllers/       HomeController (SPA) · Api/SystemController
│   └── Views/             layout, home, error, partials/ (sidebar, topbar)
├── config/                config.php · modules.php (registro moduli) · routes.php
├── database/
│   ├── migrations/sqlite/ 001_init.sql …
│   └── sinapsi.sqlite     creato automaticamente al primo avvio
├── storage/logs/          app.log
├── bin/migrate.php        migrazioni da riga di comando
└── public/                unica cartella esposta al browser
    ├── index.php          front controller
    ├── assets/            css, js (app.js + core/), img
    └── vendor/            Bootstrap, FontAwesome, vis-network, vis-timeline, Fuse, marked
```

## Avvio

- **Laragon**: la cartella del progetto va in `C:\laragon\www\Synapsis` (o nella *Document Root* impostata in Laragon). Dopo *Reload*, apri `http://synapsis.test` oppure `http://localhost/Synapsis/`.
- **XAMPP**: `htdocs\Synapsis` → `http://localhost/Synapsis/`.
- **Senza Apache**: `php -S localhost:8000 -t public public/index.php` → `http://localhost:8000`.

Requisiti PHP: estensioni `pdo_sqlite` e `mbstring`, modulo Apache `mod_rewrite`.

## Verifica

- `…/api/health` → JSON con `"status": "ok"` e migrazione `001_init.sql` applicata.
- `php bin/migrate.php status` → elenco delle migrazioni.

## Scorciatoie

| Tasti | Azione |
|---|---|
| Alt+T | Tema chiaro/scuro |
| Alt+M | Mostra/nascondi menu |

## Note

- Il database si trova in una cartella OneDrive: per questo `journal_mode` è `DELETE` (più sicuro con la sincronizzazione). Evita di aprire lo stesso file da due PC contemporaneamente.
- Per passare a MySQL: `config/config.php` → `db.driver = 'mysql'` e aggiungi le migrazioni in `database/migrations/mysql/`.
