# Sinapsi — stato dello sviluppo

Ultimo aggiornamento: 27/09/2026 · versione **1.0.0** · completati **tutti i 14 step** della roadmap.

## Regole di lavoro concordate con l'utente

- Si procede **uno step alla volta**. A fine step: elenco dei file toccati + istruzioni di test, poi **si aspetta l'ok** ("vai").
- **Niente zip/tgz né file mandati in chat.** I file si scrivono **direttamente** nella cartella del progetto sul PC:
  `C:\Users\miche\OneDrive\Documenti\xampp\htdocs\Synapsis` (XAMPP, Apache attivo, URL `http://localhost/Synapsis/`).
  Metodo: sviluppo e test nel container → i file toccati si copiano in `/mnt/user-data/outputs/sN/<percorso>` e si scrivono sul PC
  con `device_commit_files` (percorso Windows completo) → verifica con `md5sum` dell'intero albero (`git ls-files -z | xargs -0 md5sum | md5sum`) su entrambi i lati.
  (Alternativa: shell del PC con heredoc, ma ogni comando deve stare sotto ~10 KB, errore E2BIG.)
- La cartella del PC è un repository git collegato a `https://github.com/BibiezDelBubez/Synapsis` (privato).
  A fine step preparo il commit sul PC; l'utente fa `git push` (Claude non ha accesso diretto al repository).
- Non fare cose non richieste. Risposte in italiano, concise.

## Stack e architettura

- PHP 8 senza framework, MVC, SQLite (PDO; MySQL previsto via config), front controller `public/index.php`.
  `.htaccess` in radice inoltra tutto a `public/`. Base path calcolato da solo (funziona in sottocartella).
- Frontend: SPA in JavaScript nativo (moduli ES, nessuna build). Bootstrap 5.3.8, FontAwesome 6.7.2,
  vis-network 10.1.2, vis-timeline 8.5.4, Fuse.js 7.5.0 (`vendor/fuse/fuse.esm.min.js`), marked 18 — tutto in `public/vendor/`.
- Migrazioni automatiche all'avvio: `database/migrations/sqlite/NNN_nome.sql` (001_init, 002_archive, 003_relations, 004_genealogy_ownership, 005_events, 006_space, 007_clues, 008_matrix, 009_knowledge, 010_ideas, 011_tropes).

### Principio DRY: entità dichiarative

Ogni entità è un file `config/entities/{nome}.php` (file che iniziano con `_` = frammenti condivisi, es. `_sentiments.php`). Chiavi:
`table, label, label_plural, icon, title_field, subtitle_field, scoped (appartiene al caso → case_id), searchable, list_columns,
order_by, quick_search (default true), children ([[entity, foreign_key, label]] → sotto-elenchi nel pannello),
title_template (titolo calcolato nel campo virtuale `_title`, es. `'{parent_id} → {child_id}[ ({moment})]'`: ref → nomi, enum → etichette, `[ ]` opzionale),
distinct ([campoA, campoB] devono essere diversi), gender ('f' → "Nuova …"), fields`.
Tipi di campo: `string, text, int, float, bool, enum, date, datetime, color, ref (entity), json, image` (percorso `uploads/case-N/….png` caricato con `POST /api/uploads`); opzioni `required, default, min, max, options, rows, help, width (half|full), format (currency), prefix, suffix`.

**Aggiungere un'entità** = file in `config/entities/` + tabella in una nuova migrazione (+ eventuale `App\Models\{Studly}Model` con hook
`beforeSave/afterSave/afterDelete`, caricato in automatico da `Model::for()`) + voce in `config/modules.php`.

### Backend (app/)

- `Core/`: App (kernel, errori JSON/HTML), Router (`{id}` numerico), Request/Response, Controller, View, Database, Migrator,
  Config, Logger, HttpException, **CaseArchive** (backup/ripristino JSON di un caso guidato dagli schemi, pulizia immagini), **Dossier** (Markdown dagli schemi), **Upload** (immagini verificate in `public/uploads/case-{id}/`, ignorate da git; `.htaccess` blocca gli script), **Schema** (validazione/cast), **Model** (CRUD generico, ricerca, filtri, ordinamento, scope sul caso, controllo ref, `summaries()`), Settings (caso attivo).
