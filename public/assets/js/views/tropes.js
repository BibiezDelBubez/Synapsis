/**
 * Vista "Archetipi e tropi".
 *
 * - Nel caso: archetipi, tropi e regole del genere scelti per la storia, raggruppati per tipo, con l'uso
 *   (previsto, usato, ribaltato, da evitare) e i personaggi che li incarnano.
 * - Catalogo: archetipi, tropi e regole classiche del giallo da aggiungere con un clic.
 * - Elenco completo.
 *
 * Tastiera: Alt+N nuovo archetipo / tropo.
 */
import { h, icon, on } from '../core/dom.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { toast } from '../core/toast.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';
import { TROPES_CATALOG } from './tropes-catalog.js';

const KIND_ICON = { archetype: 'fa-user-tag', trope: 'fa-wand-magic-sparkles', rule: 'fa-scale-balanced' };
const normalize = (s) => String(s).trim().toLowerCase();

export async function mount(container, { module }) {
    const schema = await getSchema('tropes');
    const F = schema.fields;
    const state = { tropes: [], links: [], characters: [] };
    const charName = (id) => state.characters.find((c) => c.id === id)?.name ?? `#${id}`;

    const caseView = h('div', { class: 'graph-body trope-view' });
    const catalogView = h('div', { class: 'graph-body trope-view' });
    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create() }, icon('fa-plus', 'me-1'), 'Nuovo');

    const tabs = viewTabs([
        { id: 'case', label: 'Nel caso', icon: module.icon, persistent: true, render: (el) => el.append(caseView) },
        { id: 'catalog', label: 'Catalogo', icon: 'fa-book', persistent: true, render: (el) => el.append(catalogView) },
        { id: 'list', label: 'Elenco', icon: 'fa-list', render: (el) => mountTable(el, { module, embedded: true }) },
    ], { prefKey: 'tropes.view', onChange: (id) => { newBtn.hidden = id === 'list'; } });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            newBtn),
        tabs.body));

    // --- Nel caso ---------------------------------------------------------------------------------------
    function renderCase() {
        if (!session.activeCase) {
            return caseView.replaceChildren(h('div', { class: 'graph-empty position-static py-5' },
                h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')));
        }
        if (!state.tropes.length) {
            return caseView.replaceChildren(h('div', { class: 'text-body-secondary text-center py-5' },
                'Nessun archetipo o tropo nel caso. Aggiungine dal ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); tabs.select('catalog'); } }, 'catalogo'),
                ' o creane uno tuo (Alt+N).'));
        }
        caseView.replaceChildren(...Object.entries(F.kind.options).map(([kind, label]) => {
            const list = state.tropes.filter((t) => t.kind === kind);
            if (!list.length) return null;
            return h('section', { class: 'mb-4' },
                h('h2', { class: 'h6 text-body-secondary mb-2' }, icon(KIND_ICON[kind], 'me-2'), label, ` (${list.length})`),
                h('div', { class: 'trope-grid' }, ...list.map(tropeCard)));
        }).filter(Boolean));
    }

    function tropeCard(t) {
        const links = state.links.filter((l) => l.trope_id === t.id);
        return h('article', { class: `trope-card status-${t.status}`, tabindex: 0, dataset: { tropeId: t.id } },
            h('div', { class: 'd-flex align-items-start gap-2' },
                h('div', { class: 'fw-semibold flex-grow-1' }, t.name),
                h('span', { class: `badge badge-enum trope-status-${t.status}` }, F.status.options[t.status])),
            t.note ? h('div', { class: 'trope-note' }, t.note) : t.description ? h('div', { class: 'trope-desc' }, t.description) : null,
            h('div', { class: 'trope-meta' },
                t.chapter !== null ? h('span', {}, icon('fa-book-open', 'me-1'), t.chapter) : null,
                ...links.map((l) => h('span', { class: 'trope-chip' },
                    l.character_id ? h('span', { class: 'ref-link', dataset: { refEntity: 'characters', refId: l.character_id } }, charName(l.character_id)) : null,
                    l.chapter !== null ? ` cap. ${l.chapter}` : null)),
                h('button', { type: 'button', class: 'btn btn-link btn-sm p-0', dataset: { addLink: t.id }, title: 'Chi lo incarna / dove compare' }, icon('fa-plus', 'me-1'), t.kind === 'archetype' ? 'personaggio' : 'collega')));
    }

    caseView.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return;
        const add = e.target.closest('[data-add-link]');
        if (add) return panel.create('trope_links', { trope_id: Number(add.dataset.addLink) });
        const card = e.target.closest('.trope-card');
        if (card) panel.open('tropes', Number(card.dataset.tropeId));
    });
    caseView.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('trope-card')) panel.open('tropes', Number(e.target.dataset.tropeId));
    });

    // --- Catalogo -------------------------------------------------------------------------------------
    function renderCatalog() {
        const present = new Set(state.tropes.map((t) => normalize(t.name)));
        catalogView.replaceChildren(
            h('p', { class: 'small text-body-secondary' }, 'Archetipi, espedienti e regole classiche del giallo. "Aggiungi" li porta nel caso come "Previsto": poi decidi se usarli, ribaltarli o evitarli.'),
            ...Object.entries(F.kind.options).map(([kind, label]) => h('section', { class: 'mb-4' },
                h('h2', { class: 'h6 text-body-secondary mb-2' }, icon(KIND_ICON[kind], 'me-2'), label),
                h('div', { class: 'trope-grid' }, ...TROPES_CATALOG.filter((c) => c.kind === kind).map((c, i) => {
                    const added = present.has(normalize(c.name));
                    return h('article', { class: `trope-card catalog${added ? ' added' : ''}` },
                        h('div', { class: 'fw-semibold' }, c.name),
                        h('div', { class: 'trope-desc' }, c.description),
                        h('div', { class: 'trope-meta' }, added
                            ? h('span', { class: 'text-success small' }, icon('fa-check', 'me-1'), 'Già nel caso')
                            : h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary', disabled: !session.activeCase, dataset: { catalog: `${kind}:${i}` } }, icon('fa-plus', 'me-1'), 'Aggiungi')));
                })))));
    }

    catalogView.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-catalog]');
        if (!btn) return;
        const [kind, index] = btn.dataset.catalog.split(':');
        const item = TROPES_CATALOG.filter((c) => c.kind === kind)[Number(index)];
        btn.disabled = true;
        try {
            await resource('tropes').create({ name: item.name, kind: item.kind, description: item.description, status: 'planned' });
            toast(`«${item.name}» aggiunto al caso.`, 'success', 2000);
        } catch (error) {
            btn.disabled = false;
            toast(error.message);
        }
    });

    // --- Dati --------------------------------------------------------------------------------------------
    function create() {
        if (session.activeCase && !modal.isOpen()) panel.create('tropes');
    }

    async function load() {
        if (!session.activeCase) {
            Object.assign(state, { tropes: [], links: [], characters: [] });
        } else {
            const [t, l, c] = await Promise.all(['tropes', 'trope_links', 'characters'].map((e) => resource(e).list({ limit: 1000 })));
            [state.tropes, state.links, state.characters] = [t.data, l.data, c.data];
        }
        renderCase();
        renderCatalog();
    }

    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 50);
    };
    const keys = [['alt+n', () => create(), 'Nuovo archetipo / tropo']];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity }) => { if (['tropes', 'trope_links', 'characters'].includes(entity)) reload(); }, { signal });
    on('case:changed', () => load(), { signal });

    keys.forEach(([combo, handler, description]) => hotkeys.register(combo, handler, description));
    await tabs.start();
    await load();

    return () => {
        controller.abort();
        clearTimeout(timer);
        tabs.destroy();
        keys.forEach(([combo, handler]) => hotkeys.unregister(combo, handler));
    };
}
