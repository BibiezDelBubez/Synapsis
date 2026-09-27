/**
 * Vista "Idee orfane": il cestino degli spunti non ancora collocati nella storia.
 *
 * - Cattura veloce: scrivi e premi Invio (le parole con # diventano etichette: "gemello segreto #finale").
 * - Filtri per stato, tipo ed etichetta; ricerca nel testo.
 * - "Converti in…": apre il modulo del nuovo elemento (personaggio, luogo, evento, indizio…) già compilato
 *   con il testo dell'idea; al salvataggio l'idea passa a "Usata" e rimanda all'elemento creato.
 *
 * Tastiera: Alt+N o N scrivi una nuova idea · / cerca.
 */
import { h, icon, on } from '../core/dom.js';
import { loadRefMap } from '../core/format.js';
import { hotkeys } from '../core/hotkeys.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { toast } from '../core/toast.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';

/** Come si trasforma un'idea in ciascun tipo di elemento (campi precompilati del modulo). */
const CONVERT = {
    characters: (i) => ({ name: i.title, description: i.body }),
    places: (i) => ({ name: i.title, description: i.body }),
    assets: (i) => ({ name: i.title, description: i.body }),
    events: (i) => ({ title: i.title, description: i.body, chapter: i.chapter }),
    clues: (i) => ({ title: i.title, description: i.body, found_chapter: i.chapter }),
    facts: (i) => ({ title: i.title, description: i.body, reader_chapter: i.chapter }),
    lies: (i) => ({ statement: i.title, note: i.body, told_chapter: i.chapter }),
    chapters: (i) => ({ number: i.chapter, title: i.title, summary: i.body }),
};
const PRIORITY_ICON = { high: 'fa-angles-up text-danger', normal: '', low: 'fa-angles-down text-body-tertiary' };

/** "gemello segreto #finale #movente" → { title: "gemello segreto", tags: "finale movente" } */
export function parseQuickIdea(text) {
    const tags = [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((m) => m[1].toLowerCase());
    const title = text.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/\s{2,}/g, ' ').trim();
    return { title: title || text.trim(), tags: tags.length ? [...new Set(tags)].join(' ') : null };
}
const tagList = (tags) => (tags ? String(tags).split(/[\s,]+/).filter(Boolean) : []);