- `Models/`: CasesModel (chiude la sessione se elimini il caso aperto), PlacesModel (niente luoghi circolari), RelationsModel (etichetta di default), LineagesModel (niente cicli nell'albero), EventsModel (date obbligatorie secondo il tipo, fine ≥ inizio), RoutesModel (niente percorsi doppi), CluesModel (svelato ≥ scoperto), SuspectsModel (un sospettato per delitto), AlibisModel (fine ≥ inizio, crolla dopo la dichiarazione), ChaptersModel (numero unico), KnowledgeModel (una voce per personaggio e informazione), LiesModel (smascherata dopo essere detta, non a sé stessi), MapsModel (cancella l'immagine sostituita/eliminata); CasesModel cancella anche le immagini del caso.
  `Model::for()` restituisce sempre la classe dell'entità richiesta (`self`, non `static`).
- `Controllers/Api/`: ResourceController (REST generico `/api/{entity}[/{id}]`, `?q=&campo=&sort=&dir=&limit=&offset=&case_id=`),
  SessionController (`GET /api/session`, `PUT /api/session/case`), SearchController (`GET /api/search` indice per Ctrl+K),
  SystemController (`/api/health`, `/api/modules`, `/api/schema`), UploadController (`POST /api/uploads`, multipart campo `file` → `{path, width, height}`),
  ArchiveController (`GET /api/dossier?sections=`, `GET|POST /api/backup/case`, `GET /api/backup/database`, `POST /api/uploads/cleanup`).
- `config/modules.php`: registro unico dei moduli (menu, router SPA, Alt+1…9). Campi: id, label, icon, group, path, view, entity, step, enabled, quick_create (Ctrl+K "Crea come …").

### Frontend (public/assets/js/)

- `core/`: api, dom (h(), emit/on con signal, confirmButton), resource (CRUD + getSchema/getSchemas), form (renderForm con `exclude`, readForm, attachSubmit, showErrors),
  format (formatValue, mappe ref), panel (pannello laterale: lettura/modifica, sezioni figlie), children (sotto-elenchi generici), modal, entity-manager (gestore in modale, usato per i Casi),
  router (SPA dal registro moduli), tabs (schede interne di una vista, persistenti o montate a richiesta), graph (loadVis, loadTimeline — catturano `window.vis` separatamente —, graphTheme, linkMode "trascina per collegare"), chapter-slider (cursore "Stato al capitolo"), palette (Ctrl+K: ricerca fuzzy, comandi, "Crea «x» come …"), help (tasto ?), hotkeys (registro a **pila**: una vista può prendere in prestito un tasto e restituirlo), session (caso aperto), toast, ui (tema/menu, evento theme:changed), prefs (localStorage: get/set testo, **getJSON/setJSON** per numeri, booleani e liste), assets (loadScript/loadStyle su richiesta).
- `views/`: dashboard, entity-table (tabella generica; `embedded: true` per usarla dentro una scheda), relations (grafo legami), genealogy (albero gerarchico), ownership (matrice proprietà), timeline (doppia timeline + narrazione), space (+ space-maps: visualizzatore planimetrie; space-routes: calcoli percorrenze e spostamenti), clues (bacheca, catena di custodia), matrix (matrice 5W, registro alibi; usa travelNetwork di space-routes), knowledge (chi sa cosa, mappa delle bugie, scaletta dei capitoli), ideas (cestino delle idee con conversione), tropes (+ tropes-catalog), consistency (+ consistency-checks), analysis (presenze, opportunità, controlli alibi: condiviso da matrix e consistency), dossier (anteprima con marked, .md, stampa/PDF, backup).
- format.js: formatValue (con prefix/suffix), newLabel(schema) per "Nuovo/Nuova …".
- `modules/cases.js`: finestra Casi (Alt+C).
- Eventi globali: `case:changed`, `data:changed {entity, action, record}`, `panel:changed`, `route:changed`, `theme:changed`, `app:error`.
- Ogni vista esporta `mount(container, { module })` e restituisce una funzione di pulizia.

## Moduli completati

