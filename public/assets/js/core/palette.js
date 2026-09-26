/**
 * Quick-Lookup globale (Ctrl+K): trova o crea al volo personaggi, luoghi, asset…
 * senza cambiare pagina. La scheda trovata si apre nel pannello laterale.
 *
 * - Record: indice leggero da /api/search, ricerca fuzzy nel browser con Fuse.js.
 * - Comandi: registrati dagli altri moduli con palette.addCommand({ label, icon, hint, keywords, run }).
 * - Creazione: con testo digitato compaiono "Crea «testo» come …" per ogni entità del caso.
 *
 * Tastiera: ↑↓ selezione · Invio esegue · Esc chiude.
 */
import Fuse from '../../../vendor/fuse/fuse.esm.min.js';
import { api } from './api.js';
import { emit, h, icon, on } from './dom.js';
import { panel } from './panel.js';
import { router } from './router.js';
import { getSchemas, resource } from './resource.js';
import { session } from './session.js';

const MAX_RECORDS = 10;
const MAX_COMMANDS = 6;

const commands = [];
let index = null;          // Promise<{ items, fuse }>
let element = null;
let input = null;
let list = null;
let results = [];
let selected = 0;
let lastFocus = null;

function invalidate() {
    index = null;
}
on('data:changed', invalidate);
on('case:changed', invalidate);

async function loadIndex() {
    index ??= Promise.all([api.get('search'), getSchemas()]).then(([{ items }, schemas]) => {
        const enriched = items.map((item) => ({ ...item, schema: schemas[item.entity] }));
        return {
            items: enriched,
            schemas,
            fuse: new Fuse(enriched, {
                keys: [{ name: 'title', weight: 2 }, { name: 'subtitle', weight: 1 }],
                threshold: 0.38,
                ignoreLocation: true,
            }),
        };
    }).catch((error) => {
        index = null;
        throw error;
    });
    return index;
}

const commandFuse = () => new Fuse(commands, { keys: ['label', 'keywords'], threshold: 0.4, ignoreLocation: true });

function ensure() {
    if (element) return;
    input = h('input', {
        type: 'text', class: 'form-control form-control-lg palette-input',
        placeholder: 'Cerca personaggi, luoghi, asset… o scrivi un nome da creare', 'aria-label': 'Cerca',
    });
    list = h('div', { class: 'palette-list', role: 'listbox' });
    element = h('div', { class: 'palette-backdrop', hidden: true, onclick: (e) => { if (e.target === element) palette.close(); } },
        h('div', { class: 'palette', role: 'dialog', 'aria-label': 'Ricerca rapida' },
            h('div', { class: 'palette-search' }, icon('fa-magnifying-glass'), input),
            list,
            h('div', { class: 'palette-footer' }, '↑↓ seleziona · Invio apre · Esc chiude')));
    document.body.append(element);

    input.addEventListener('input', () => update());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            select(selected + (e.key === 'ArrowDown' ? 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            execute(results[selected]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            palette.close();
        }
    });
}

function select(i) {
    if (!results.length) return;
    selected = (i + results.length) % results.length;
    list.querySelectorAll('.palette-item').forEach((el, n) => el.classList.toggle('active', n === selected));
    list.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' });
}

async function update() {
    const q = input.value.trim();
    let data;
    try {
        data = await loadIndex();
    } catch (error) {
        list.replaceChildren(h('div', { class: 'palette-empty text-danger' }, error.message));
        return;
    }
    if (q !== input.value.trim()) return; // l'utente ha continuato a scrivere

    const records = (q ? data.fuse.search(q, { limit: MAX_RECORDS }).map((r) => r.item) : data.items.slice(0, MAX_RECORDS))
        .map((item) => ({
            kind: 'record', icon: item.schema.icon, title: item.title, subtitle: item.subtitle, hint: item.schema.label,
            run: () => panel.open(item.entity, item.id),
        }));

    const cmds = (q ? commandFuse().search(q, { limit: MAX_COMMANDS }).map((r) => r.item) : commands.slice(0, MAX_COMMANDS))
        .map((c) => ({ kind: 'command', icon: c.icon, title: c.label, hint: c.hint ?? 'Comando', run: c.run }));

    const creates = q && session.activeCase
        ? creatableEntities().map((name) => data.schemas[name]).filter(Boolean).map((s) => ({
            kind: 'create', icon: 'fa-plus', title: `Crea «${q}»`, hint: `come ${s.label.toLowerCase()}`,
            run: () => quickCreate(s, q),
        }))
        : [];

    results = [...records, ...cmds, ...creates];
    selected = 0;
    renderList(records.length === 0 && !session.activeCase);
}

function renderList(noCase) {
    if (!results.length) {
        list.replaceChildren(h('div', { class: 'palette-empty' }, noCase ? 'Nessun caso aperto: apri un caso per cercare nel suo archivio.' : 'Nessun risultato.'));
        return;
    }
    let lastKind = null;
    const labels = { record: session.activeCase ? 'Archivio del caso' : null, command: 'Comandi', create: 'Crea al volo' };
    const nodes = [];
    results.forEach((r, i) => {
        if (r.kind !== lastKind && labels[r.kind]) nodes.push(h('div', { class: 'palette-section' }, labels[r.kind]));
        lastKind = r.kind;
        nodes.push(h('div', {
            class: `palette-item${i === selected ? ' active' : ''}`, role: 'option',
            onmousemove: () => { if (selected !== i) select(i); },
            onclick: () => execute(r),
        },
        icon(r.icon, 'fa-fw palette-icon'),
        h('div', { class: 'palette-text' },
            h('div', { class: 'palette-title' }, r.title),
            r.subtitle ? h('div', { class: 'palette-subtitle' }, r.subtitle) : null),
        h('span', { class: 'palette-hint' }, r.hint)));
    });
    list.replaceChildren(...nodes);
}

/** Entità creabili al volo: moduli con quick_create in config/modules.php, nell'ordine del menu. */
function creatableEntities() {
    return router.modules.filter((m) => m.quick_create).map((m) => m.entity);
}

async function quickCreate(schema, text) {
    try {
        const record = await resource(schema.name).create({ [schema.title_field]: text });
        await panel.open(schema.name, record.id);
    } catch (error) {
        // Se servono altri campi obbligatori si apre il form già compilato col nome
        if (error.status === 422) panel.create(schema.name, { [schema.title_field]: text });
        else emit('app:error', { message: error.message });
    }
}

async function execute(result) {
    if (!result) return;
    palette.close(false);
    await result.run();
}

export const palette = {
    open() {
        ensure();
        lastFocus = document.activeElement;
        element.hidden = false;
        document.body.classList.add('palette-open');
        input.value = '';
        input.focus();
        update();
    },
    close(restoreFocus = true) {
        if (!element || element.hidden) return;
        element.hidden = true;
        document.body.classList.remove('palette-open');
        if (restoreFocus) lastFocus?.focus?.();
    },
    toggle() {
        if (element && !element.hidden) palette.close();
        else palette.open();
    },
    addCommand(command) {
        commands.push(command);
    },
};
