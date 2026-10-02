# Sinapsi

Dashboard investigativa per chi scrive gialli e mystery. Scrivi il romanzo in Word e tieni Sinapsi aperto su un secondo schermo (o affiancato) per consultare e aggiornare personaggi, legami, alberi genealogici, cronologie, alibi, indizi, bugie e capitoli.

- Funziona **sul tuo computer**, nel browser, **senza internet**: nessun account, nessun dato inviato fuori.
- Tutti i dati stanno in un unico file: `database/sinapsi.sqlite`.
- Versione attuale: **1.0.0** (in alto a sinistra nell'app).

---

## Indice

1. [Cosa serve](#1-cosa-serve)
2. [Installazione con XAMPP (Windows), passo per passo](#2-installazione-con-xampp-windows-passo-per-passo)
3. [Primo avvio](#3-primo-avvio)
4. [Uso di tutti i giorni](#4-uso-di-tutti-i-giorni)
5. [I moduli](#5-i-moduli)
6. [Scorciatoie da tastiera](#6-scorciatoie-da-tastiera)
7. [Backup: non perdere il lavoro](#7-backup-non-perdere-il-lavoro)
8. [Aggiornare Sinapsi](#8-aggiornare-sinapsi)
9. [Se qualcosa non funziona](#9-se-qualcosa-non-funziona)
10. [Senza XAMPP](#10-senza-xampp)
11. [Per sviluppatori](#11-per-sviluppatori)
12. [Licenze delle librerie incluse](#12-licenze-delle-librerie-incluse)

---

## 1. Cosa serve

| Cosa | Dettagli |
|---|---|
| Un computer Windows, macOS o Linux | Le istruzioni sotto sono per Windows con XAMPP. |
| **XAMPP** (con PHP **8.1 o più recente**) | Gratuito: [apachefriends.org](https://www.apachefriends.org/). Di XAMPP servono solo **Apache** e **PHP**: MySQL non serve. |
| Un browser recente | Chrome, Edge, Firefox, Brave o Safari aggiornati. |

Le estensioni PHP necessarie (`pdo_sqlite`, `mbstring`) e i moduli Apache (`mod_rewrite`, `mod_headers`) sono **già attivi** in un'installazione normale di XAMPP: non devi toccare nulla.

---

## 2. Installazione con XAMPP (Windows), passo per passo

### 2.1 Installa XAMPP

1. Scarica XAMPP per Windows da [apachefriends.org](https://www.apachefriends.org/) (una versione con PHP 8.1 o superiore).
2. Installalo lasciando le opzioni predefinite. La cartella di solito è `C:\xampp`.

### 2.2 Metti Sinapsi nella cartella giusta

La cartella del progetto deve chiamarsi **`Synapsis`** e stare dentro **`htdocs`** di XAMPP:

```
C:\xampp\htdocs\Synapsis\
    ├── app\
    ├── config\
    ├── database\
    ├── public\
    ├── .htaccess          ← importante, non cancellarlo
    ├── bootstrap.php
    └── README.md          ← questo file
```

Due modi per ottenerla:

- **Con Git** (consigliato, così poi aggiorni con un comando): apri il *Prompt dei comandi* e scrivi
  ```
  cd C:\xampp\htdocs
  git clone https://github.com/BibiezDelBubez/Synapsis.git
  ```
  Il repository è privato: Git ti chiederà di accedere con il tuo account GitHub.
- **Senza Git**: su GitHub premi *Code → Download ZIP*, estrai lo ZIP dentro `C:\xampp\htdocs` e **rinomina** la cartella estratta (es. `Synapsis-main`) in `Synapsis`.

> ⚠️ Controlla che dentro `Synapsis` ci sia direttamente la cartella `public`. Se vedi `Synapsis\Synapsis\public`, hai una cartella di troppo: sposta il contenuto un livello più su.

> ℹ️ Il file `.htaccess` inizia con un punto e Windows può nasconderlo. Non serve vederlo, basta non cancellarlo.

### 2.3 Avvia Apache

1. Apri **XAMPP Control Panel**.
2. Premi **Start** accanto ad **Apache**. La riga diventa verde.
3. MySQL **non** serve: puoi lasciarlo spento.

### 2.4 Apri Sinapsi

Nel browser vai a:

**http://localhost/Synapsis/**

Deve aprirsi Sinapsi con il menu a sinistra e la Dashboard. Il database viene creato da solo al primo avvio.

> 💡 Salva l'indirizzo nei preferiti.

### 2.5 Verifica (facoltativa, 10 secondi)

Apri **http://localhost/Synapsis/api/health**: deve comparire un testo che contiene `"status": "ok"` e `"pending": []`. Se vedi questo, l'installazione è a posto.

---

## 3. Primo avvio

1. Premi **Alt+C** (o clicca il nome del caso nella barra in alto) per aprire la finestra **Casi**.
2. **Nuovo caso**: scrivi il titolo del romanzo e salva.
3. **Apri** il caso. Da ora tutti i moduli lavorano su quel caso.
4. Vai in **Personaggi** (Alt+2) e premi **Alt+N** per aggiungere il primo personaggio.

Ogni caso è separato dagli altri: puoi tenere più romanzi nello stesso Sinapsi.

**Come si lavora, ovunque nell'app:**

- **Clic su una riga** o su un nome blu sottolineato → si apre la **scheda** nel pannello a destra.
- **E** → modifica la scheda aperta. **Ctrl+Invio** → salva. **Esc** → annulla o chiudi.
- **Alt+N** → nuovo elemento nel modulo in cui ti trovi.
- **Ctrl+K** (oppure il riquadro «Cerca o crea…» in alto nel menu) → cerca qualsiasi cosa nel caso o crea al volo («Crea «testo» come personaggio / luogo / evento / idea…»).
- **?** → elenco delle scorciatoie attive nella pagina.

---

## 4. Uso di tutti i giorni

- **Per iniziare**: XAMPP Control Panel → **Start** su Apache → apri http://localhost/Synapsis/.
- **Per finire**: chiudi il browser. Puoi lasciare Apache acceso o premere **Stop**: i dati sono già salvati.
- Ogni modifica viene **salvata subito** nel database: non c'è un pulsante «Salva tutto».
- Lavora **da un solo computer alla volta** sullo stesso database (vedi [Backup](#7-backup-non-perdere-il-lavoro)).

---

## 5. I moduli

| Menu | Modulo | A cosa serve |
|---|---|---|
| Caso | **Dashboard** | Panoramica del caso aperto. |
| Archivio | **Personaggi**, **Luoghi**, **Asset** | Le schede di base. I luoghi possono stare uno dentro l'altro (la stanza nella villa). Gli asset sono beni con un valore (case, gioielli, quote…). |
| Mappatura | **Grafo dei legami** | Chi è legato a chi (amore, debito, ricatto…), con stato che cambia capitolo per capitolo e legami segreti. **L** per collegare trascinando. |
| | **Alberi genealogici** | Filiazioni (biologiche, adottive, presunte, segrete) e unioni. Vista «Verità» o «Versione pubblica» (**V**). |
| | **Matrice proprietà** | Chi possiede cosa, in che quota, dal capitolo X; testamenti e lasciti. |
| Tempo e spazio | **Doppia timeline** | Ogni evento ha l'orario **vero** e quello **creduto**. Segnala chi è in due luoghi nello stesso momento. Scheda *Narrazione*: ordine dei fatti contro ordine dei capitoli. |
| | **Percorsi e planimetrie** | Tempi di viaggio tra luoghi, calcolatore, controllo degli spostamenti impossibili; planimetrie (immagini caricate) con segnaposto. |
| Indagine | **Indizi e prove** | Indizi reali, false piste ed errori d'interpretazione; catena di custodia; **vista lettore** (cosa sa il lettore a ogni capitolo). |
| | **Matrice e alibi** | Per ogni delitto: chi, perché, con cosa, dove dice di essere e se poteva esserci davvero. Registro alibi con controlli automatici. |
| | **POV e bugie** | Chi sa cosa a ogni capitolo, punto di vista, ironia drammatica, mappa delle bugie, scaletta dei capitoli. |
| Scrittura | **Idee orfane** | Cestino degli spunti: scrivi e premi Invio; poi «Converti in…» personaggio, evento, indizio… |
| | **Archetipi e tropi** | Archetipi, espedienti e regole del giallo usati (o da evitare), con un catalogo pronto. |
| | **Consistency check** | Tutte le incongruenze del caso in una pagina (morti che partecipano a eventi, alibi smentiti, spostamenti impossibili, colpevole che compare tardi…). |
| | **Dossier del caso** | Esporta il caso in **Markdown** o **PDF**; **backup** e ripristino. |

**Il capitolo** è un numero (1, 2, 3…) usato da molti moduli: il cursore «Stato al capitolo» (tasti **,** e **.**) mostra la storia come appare a quel punto.

---

## 6. Scorciatoie da tastiera

Le scorciatoie senza Ctrl/Alt (es. **E**, **L**, **V**) non scattano mentre scrivi in un campo.

**Ovunque**

| Tasti | Azione |
|---|---|
| Ctrl+K | Cerca o crea al volo |
| Alt+C | Casi (apri, crea, cambia caso) |
| Alt+1 … Alt+9 | Dashboard, Personaggi, Luoghi, Asset, Grafo, Alberi, Proprietà, Timeline, Percorsi |
| Alt+N | Nuovo elemento nel modulo corrente |
| E | Modifica la scheda aperta |
| Ctrl+Invio | Salva il modulo |
| Esc | Annulla / chiudi il pannello |
| / | Cerca nella tabella o nella pagina |
| ? | Aiuto scorciatoie |
| Alt+T | Tema chiaro / scuro |
| Alt+M | Mostra / nascondi il menu |

**Nei singoli moduli**

| Modulo | Tasti |
|---|---|
| Grafo dei legami | **L** collega · **F** adatta · **,** **.** capitolo precedente / successivo |
| Alberi genealogici | **L** genitore → figlio · **U** unione · **V** verità / versione pubblica · **F** adatta |
| Matrice proprietà | **,** **.** capitolo |
| Doppia timeline | **R** cambia righe (verità/percepito, per personaggio, per luogo) · **F** adatta · **+** **−** zoom |
| Planimetrie | **P** aggiungi segnaposto · **F** adatta · **+** **−** zoom · doppio clic = nuovo segnaposto |
| Indizi e prove | **V** vista lettore · **,** **.** capitolo |
| Matrice e alibi | **V** mostra / nascondi il colpevole |
| POV e bugie | **,** **.** capitolo · **F** adatta la mappa delle bugie |
| Idee orfane | **N** scrivi una nuova idea |
| Consistency check | **R** ricontrolla |
| Dossier | **Ctrl+P** stampa / salva in PDF |

---

## 7. Backup: non perdere il lavoro

Tutto il tuo lavoro sta in **un solo file**: `C:\xampp\htdocs\Synapsis\database\sinapsi.sqlite`, più le immagini delle planimetrie in `public\uploads\`.

> ⚠️ **Questi file NON sono su GitHub** (di proposito: sono i tuoi dati privati). Se cancelli la cartella o il computer si rompe, GitHub non ti salva. Fai i backup.

Dall'app, menu **Dossier del caso → scheda Backup**:

| Pulsante | Cosa fa | Quando usarlo |
|---|---|---|
| **Scarica backup del caso** | Un file `.json` con tutto il caso aperto, immagini comprese. | Spesso (es. a fine giornata). Conservalo **fuori** dalla cartella di Sinapsi. |
| **Ripristina un caso** | Ricarica un backup `.json`. Crea **sempre un caso nuovo**, non sovrascrive niente. | Se hai rovinato qualcosa, o per spostare un caso su un altro PC. |
| **Scarica database** | Copia dell'intero database (tutti i casi). | Ogni tanto, come copia di sicurezza totale. |
| **Elimina immagini inutilizzate** | Cancella dal disco le immagini caricate e poi non usate. | Quando vuoi fare pulizia. |

**Ripristinare il database completo** (solo se serve davvero): ferma Apache, rinomina il file scaricato in `sinapsi.sqlite`, mettilo al posto di quello in `database\` (tieni da parte il vecchio), riavvia Apache.

**OneDrive / Dropbox**: Sinapsi funziona anche in una cartella sincronizzata (è già configurato per questo), ma **non usarlo da due computer contemporaneamente**: chiudi su uno prima di aprire sull'altro, e aspetta che la sincronizzazione finisca.

---

## 8. Aggiornare Sinapsi

**Con Git** (Prompt dei comandi):

```
cd C:\xampp\htdocs\Synapsis
git pull
```

**Senza Git**: scarica il nuovo ZIP e copia i file sopra quelli vecchi, **senza** toccare `database\sinapsi.sqlite` e `public\uploads\`.

Poi ricarica la pagina nel browser con **Ctrl+F5**. Il database si aggiorna da solo (le «migrazioni» vengono applicate al primo avvio): i tuoi dati restano. Per sicurezza, fai un *Scarica database* prima di ogni aggiornamento.

---

## 9. Se qualcosa non funziona

| Sintomo | Causa probabile | Soluzione |
|---|---|---|
| Il browser dice «Impossibile raggiungere il sito» / «Connessione rifiutata». | Apache è spento. | XAMPP Control Panel → **Start** su Apache. |
| Apache non parte (resta rosso). | La porta 80 è occupata da un altro programma (spesso Skype, IIS o un altro server). | Chiudi l'altro programma, oppure in XAMPP *Config → Apache (httpd.conf)* cambia `Listen 80` in `Listen 8080` e usa **http://localhost:8080/Synapsis/**. |
| «Not Found» / errore 404 aprendo http://localhost/Synapsis/. | Cartella con nome o posizione sbagliati. | Deve essere esattamente `C:\xampp\htdocs\Synapsis\` con dentro `public\` (vedi [2.2](#22-metti-sinapsi-nella-cartella-giusta)). |
| La Dashboard si apre ma ricaricando una pagina interna (es. `/Synapsis/indizi`) esce 404. | `mod_rewrite` spento o `.htaccess` ignorato. | In XAMPP sono attivi di serie. Se hai modificato `httpd.conf`, controlla che la riga `LoadModule rewrite_module …` non abbia `#` davanti e che per `htdocs` ci sia `AllowOverride All`. Riavvia Apache. Controlla anche che il file `.htaccess` esista nella cartella `Synapsis`. |
| Pagina bianca o messaggio «pdo_sqlite non attiva». | Estensione PHP disattivata. | *Config → PHP (php.ini)*: togli il `;` davanti a `extension=pdo_sqlite` (e `extension=sqlite3`), salva, riavvia Apache. |
| In basso a destra: «Server non raggiungibile: XAMPP (Apache) è avviato?» | Apache si è fermato mentre usavi l'app. | Riavvia Apache e ricarica la pagina. |
| Il pallino in alto a destra è rosso. | Il server non risponde o il database ha un problema. | Apri http://localhost/Synapsis/api/health e leggi il messaggio. |
| Caricando una planimetria: «Immagine troppo grande». | Limite di 15 MB di Sinapsi o limite di PHP. | Riduci l'immagine (bastano 2000–3000 px di lato). Il limite di Sinapsi è in `config\config.php` → `uploads.max_mb`. |
| Dopo un aggiornamento qualcosa sembra «vecchio». | Il browser usa file in cache. | **Ctrl+F5**. |
| I moduli dicono «Apri un caso». | Nessun caso aperto. | **Alt+C** → apri o crea un caso. |
| Ho cancellato qualcosa per sbaglio. | Non c'è il «annulla». | Ripristina l'ultimo backup del caso (Dossier → Backup → Ripristina): nasce un caso nuovo da cui recuperare i dati. |

Per capire un errore: il file `storage\logs\app.log` contiene i dettagli tecnici. Allegalo quando chiedi aiuto.

---

## 10. Senza XAMPP

Se hai PHP 8.1+ installato (con `pdo_sqlite` e `mbstring`), dalla cartella `Synapsis`:

```
php -S localhost:8000 -t public public/index.php
```

e apri **http://localhost:8000**. Va bene anche Laragon o qualsiasi Apache con `mod_rewrite`: basta che la cartella sia raggiungibile dal web server.

---

## 11. Per sviluppatori

Architettura, convenzioni e stato dello sviluppo: **[SVILUPPO.md](SVILUPPO.md)**.

In breve:

- PHP 8.1+ senza framework (MVC), SQLite via PDO, front controller `public/index.php`; il `.htaccess` in radice inoltra tutto a `public/`, quindi `app/`, `config/`, `database/` e `storage/` non sono raggiungibili dal browser.
- Frontend: single page app in JavaScript nativo (moduli ES, nessuna build). Librerie in `public/vendor/`, tutte locali.
- Le entità sono dichiarative: un file in `config/entities/` + una migrazione in `database/migrations/sqlite/` + una voce in `config/modules.php`.
- Migrazioni: automatiche all'avvio; da riga di comando `php bin/migrate.php` (applica) e `php bin/migrate.php status` (elenco).
- API REST generica: `/api/{entità}[/{id}]`; diagnostica su `/api/health`.
- Configurazione: `config/config.php`. `app.debug = false` mostra messaggi d'errore generici.
- MySQL è previsto nella configurazione ma **non ancora supportato** (mancano le migrazioni per MySQL): usa SQLite.

```
Synapsis/
├── .htaccess              inoltra tutto a public/
├── bootstrap.php          costanti, autoloader (App\ → app/), helper
├── app/
│   ├── Core/              kernel, router, database, schema, modello generico, upload, dossier, backup
│   ├── Controllers/       HomeController (SPA) e Api/ (risorse, sessione, ricerca, sistema, upload, archivio)
│   ├── Models/            regole specifiche per entità (es. niente luoghi circolari)
│   └── Views/             layout e parziali
├── config/                config.php · modules.php · routes.php · entities/ (una per entità)
├── database/
│   ├── migrations/sqlite/ 001_init.sql … 011_tropes.sql
│   └── sinapsi.sqlite     creato al primo avvio (non in git)
├── storage/logs/          app.log (non in git)
├── bin/migrate.php        migrazioni da riga di comando
└── public/                unica cartella esposta al browser
    ├── index.php          front controller
    ├── assets/            css, js (app.js, core/, views/), img
    ├── uploads/           immagini caricate (non in git)
    └── vendor/            librerie di terze parti
```

---

## 12. Licenze delle librerie incluse

Tutte le librerie sono copiate in `public/vendor/` (versioni in `public/vendor/VERSIONS.txt`), funzionano offline e hanno licenze che ne permettono la ridistribuzione; i testi delle licenze sono nelle rispettive cartelle.

| Libreria | Licenza |
|---|---|
| Bootstrap 5.3 | MIT |
| Font Awesome Free 6.7 | Icone CC BY 4.0, font SIL OFL 1.1, codice MIT |
| vis-network 10, vis-timeline 8 | Apache 2.0 / MIT (a scelta) |
| Fuse.js 7 | Apache 2.0 |
| marked 18 | MIT |