1. Fondamenta MVC, DB, layout scuro/chiaro, librerie offline.
2. Entità dichiarative + API generica + Casi (caso attivo).
3. + 4. SPA, pannello di dettaglio, tabella generica, aiuto scorciatoie; Personaggi (ruolo, stato, segreto…), Luoghi (annidati), Asset (tipo, valore, dove si trova); Ctrl+K.
5. Grafo dei legami: 11 tipi, stato (alleati→nemici) con fasi per capitolo (`relation_phases`), cursore capitolo, filtri, segreti tratteggiati, collegamento trascinando (L), posizioni salvate per caso.
6. Alberi genealogici: `lineages` (biologica/adottiva/presunta/segreta), `unions` (matrimoni, clandestine…), personaggi con casato/nascita/morte;
   generazioni calcolate, coniugi sulla stessa riga, modalità Verità/Pubblica (V), filtro casato, trascina L genitore→figlio e U unione.
   Matrice proprietà: `ownerships` (quota %, dal/al capitolo, acquisizione, nascosta), cursore capitolo, controllo quote ≠ 100%, valore posseduto per personaggio;
   `wills` + `bequests` (lasciti) nella scheda Testamenti. Personaggi e asset mostrano le proprietà nel pannello.
7. Doppia timeline: `events` (kind fact/hidden/false; orari verità `real_*` e creduti `perceived_*`; luogo; capitolo e modo di narrazione) + `event_participants` (ruoli, "dichiara di esserci").
   Righe Verità/Percepito, Per personaggio (eventi simultanei), Per luogo; conflitti "stesso personaggio in due luoghi"; trascinare sposta l'orario, doppio clic crea.
   Scheda Narrazione: grafico capitolo × ordine dei fatti, salti indietro, eventi mai raccontati.
8. Percorsi e planimetrie: `routes` (da/a, mezzo, minuti, km, vale al ritorno), `maps` (immagine caricata, luogo, scala), `map_pins` (x/y 0–1, tipo, colore, luogo/personaggio).
   Planimetrie: zoom con rotellina, trascina per spostare, segnaposto trascinabili, doppio clic o P per aggiungerli, F adatta.
   Percorrenze: matrice dei tempi minimi (Floyd–Warshall; i luoghi annidati usano i percorsi del contenitore), filtro per mezzo, calcolatore partenza → arrivo.
   Spostamenti: eventi consecutivi di ogni personaggio (orari verità) confrontati con i tempi → impossibile / al limite / percorso sconosciuto / possibile.
9. Indizi: `clues` (classificazione reale / falsa pista / errore d'interpretazione; tipo, stato, importanza, cosa sembra / cosa significa, sembra indicare, messo lì da,
   luogo, evento, capitolo di scoperta e di svelamento) + `custody_steps` (azione, chi lo ha, dove, quando, capitolo, nascosto). I personaggi mostrano "Indizi che lo indicano".
   Bacheca a tre colonne (trascina per riclassificare), cursore capitolo, Vista lettore (V: solo ciò che il lettore sa, verità solo se già svelata).
   Catena di custodia con anomalie: manomissioni, collocazioni ad arte, cambi di mano senza consegna, passaggi dopo smarrimento/distruzione, passaggi senza data.
10. Matrice e alibi: `suspects` (delitto = evento, chi, perché + forza del movente, cosa + accesso al mezzo, colpevole) e `alibis` (dichiarazione, luogo, dalle/alle,
   testimone, tenuta Solido/Debole/Falso/Non verificato, capitolo in cui è dichiarato e in cui crolla, verità). Eventi e personaggi li mostrano nel pannello.
   Matrice: Chi / Perché / Cosa / Dove e quando dichiara / Opportunità reale calcolata (sul posto, altrove, impossibile per i tempi di percorrenza, possibile, da verificare); V nasconde il colpevole.
   Registro alibi con filtro per tenuta e controlli: smentito dalla timeline, testimone altrove o coincidente, solido senza testimone, solido ma crolla.
