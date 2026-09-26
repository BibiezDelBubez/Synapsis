# Sinapsi — stato dello sviluppo

Ultimo aggiornamento: 26/09/2026 · versione **0.5.0** · completati gli **step 1–5** su 14.

## Regole di lavoro concordate con l'utente

- Si procede **uno step alla volta**. A fine step: elenco dei file toccati + istruzioni di test, poi **si aspetta l'ok** ("vai").
- **Niente zip/tgz né file mandati in chat.** I file si scrivono **direttamente** nella cartella del progetto sul PC:
  `C:\Users\miche\OneDrive\Documenti\xampp\htdocs\Synapsis` (XAMPP, Apache attivo, URL `http://localhost/Synapsis/`).
  Metodo: sviluppo e test nel container → sul PC con la shell del dispositivo: file nuovi con heredoc (`cat > file <<'SINAPSI_EOF'`),
  file modificati con `patch -p1 -l` (diff) → verifica con `md5sum` contro il container.
- Non fare cose non richieste. Risposte in italiano, concise.

## Stack e architettura

- PHP 8 senza framework, MVC, SQLite (PDO; MySQL previsto via config), front controller `public/index.php`.
  `.htaccess` in radice inoltra tutto a `public/`. Base path calcolato da solo (funziona in sottocartella).
- Frontend: SPA in JavaScript nativo (moduli ES, nessuna build). Bootstrap 5.3.8, FontAwesome 6.7.2,
  vis-network 10.1.2, vis-timeline 8.5.4, Fuse.js 7.5.0 (`vendor/fuse/fuse.esm.min.js`), marked 18 — tutto in `public/vendor/`.
- Migrazioni automatiche all'avvio: `database/migrations/sqlite/NNN_nome.sql` (applicate: 001_init, 002_archive, 003_relations).

### Principio DRY: entità dichiarative

Ogni entità è un file `config/entities/{nome}.php` (file che iniziano con `_` = frammenti condivisi, es. `_sentiments.php`). Chiavi:
`table, label, label_plural, icon, title_field, subtitle_field, scoped (appartiene al caso → case_id), searchable, list_columns,
order_by, quick_search (default true), children ([[entity, foreign_key, label]] → sotto-elenchi nel pannello), fields`.
Tipi di campo: `string, text, int, float, bool, enum, date, datetime, color, ref (entity), json`; opzioni `required, default, min, max, options, rows, help, width (half|full), format (currency)`.

**Aggiungere un'entità** = file in `config/entities/` + tabella in una nuova migrazione (+ eventuale `App\Models\{Studly}Model` con hook
`beforeSave/afterSave/afterDelete`, caricato in automatico da `Model::for()`) + voce in `config/modules.php`.

### Backend (app/)

- `Core/`: App (kernel, errori JSON/HTML), Router (`{id}` numerico), Request/Response, Controller, View, Database, Migrator,
  Config, Logger, HttpException, **Schema** (validazione/cast), **Model** (CRUD generico, ricerca, filtri, ordinamento, scope sul caso, controllo ref, `summaries()`), Settings (caso attivo).
- `Models/`: CasesModel (chiude la sessione se elimini il caso aperto), PlacesModel (niente luoghi circolari), RelationsModel (niente legame con sé stessi, etichetta di default).
- `Controllers/Api/`: ResourceController (REST generico `/api/{entity}[/{id}]`, `?q=&campo=&sort=&dir=&limit=&offset=&case_id=`),
  SessionController (`GET /api/session`, `PUT /api/session/case`), SearchController (`GET /api/search` indice per Ctrl+K),
  SystemController (`/api/health`, `/api/modules`, `/api/schema`).
- `config/modules.php`: registro unico dei moduli (menu, router SPA, Alt+1…9). Campi: id, label, icon, group, path, view, entity, step, enabled.

### Frontend (public/assets/js/)

- `core/`: api, dom (h(), emit/on con signal, confirmButton), resource (CRUD + getSchema/getSchemas), form (renderForm con `exclude`, readForm, attachSubmit, showErrors),
  format (formatValue, mappe ref), panel (pannello laterale: lettura/modifica, sezioni figlie), children (sotto-elenchi generici), modal, entity-manager (gestore in modale, usato per i Casi),
  router (SPA dal registro moduli), palette (Ctrl+K: ricerca fuzzy, comandi, "Crea «x» come …"), help (tasto ?), hotkeys (registro a **pila**: una vista può prendere in prestito un tasto e restituirlo), session (caso aperto), toast, ui (tema/menu, evento theme:changed), prefs (localStorage), assets (loadScript/loadStyle su richiesta).
- `views/`: dashboard, entity-table (tabella generica per qualsiasi entità), relations (grafo vis-network + vista elenco).
- `modules/cases.js`: finestra Casi (Alt+C).
- Eventi globali: `case:changed`, `data:changed {entity, action, record}`, `panel:changed`, `route:changed`, `theme:changed`, `app:error`.
- Ogni vista esporta `mount(container, { module })` e restituisce una funzione di pulizia.

## Moduli completati

1. Fondamenta MVC, DB, layout scuro/chiaro, librerie offline.
2. Entità dichiarative + API generica + Casi (caso attivo).
3. + 4. SPA, pannello di dettaglio, tabella generica, aiuto scorciatoie; Personaggi (ruolo, stato, segreto…), Luoghi (annidati), Asset (tipo, valore, dove si trova); Ctrl+K.
5. Grafo dei legami: 11 tipi, stato (alleati→nemici) con fasi per capitolo (`relation_phases`), cursore capitolo, filtri, segreti tratteggiati, collegamento trascinando (L), posizioni salvate per caso.

Scorciatoie: Ctrl+K, Alt+C, Alt+1…5, Alt+N, E, Esc, /, ?, Alt+T, Alt+M; nel grafo L, F, `,` e `.`.

## Prossimi step

- **6** Alberi genealogici (entità parentela padre/madre/figlio/coniuge, vista gerarchica vis-network, eredità/testamenti) + Matrice proprietà (`ownerships`: personaggio ↔ asset, quota %, da/a capitolo o data, modo di acquisizione).
- **7** Doppia timeline (vis-timeline): eventi reali vs percepiti, eventi simultanei, tempo dell'azione vs della narrazione (capitoli/flashback).
- **8** Tempi di percorrenza (matrice luoghi) + planimetrie con pin (immagine caricata + coordinate).
- **9** Indizi: catena di custodia (usare `children`), classificazione reale / red herring / errore.
- **10** Matrice Chi/Cosa/Dove/Quando/Perché + registro alibi (Solido, Debole, Falso, Non verificato).
- **11** Chi sa cosa in quale capitolo + mappa delle bugie e smentite. (Serve un'entità **capitoli**: valutare di introdurla qui e collegarla anche alle fasi dei legami.)
- **12** Idee orfane con conversione in nodo / asset / evento.
- **13** Archetipi, tropi, dashboard incongruenze automatica.
- **14** Esportazione dossier Markdown/PDF + backup.
- Extra proposti (dopo il 14, a scelta dell'utente): matrice ipotesi concorrenti (ACH), distribuzione indizi per capitolo, indicatore di sospetto, controllo depistaggi/"fucili di Čechov", calcolatore ora del decesso, alba/tramonto/luna offline, scenari "e se…", import capitoli da .docx, lavagna investigativa, istantanee del caso.

## Note

- Il database è in una cartella OneDrive: `journal_mode = DELETE` in `config/config.php`.
- `public/.htaccess` imposta `Cache-Control: no-cache` per JS/CSS (serve mod_headers).
