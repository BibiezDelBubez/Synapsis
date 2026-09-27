/**
 * Vista "Indizi e prove".
 *
 * - Bacheca: indizi in tre colonne (Reale / Falsa pista / Errore d'interpretazione); trascinare una scheda
 *   in un'altra colonna ne cambia la classificazione. Cursore capitolo: cosa è stato scoperto fin lì.
 *   Vista lettore (V): una sola colonna con ciò che il lettore conosce al capitolo scelto, senza classificazione;
 *   il significato vero compare solo dal capitolo in cui viene svelato.
 * - Catena di custodia: passaggi di mano di un indizio in ordine di tempo, con le anomalie
 *   (manomissioni, cambi di mano non documentati, passaggi dopo lo smarrimento…).
 * - Elenco: tabella completa.
 *
 * Tastiera: Alt+N nuovo indizio · V vista lettore · , e . capitolo precedente/successivo.
 */
import { chapterSlider } from '../core/chapter-slider.js';
import { formatDateTime, h, icon, on } from '../core/dom.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { toast } from '../core/toast.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';

const KIND_ICONS = {
    physical: 'fa-fingerprint', document: 'fa-file-lines', testimony: 'fa-comment-dots', forensic: 'fa-flask',
    digital: 'fa-mobile-screen', behavior: 'fa-person-circle-question', other: 'fa-puzzle-piece',
};
const ACTION_ICONS = {
    planted: 'fa-hand-holding', found: 'fa-magnifying-glass', collected: 'fa-box-archive', handed: 'fa-right-left',
    analyzed: 'fa-flask', stored: 'fa-lock', moved: 'fa-truck-ramp-box', tampered: 'fa-skull-crossbones',
    lost: 'fa-circle-question', destroyed: 'fa-fire', returned: 'fa-rotate-left',
};
const COLUMNS = ['real', 'red_herring', 'misread'];
const LEVEL_ICON = { danger: 'fa-triangle-exclamation', warning: 'fa-circle-exclamation', info: 'fa-circle-info' };