11. POV e bugie: `chapters` (numero, titolo, punto di vista, quando si svolge, stato, sintesi), `facts` (informazioni vere o false, chi riguarda, capitolo in cui le scopre il lettore),
   `knowledge` (chi lo sa / lo sospetta, da quale capitolo, come, da chi, lo nasconde), `lies` (chi mente, a chi, cosa dice, verità, perché, detta / smascherata al capitolo, da chi).
   Chi sa cosa: matrice informazioni × Lettore + personaggi al capitolo scelto, colonna POV evidenziata, ironia drammatica e "il POV sa, il lettore no".
   Mappa delle bugie: grafo chi mente → a chi (rosse in piedi, grigie smascherate) con cursore capitolo. Capitoli: scaletta con tutto ciò che accade in ogni capitolo
   (eventi, indizi, rivelazioni, bugie, alibi) e i capitoli ancora senza scheda. I numeri di capitolo degli altri moduli restano interi (nessun ref), la scaletta li unisce.
12. Idee orfane: `ideas` (idea, dettagli, potrebbe diventare, priorità, stato Da collocare/Parcheggiata/Usata/Scartata, etichette, capitolo previsto, converted_entity/converted_id).
   Cattura veloce (Invio; `#parola` = etichetta), filtri per stato/tipo/etichetta, ricerca. "Converti in…" apre il modulo del nuovo elemento già compilato;
   al salvataggio l'idea diventa Usata e rimanda all'elemento. Ctrl+K "Crea come idea". format.loadRefMap usa `_title` per le entità con title_template.
13. Archetipi e tropi: `tropes` (archetipo / tropo / regola del genere; uso Previsto/Usato/Ribaltato/Da evitare; capitolo; come lo uso) + `trope_links` (personaggio, capitolo);
   catalogo di 36 voci classiche aggiungibili con un clic. Consistency check: tutte le incongruenze del caso (personaggi prima della nascita / dopo la morte,
   stesso personaggio in due luoghi, spostamenti impossibili, catena di custodia, indizi mai spiegati, colpevole senza opportunità/mezzo/movente o con alibi solido,
   fair play (colpevole che compare tardi, POV che sa ciò che il lettore ignora), fonti delle conoscenze, bugie mai smascherate o smascherate da chi non sa,
   capitoli mancanti o senza POV, genitori più giovani dei figli, quote ≠ 100%, idee urgenti, tropi solo previsti); filtri per gravità e area, "Ignora" per caso (localStorage), R ricontrolla.
   Corretto: le preferenze non testuali (vista lettore, delitto scelto, planimetria, filtri) ora si salvano come JSON.
14. Dossier e backup: dossier Markdown generato dal server dagli schemi (sezioni a scelta, entità figlie dentro il record padre, indice), anteprima,
   download .md, stampa / "Salva come PDF" del browser con CSS di stampa dedicato. Backup del caso in JSON (dati + immagini in base64), ripristino sempre
   come NUOVO caso (id rinumerati, riferimenti ricollegati in due passaggi, anche quelli polimorfici delle idee), download del database SQLite completo
   (VACUUM INTO), pulizia delle immagini non più usate.

Scorciatoie: Ctrl+K, Alt+C, Alt+1…8, Alt+N, E, Esc, /, ?, Alt+T, Alt+M; grafo L F , . ; albero L U V F ; matrice , . ; timeline R F + - ; planimetrie P F + - ; indizi V , . ; matrice V ; POV e bugie , . F ; idee N / ; coerenza R ; dossier Ctrl+P

## Prossimi step (facoltativi)

- Extra proposti (dopo il 14, a scelta dell'utente): matrice ipotesi concorrenti (ACH), distribuzione indizi per capitolo, indicatore di sospetto, controllo depistaggi/"fucili di Čechov", calcolatore ora del decesso, alba/tramonto/luna offline, scenari "e se…", import capitoli da .docx, lavagna investigativa, istantanee del caso.

## Note

- Le immagini caricate ma mai salvate in un record restano in `public/uploads/` finché non si usa "Pulizia immagini" (Dossier → Backup).
- Il database è in una cartella OneDrive: `journal_mode = DELETE` in `config/config.php`.
- `public/.htaccess` imposta `Cache-Control: no-cache` per JS/CSS (serve mod_headers).