export async function mount(container, { module }) {
    const schema = await getSchema('ideas');
    const F = schema.fields;
    const state = {
        ideas: [], statuses: new Set(prefs.getJSON('ideas.statuses', ['open', 'parked'])),
        kind: '', tag: '', q: '', titles: new Map(), pending: null,
    };

    // --- Struttura -----------------------------------------------------------------------------------------
    const capture = h('input', { type: 'text', class: 'form-control idea-capture', maxlength: 250,
        placeholder: session.activeCase ? 'Un\'idea al volo… (Invio per salvarla, #etichetta per classificarla)' : 'Apri un caso per annotare idee',
        'aria-label': 'Nuova idea' });
    const captureKind = h('select', { class: 'form-select', style: 'max-width:14rem', 'aria-label': 'Potrebbe diventare' },
        ...Object.entries(F.kind.options).map(([k, label]) => h('option', { value: k, selected: k === 'other' }, label)));
    const captureBox = h('form', { class: 'idea-capture-box' }, icon('fa-lightbulb idea-capture-icon'), capture, captureKind,
        h('button', { type: 'submit', class: 'btn btn-primary' }, icon('fa-plus', 'me-1'), 'Aggiungi'));

    const search = h('input', { type: 'search', class: 'form-control form-control-sm', style: 'max-width:16rem', placeholder: 'Cerca… ( / )', 'aria-label': 'Cerca' });
    const statusChips = h('div', { class: 'chip-group' });
    const kindFilter = h('select', { class: 'form-select form-select-sm', style: 'width:auto', 'aria-label': 'Tipo' },
        h('option', { value: '' }, 'Tutti i tipi'), ...Object.entries(F.kind.options).map(([k, label]) => h('option', { value: k }, label)));
    const tagChips = h('div', { class: 'chip-group' });
    const grid = h('div', { class: 'idea-grid' });
    const board = h('div', { class: 'graph-body idea-board' },
        captureBox,
        h('div', { class: 'graph-toolbar' }, statusChips, kindFilter, search, tagChips),
        grid);

    const tabs = viewTabs([
        { id: 'board', label: 'Cestino', icon: 'fa-inbox', persistent: true, render: (el) => el.append(board), onShow: () => capture.focus() },
        { id: 'list', label: schema.label_plural, icon: 'fa-list', render: (el) => mountTable(el, { module, embedded: true }) },
    ], { prefKey: 'ideas.view' });

    const count = h('span', { class: 'badge text-bg-secondary ms-2 fs-6 align-middle' });
    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label, count),
            tabs.header),
        tabs.body));

    // --- Disegno ---------------------------------------------------------------------------------------------
    function visible() {
        const q = state.q.toLowerCase();
        return state.ideas.filter((i) => state.statuses.has(i.status)
            && (!state.kind || i.kind === state.kind)
            && (!state.tag || tagList(i.tags).includes(state.tag))
            && (!q || [i.title, i.body, i.tags].some((t) => t && t.toLowerCase().includes(q))));
    }

    function render() {
        const open = state.ideas.filter((i) => i.status === 'open').length;
        count.textContent = String(open);
        count.title = 'Idee da collocare';
        capture.disabled = !session.activeCase;
        statusChips.replaceChildren(...Object.entries(F.status.options).map(([k, label]) =>
            h('button', { type: 'button', class: `chip${state.statuses.has(k) ? ' active' : ''}`, dataset: { status: k } },
                `${label} (${state.ideas.filter((i) => i.status === k).length})`)));
        const tags = [...new Set(state.ideas.flatMap((i) => tagList(i.tags)))].sort();
        tagChips.replaceChildren(...tags.map((t) => h('button', { type: 'button', class: `chip idea-tag${state.tag === t ? ' active' : ''}`, dataset: { tag: t } }, `#${t}`)));

        if (!session.activeCase) {
            return grid.replaceChildren(h('div', { class: 'graph-empty position-static py-5' },
                h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')));
        }
        const list = visible();
        if (!list.length) {
            return grid.replaceChildren(h('div', { class: 'text-body-secondary text-center py-5' },
                state.ideas.length ? 'Nessuna idea con questi filtri.' : 'Il cestino è vuoto: annota qui gli spunti che non sai ancora dove mettere.'));
        }
        grid.replaceChildren(...list.map(card));
    }

    function card(i) {
        const selected = panel.current?.entity === 'ideas' && panel.current?.id === i.id;
        const convert = h('select', { class: 'form-select form-select-sm idea-convert', 'aria-label': 'Converti in', dataset: { ideaId: i.id } },
            h('option', { value: '' }, 'Converti in…'),
            ...Object.entries(F.converted_entity.options).map(([k, label]) => h('option', { value: k }, `${label}${k === i.kind ? ' ★' : ''}`)));
        const converted = i.converted_entity && i.converted_id
            ? h('div', { class: 'idea-converted' }, icon('fa-arrow-right-long', 'me-1'), F.converted_entity.options[i.converted_entity] ?? i.converted_entity, ': ',
                state.titles.get(`${i.converted_entity}:${i.converted_id}`)
                    ? h('span', { class: 'ref-link', dataset: { refEntity: i.converted_entity, refId: i.converted_id } }, state.titles.get(`${i.converted_entity}:${i.converted_id}`))
                    : h('span', { class: 'text-body-tertiary' }, 'elemento eliminato'))
            : null;
        return h('article', { class: `idea-card status-${i.status} priority-${i.priority}${selected ? ' selected' : ''}`, tabindex: 0, dataset: { ideaId: i.id } },
            h('div', { class: 'd-flex align-items-start gap-2' },
                PRIORITY_ICON[i.priority] ? icon(PRIORITY_ICON[i.priority], 'mt-1') : null,
                h('div', { class: 'fw-semibold flex-grow-1 idea-title' }, i.title)),
            i.body ? h('div', { class: 'idea-body' }, i.body) : null,
            converted,
            h('div', { class: 'idea-meta' },
                h('span', { class: 'badge badge-enum' }, F.kind.options[i.kind]),
                i.chapter !== null ? h('span', {}, icon('fa-book-open', 'me-1'), i.chapter) : null,
                ...tagList(i.tags).map((t) => h('span', { class: 'idea-tag-label' }, `#${t}`))),
            h('div', { class: 'idea-actions' },
                i.status === 'used' ? null : convert,
                i.status !== 'parked' && i.status !== 'used' ? actionBtn(i, 'parked', 'fa-square-parking', 'Parcheggia') : null,
                i.status !== 'open' ? actionBtn(i, 'open', 'fa-rotate-left', 'Rimetti tra le idee da collocare') : null,
                i.status !== 'discarded' && i.status !== 'used' ? actionBtn(i, 'discarded', 'fa-trash-can', 'Scarta') : null));
    }

    const actionBtn = (i, status, iconName, title) => h('button', { type: 'button', class: 'btn btn-sm btn-icon', title, dataset: { ideaId: i.id, setStatus: status } }, icon(iconName));

    // --- Interazione -------------------------------------------------------------------------------------------
    captureBox.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = capture.value.trim();
        if (!text || !session.activeCase) return;
        const { title, tags } = parseQuickIdea(text);
        try {
            await resource('ideas').create({ title, tags, kind: captureKind.value });
            capture.value = '';
            capture.focus();
        } catch (error) {
            toast(error.message);
        }
    });

    statusChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const k = chip.dataset.status;
        if (state.statuses.has(k)) state.statuses.delete(k);
        else state.statuses.add(k);
        prefs.setJSON('ideas.statuses', [...state.statuses]);
        render();
    });
    tagChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        state.tag = state.tag === chip.dataset.tag ? '' : chip.dataset.tag;
        render();
    });
    kindFilter.addEventListener('change', () => { state.kind = kindFilter.value; render(); });
    search.addEventListener('input', () => { state.q = search.value.trim(); render(); });

    grid.addEventListener('change', (e) => {
        const select = e.target.closest('.idea-convert');
        if (!select || !select.value) return;
        const idea = state.ideas.find((i) => i.id === Number(select.dataset.ideaId));
        const entity = select.value;
        select.value = '';
        if (!idea) return;
        const defaults = Object.fromEntries(Object.entries(CONVERT[entity](idea)).filter(([, v]) => v !== null && v !== undefined && v !== ''));
        state.pending = { ideaId: idea.id, entity };
        panel.create(entity, defaults);
    });
    grid.addEventListener('click', async (e) => {
        if (e.target.closest('.ref-link, .idea-convert')) return;
        const btn = e.target.closest('[data-set-status]');
        if (btn) {
            try {
                await resource('ideas').update(Number(btn.dataset.ideaId), { status: btn.dataset.setStatus });
            } catch (error) {
                toast(error.message);
            }
            return;
        }
        const cardEl = e.target.closest('.idea-card');
        if (cardEl) panel.open('ideas', Number(cardEl.dataset.ideaId));
    });
    grid.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('idea-card')) panel.open('ideas', Number(e.target.dataset.ideaId));
    });

    /** Il nuovo elemento è stato salvato: l'idea diventa "Usata" e rimanda a esso. */
    async function completeConversion(record) {
        const { ideaId, entity } = state.pending;
        state.pending = null;
        try {
            await resource('ideas').update(ideaId, { status: 'used', converted_entity: entity, converted_id: record.id });
            toast(`Idea convertita in ${F.converted_entity.options[entity].toLowerCase()}.`, 'success', 2500);
        } catch (error) {
            toast(error.message);
        }
    }

    // --- Dati -----------------------------------------------------------------------------------------------------
    async function load() {
        state.ideas = session.activeCase ? (await resource('ideas').list({ limit: 1000 })).data : [];
        const entities = [...new Set(state.ideas.filter((i) => i.converted_entity).map((i) => i.converted_entity))];
        const maps = await Promise.all(entities.map((en) => loadRefMap(en)));
        state.titles = new Map(entities.flatMap((en, k) => [...maps[k]].map(([id, title]) => [`${en}:${id}`, title])));
        render();
    }

    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 50);
    };

    const focusCapture = () => {
        if (tabs.current !== 'board') return;
        capture.focus();
        capture.select();
    };
    const keys = [
        ['alt+n', focusCapture, 'Nuova idea'],
        ['n', focusCapture, 'Nuova idea'],
        ['/', () => search.focus(), 'Cerca tra le idee'],
    ];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity, action, record }) => {
        if (state.pending && action === 'create' && entity === state.pending.entity && record?.id) completeConversion(record);
        if (entity === 'ideas' || state.ideas.some((i) => i.converted_entity === entity)) reload();
    }, { signal });
    on('panel:changed', ({ entity, id }) => {
        // Modulo di conversione chiuso o abbandonato senza salvare
        if (state.pending && (entity !== state.pending.entity || id)) state.pending = null;
        render();
    }, { signal });
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