/** Ordine dei passaggi: per data se entrambi l'hanno, altrimenti per capitolo, altrimenti per inserimento. */
function compareSteps(a, b) {
    if (a.happened_at && b.happened_at && a.happened_at !== b.happened_at) return a.happened_at < b.happened_at ? -1 : 1;
    if (a.chapter !== null && b.chapter !== null && a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.id - b.id;
}

/**
 * Controlla una catena di custodia.
 * @returns {{ steps: Array, issues: Map<number, Array<{level: string, text: string}>>, count: number }}
 */
export function custodyIssues(steps, nameOf) {
    const sorted = [...steps].sort(compareSteps);
    const issues = new Map();
    let count = 0;
    const add = (step, level, text) => {
        issues.set(step.id, [...(issues.get(step.id) ?? []), { level, text }]);
        if (level !== 'info') count++;
    };
    sorted.forEach((step, i) => {
        const prev = sorted[i - 1];
        if (step.action === 'tampered') add(step, 'danger', 'Manomesso: la prova è compromessa.');
        if (step.action === 'planted') add(step, 'warning', 'Collocato ad arte: qualcuno l\'ha messo lì apposta.');
        if (prev && ['lost', 'destroyed'].includes(prev.action) && !['found', 'returned'].includes(step.action)) {
            add(step, 'danger', `Passaggio dopo che era stato ${prev.action === 'lost' ? 'smarrito' : 'distrutto'}.`);
        }
        if (prev?.holder_id && step.holder_id && prev.holder_id !== step.holder_id
            && !['handed', 'found', 'collected', 'returned', 'planted'].includes(step.action)) {
            add(step, 'warning', `Cambio di mano non documentato: da ${nameOf(prev.holder_id)} a ${nameOf(step.holder_id)} senza consegna.`);
        }
        if (!step.happened_at && step.chapter === null) add(step, 'info', 'Senza data né capitolo: posizione nella catena incerta.');
        if (step.secret) add(step, 'info', 'Passaggio nascosto al lettore.');
    });
    return { steps: sorted, issues, count };
}

export async function mount(container, { module }) {
    const [clueSchema, stepSchema] = await Promise.all([getSchema('clues'), getSchema('custody_steps')]);
    const F = clueSchema.fields;
    const state = {
        clues: [], steps: [], characters: [], places: [],
        reader: prefs.getJSON('clues.reader', false), selected: prefs.getJSON('clues.selected', null),
    };
    const charName = (id) => state.characters.find((c) => c.id === id)?.name ?? `#${id}`;
    const placeName = (id) => state.places.find((p) => p.id === id)?.name ?? `#${id}`;
    const chains = new Map(); // clue_id → risultato di custodyIssues

    // --- Struttura --------------------------------------------------------------------------------
    const slider = chapterSlider({ onChange: () => renderBoard(), emptyText: 'Nessun capitolo indicato negli indizi' });
    const readerInput = h('input', { type: 'checkbox', class: 'form-check-input', role: 'switch', checked: state.reader,
        onchange: () => setReader(readerInput.checked) });
    const readerSwitch = h('label', { class: 'form-check form-switch mb-0 small', title: 'V' }, readerInput,
        h('span', { class: 'form-check-label' }, 'Vista lettore'));
    const board = h('div', { class: 'clue-board' });
    const boardView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' }, slider.el, h('div', { class: 'ms-auto' }, readerSwitch)),
        board);

    const chainList = h('div', { class: 'chain-list' });
    const chainDetail = h('div', { class: 'chain-detail' });
    const chainView = h('div', { class: 'graph-body chain-view' }, chainList, chainDetail);

    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create() },
        icon('fa-plus', 'me-1'), 'Nuovo indizio');

    const tabs = viewTabs([
        { id: 'board', label: 'Bacheca', icon: 'fa-table-columns', persistent: true, render: (el) => el.append(boardView) },
        { id: 'chain', label: 'Catena di custodia', icon: 'fa-link', persistent: true, render: (el) => el.append(chainView) },
        { id: 'list', label: clueSchema.label_plural, icon: 'fa-list', render: (el) => mountTable(el, { module, embedded: true }) },
    ], { prefKey: 'clues.view', onChange: (id) => { newBtn.hidden = id === 'list'; } });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            newBtn),
        tabs.body));

    const emptyState = (content) => h('div', { class: 'graph-empty position-static py-5' }, content);

    // --- Bacheca ---------------------------------------------------------------------------------------
    function renderBoard() {
        if (!session.activeCase) {
            return board.replaceChildren(emptyState(h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')));
        }
        if (!state.clues.length) {
            return board.replaceChildren(emptyState([h('p', { class: 'mb-2' }, 'Nessun indizio nel caso.'),
                h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => create() }, icon('fa-plus', 'me-1'), 'Nuovo indizio')]));
        }
        const ch = slider.current;
        const found = (c) => c.found_chapter === null || c.found_chapter <= ch;
        board.classList.toggle('reader', state.reader);

        if (state.reader) {
            const known = state.clues.filter(found);
            board.replaceChildren(column('reader', 'Ciò che il lettore sa', 'fa-book-open', known, ch,
                `${known.length} indizi scoperti al capitolo ${ch}`));
            return;
        }
        board.replaceChildren(...COLUMNS.map((cls) => {
            const list = state.clues.filter((c) => c.classification === cls);
            const visible = list.filter(found).length;
            return column(cls, F.classification.options[cls], null, list, ch, `${visible} scoperti · ${list.length} in tutto`);
        }));
    }

    function column(key, title, iconName, clues, ch, subtitle) {
        const body = h('div', { class: 'clue-column-body' }, ...clues.map((c) => clueCard(c, ch)));
        if (!clues.length) body.append(h('div', { class: 'text-body-tertiary small text-center py-3' }, state.reader ? 'Nessun indizio ancora scoperto.' : 'Trascina qui un indizio.'));
        return h('section', { class: `clue-column col-${key}`, dataset: { classification: key } },
            h('header', { class: 'clue-column-head' },
                h('div', { class: 'fw-semibold' }, iconName ? icon(iconName, 'me-2') : h('span', { class: `clue-dot dot-${key}` }), title),
                h('div', { class: 'small text-body-secondary' }, subtitle)),
            body);
    }

    function clueCard(c, ch) {
        const notYet = c.found_chapter !== null && c.found_chapter > ch;
        const revealed = c.revealed_chapter !== null && c.revealed_chapter <= ch;
        const chain = chains.get(c.id);
        const selected = panel.current?.entity === 'clues' && panel.current?.id === c.id;
        const showTruth = !state.reader || revealed;
        return h('article', {
            class: `clue-card${notYet ? ' not-yet' : ''}${selected ? ' selected' : ''}`,
            draggable: !state.reader, tabindex: 0, dataset: { clueId: c.id },
            title: notYet ? `Sarà scoperto al capitolo ${c.found_chapter}` : '',
        },
        h('div', { class: 'd-flex align-items-start gap-2' },
            h('span', { class: 'clue-kind', title: F.kind.options[c.kind] }, icon(KIND_ICONS[c.kind] ?? 'fa-puzzle-piece')),
            h('div', { class: 'fw-semibold flex-grow-1' }, c.title),
            c.importance ? h('span', { class: 'clue-importance', title: `Importanza ${c.importance}/5` }, '●'.repeat(c.importance)) : null),
        c.apparent_meaning ? h('div', { class: 'clue-meaning' }, h('span', { class: 'text-body-secondary' }, 'Sembra: '), c.apparent_meaning) : null,
        showTruth && c.true_meaning ? h('div', { class: 'clue-meaning clue-truth' }, h('span', {}, state.reader ? 'Svelato: ' : 'In realtà: '), c.true_meaning) : null,
        h('div', { class: 'clue-meta' },
            c.found_chapter !== null ? h('span', { title: 'Scoperto al capitolo' }, icon('fa-book-open', 'me-1'), c.found_chapter) : null,
            !state.reader && c.revealed_chapter !== null ? h('span', { title: 'Svelato al capitolo' }, icon('fa-lightbulb', 'me-1'), c.revealed_chapter) : null,
            c.points_to_id ? h('span', { title: 'Sembra indicare' }, icon('fa-arrow-right', 'me-1'), charName(c.points_to_id)) : null,
            !state.reader && c.planted_by_id ? h('span', { title: 'Messo lì da', class: 'text-danger-emphasis' }, icon('fa-hand-holding', 'me-1'), charName(c.planted_by_id)) : null,
            !state.reader && chain?.steps.length ? h('span', { title: 'Passaggi di custodia' }, icon('fa-link', 'me-1'), chain.steps.length) : null,
            !state.reader && chain?.count ? h('span', { class: 'text-warning', title: 'Anomalie nella catena di custodia' }, icon('fa-triangle-exclamation', 'me-1'), chain.count) : null,
            !state.reader ? h('span', { class: `badge badge-enum enum-${c.status} ms-auto` }, F.status.options[c.status]) : null));
    }

    board.addEventListener('click', (e) => {
        const card = e.target.closest('.clue-card');
        if (card) panel.open('clues', Number(card.dataset.clueId));
    });
    board.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.closest('.clue-card')) e.target.click();
    });
    board.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.clue-card');
        if (!card) return;
        e.dataTransfer.setData('text/plain', card.dataset.clueId);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
    });
    board.addEventListener('dragend', (e) => e.target.closest('.clue-card')?.classList.remove('dragging'));
    board.addEventListener('dragover', (e) => {
        const col = e.target.closest('.clue-column');
        if (!col || state.reader) return;
        e.preventDefault();
        board.querySelectorAll('.drop-target').forEach((el) => el !== col && el.classList.remove('drop-target'));
        col.classList.add('drop-target');
    });
    board.addEventListener('dragleave', (e) => {
        const col = e.target.closest('.clue-column');
        if (col && !col.contains(e.relatedTarget)) col.classList.remove('drop-target');
    });
    board.addEventListener('drop', async (e) => {
        const col = e.target.closest('.clue-column');
        board.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));
        if (!col || state.reader) return;
        e.preventDefault();
        const id = Number(e.dataTransfer.getData('text/plain'));
        const clue = state.clues.find((c) => c.id === id);
        const classification = col.dataset.classification;
        if (!clue || clue.classification === classification) return;
        try {
            await resource('clues').update(id, { classification });
            toast(`«${clue.title}»: ${F.classification.options[classification]}`, 'success', 2000);
        } catch (error) {
            toast(error.message);
        }
    });

    // --- Catena di custodia -----------------------------------------------------------------------
    function renderChain() {
        if (!session.activeCase || !state.clues.length) {
            chainList.replaceChildren();
            chainDetail.replaceChildren(emptyState(!session.activeCase
                ? h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')
                : 'Nessun indizio nel caso.'));
            return;
        }
        if (!state.clues.some((c) => c.id === state.selected)) state.selected = state.clues[0].id;
        chainList.replaceChildren(...state.clues.map((c) => {
            const chain = chains.get(c.id);
            return h('button', { type: 'button', class: `chain-item${c.id === state.selected ? ' active' : ''}`, dataset: { clueId: c.id } },
                h('span', { class: `clue-dot dot-${c.classification}` }),
                h('span', { class: 'flex-grow-1 text-truncate' }, c.title),
                chain?.count ? h('span', { class: 'text-warning small text-nowrap' }, icon('fa-triangle-exclamation', 'me-1'), chain.count)
                    : h('span', { class: 'small text-body-tertiary' }, chain?.steps.length ?? 0));
        }));

        const clue = state.clues.find((c) => c.id === state.selected);
        const chain = chains.get(clue.id) ?? { steps: [], issues: new Map(), count: 0 };
        const A = stepSchema.fields.action.options;
        const addBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => addStep(clue, chain) }, icon('fa-plus', 'me-1'), 'Passaggio');

        const items = chain.steps.map((s) => {
            const issues = chain.issues.get(s.id) ?? [];
            const worst = issues.find((i) => i.level === 'danger') ? 'danger' : issues.find((i) => i.level === 'warning') ? 'warning' : '';
            return h('li', { class: `chain-step${worst ? ` has-${worst}` : ''}${s.secret ? ' secret' : ''}`, tabindex: 0, dataset: { stepId: s.id } },
                h('span', { class: 'chain-icon' }, icon(ACTION_ICONS[s.action] ?? 'fa-circle')),
                h('div', { class: 'flex-grow-1' },
                    h('div', {}, h('strong', {}, A[s.action]),
                        s.holder_id ? [' · ', h('span', { class: 'ref-link', dataset: { refEntity: 'characters', refId: s.holder_id } }, charName(s.holder_id))] : null,
                        s.secret ? h('span', { class: 'badge text-bg-secondary ms-2' }, icon('fa-user-secret', 'me-1'), 'nascosto') : null),
                    h('div', { class: 'matrix-sub' }, [
                        s.happened_at ? formatDateTime(s.happened_at) : null,
                        s.chapter !== null ? `cap. ${s.chapter}` : null,
                        s.place_id ? placeName(s.place_id) : null,
                    ].filter(Boolean).join(' · ') || 'Senza data'),
                    s.note ? h('div', { class: 'small mt-1' }, s.note) : null,
                    ...issues.map((i) => h('div', { class: `chain-issue text-${i.level === 'info' ? 'body-secondary' : i.level}` }, icon(LEVEL_ICON[i.level], 'me-1'), i.text))));
        });

        chainDetail.replaceChildren(
            h('div', { class: 'd-flex align-items-center gap-2 mb-3 flex-wrap' },
                h('h2', { class: 'h5 mb-0' }, h('span', { class: 'ref-link', dataset: { refEntity: 'clues', refId: clue.id } }, clue.title)),
                h('span', { class: `badge badge-enum enum-${clue.classification}` }, F.classification.options[clue.classification]),
                chain.count ? h('span', { class: 'text-warning small' }, icon('fa-triangle-exclamation', 'me-1'), `${chain.count} anomalie`) : null,
                h('div', { class: 'ms-auto' }, addBtn)),
            items.length
                ? h('ol', { class: 'chain-steps' }, ...items)
                : h('p', { class: 'text-body-secondary' }, 'Nessun passaggio registrato: chi l\'ha trovato, a chi l\'ha consegnato, dove è stato custodito…'));
    }

    chainList.addEventListener('click', (e) => {
        const item = e.target.closest('.chain-item');
        if (!item) return;
        state.selected = Number(item.dataset.clueId);
        prefs.setJSON('clues.selected', state.selected);
        renderChain();
    });
    chainDetail.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link, button')) return;
        const step = e.target.closest('.chain-step');
        if (step) panel.open('custody_steps', Number(step.dataset.stepId));
    });
    chainDetail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.closest('.chain-step')) e.target.click();
    });

    function addStep(clue, chain) {
        const last = chain.steps[chain.steps.length - 1];
        panel.create('custody_steps', {
            clue_id: clue.id,
            action: last ? 'handed' : 'found',
            holder_id: last?.holder_id ?? null,
            place_id: last?.place_id ?? clue.place_id,
            chapter: last?.chapter ?? clue.found_chapter,
        });
    }

    // --- Dati e azioni ------------------------------------------------------------------------------
    function create() {
        if (!session.activeCase || modal.isOpen()) return;
        panel.create('clues', slider.value !== null ? { found_chapter: slider.value } : {});
    }

    function setReader(on) {
        state.reader = on;
        readerInput.checked = on;
        prefs.setJSON('clues.reader', on);
        renderBoard();
    }

    async function load() {
        if (!session.activeCase) {
            Object.assign(state, { clues: [], steps: [], characters: [], places: [] });
        } else {
            const [clues, steps, chars, places] = await Promise.all(['clues', 'custody_steps', 'characters', 'places'].map((e) => resource(e).list({ limit: 1000 })));
            [state.clues, state.steps, state.characters, state.places] = [clues.data, steps.data, chars.data, places.data];
        }
        chains.clear();
        state.clues.forEach((c) => chains.set(c.id, custodyIssues(state.steps.filter((s) => s.clue_id === c.id), charName)));
        const chapters = [...state.clues.flatMap((c) => [c.found_chapter, c.revealed_chapter]), ...state.steps.map((s) => s.chapter)].filter((x) => x !== null);
        slider.setRange(chapters.length ? Math.max(...chapters) : 0, chapters.length > 0);
        renderBoard();
        renderChain();
    }

    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 50);
    };

    const keys = [
        ['alt+n', () => create(), 'Nuovo indizio'],
        ['v', () => setReader(!state.reader), 'Indizi: vista lettore / autore'],
        [',', () => slider.step(-1), 'Capitolo precedente'],
        ['.', () => slider.step(1), 'Capitolo successivo'],
    ];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity, action, record }) => {
        if (!['clues', 'custody_steps', 'characters', 'places'].includes(entity)) return;
        if (entity === 'custody_steps' && record?.clue_id) state.selected = record.clue_id;
        if (entity === 'clues' && action === 'create' && record?.id) state.selected = record.id;
        reload();
    }, { signal });
    on('case:changed', () => load(), { signal });
    on('panel:changed', () => renderBoard(), { signal });

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
