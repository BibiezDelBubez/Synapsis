/**
 * Sinapsi — avvio dell'interfaccia: azioni, scorciatoie, comandi rapidi e router.
 */
import { on } from './core/dom.js';
import { openHelp } from './core/help.js';
import { hotkeys } from './core/hotkeys.js';
import { modal } from './core/modal.js';
import { palette } from './core/palette.js';
import { panel } from './core/panel.js';
import { getSchema } from './core/resource.js';
import { router } from './core/router.js';
import { session } from './core/session.js';
import './core/toast.js';
import { registerAction, sidebar, theme } from './core/ui.js';
import { openCases } from './modules/cases.js';

sidebar.restore();

// --- Azioni dichiarative (data-action="…") -----------------------------------
registerAction('toggle-theme', theme.toggle);
registerAction('toggle-sidebar', sidebar.toggle);
registerAction('open-cases', () => openCases());
registerAction('open-palette', () => palette.open());
registerAction('open-help', () => openHelp());

// --- Scorciatoie globali -----------------------------------------------------
hotkeys.register('ctrl+k', () => palette.toggle(), 'Cerca o crea al volo');
hotkeys.register('meta+k', () => palette.toggle(), 'Cerca o crea al volo (Mac)');
hotkeys.register('alt+c', () => openCases(), 'Casi');
hotkeys.register('alt+t', theme.toggle, 'Tema chiaro/scuro');
hotkeys.register('alt+m', sidebar.toggle, 'Mostra/nascondi menu');
hotkeys.register('?', () => { if (!modal.isOpen()) openHelp(); }, 'Questo aiuto');

// --- Comandi della ricerca rapida ---------------------------------------------
palette.addCommand({ label: 'Casi: apri, crea, cambia', icon: 'fa-folder-open', hint: 'Alt+C', keywords: 'romanzo libro progetto', run: () => openCases() });
for (const module of router.modules) {
    palette.addCommand({ label: `Vai a ${module.label}`, icon: module.icon, hint: 'Vai', keywords: module.id, run: () => router.navigate(module.path) });
    if (module.view === 'entity-table') {
        getSchema(module.entity).then((schema) => palette.addCommand({
            label: `Nuovo ${schema.label.toLowerCase()}`, icon: 'fa-plus', hint: 'Nuovo', keywords: `crea aggiungi ${module.id}`,
            run: () => (session.activeCase ? panel.create(module.entity) : openCases()),
        }));
    }
}
palette.addCommand({ label: 'Tema chiaro/scuro', icon: 'fa-circle-half-stroke', hint: 'Alt+T', keywords: 'dark light scuro', run: theme.toggle });
palette.addCommand({ label: 'Scorciatoie da tastiera', icon: 'fa-keyboard', hint: '?', keywords: 'aiuto help tasti', run: openHelp });

// --- Caso aperto nella barra superiore --------------------------------------------
on('case:changed', ({ case: current }) => {
    const label = document.getElementById('active-case-label');
    const dot = document.getElementById('active-case-dot');
    label.textContent = current ? current.title : 'Nessun caso aperto';
    label.classList.toggle('text-body-secondary', !current);
    dot.style.background = current?.color ?? 'transparent';
    document.title = current ? `${current.title} · Sinapsi` : 'Sinapsi';
});

// --- Indicatore di stato del server ---------------------------------------------------
function setServerStatus(ok, title) {
    const dot = document.getElementById('status-dot');
    dot.classList.toggle('ok', ok);
    dot.classList.toggle('ko', !ok);
    dot.title = title;
}

// --- Avvio ----------------------------------------------------------------------
session.load()
    .then(() => setServerStatus(true, 'Server OK'))
    .catch((error) => setServerStatus(false, error.message))
    .finally(() => router.start());
