/**
 * Vista "Consistency check": tutte le incongruenze del caso in un solo posto, ricalcolate a ogni modifica.
 * Errori (rosso), da controllare (giallo), suggerimenti (azzurro); filtri per gravità e area;
 * "Ignora" nasconde un avviso voluto (ricordato per caso in questo browser).
 *
 * Tastiera: R ricontrolla.
 */
import { h, icon, on } from '../core/dom.js';
import { hotkeys } from '../core/hotkeys.js';
import { prefs } from '../core/prefs.js';
import { resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { AREAS, CHECK_ENTITIES, checkCase } from './consistency-checks.js';

const LEVELS = {
    danger: { label: 'Errori', icon: 'fa-circle-xmark', cls: 'danger' },
    warning: { label: 'Da controllare', icon: 'fa-triangle-exclamation', cls: 'warning' },
    info: { label: 'Suggerimenti', icon: 'fa-circle-info', cls: 'info' },
};

export async function mount(container, { module }) {
    const state = {
        issues: [], levels: new Set(prefs.getJSON('consistency.levels', ['danger', 'warning', 'info'])),
        area: '', showIgnored: false, checkedAt: null,
    };
    const ignoredKey = () => `consistency.ignored.${session.activeCase?.id ?? 0}`;
    const ignored = () => new Set(prefs.getJSON(ignoredKey(), []));

    const tiles = h('div', { class: 'check-tiles' });
    const areaSelect = h('select', { class: 'form-select form-select-sm', style: 'width:auto', 'aria-label': 'Area' });
    const ignoredInput = h('input', { type: 'checkbox', class: 'form-check-input', role: 'switch' });
    const checkedLabel = h('span', { class: 'small text-body-tertiary' });
    const list = h('div', { class: 'check-list' });
    const rerun = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'R', onclick: () => load() }, icon('fa-rotate', 'me-1'), 'Ricontrolla');

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            checkedLabel, rerun),
        h('div', { class: 'graph-body check-view' },
            tiles,
            h('div', { class: 'graph-toolbar' }, areaSelect,
                h('label', { class: 'form-check form-switch mb-0 small ms-auto' }, ignoredInput, h('span', { class: 'form-check-label' }, 'Mostra gli avvisi ignorati'))),
            list)));

    // --- Disegno ---------------------------------------------------------------------------------------
    function render() {
        const skip = ignored();
        const active = state.issues.filter((i) => state.showIgnored || !skip.has(i.id));
        tiles.replaceChildren(...Object.entries(LEVELS).map(([k, l]) => {
            const n = active.filter((i) => i.level === k).length;
            return h('button', { type: 'button', class: `check-tile tile-${l.cls}${state.levels.has(k) ? ' active' : ''}`, dataset: { level: k } },
                icon(l.icon, 'check-tile-icon'), h('div', {}, h('div', { class: 'check-tile-num' }, n), h('div', { class: 'small' }, l.label)));
        }));

        const areas = Object.entries(AREAS).filter(([k]) => active.some((i) => i.area === k));
        areaSelect.replaceChildren(h('option', { value: '' }, 'Tutte le aree'),
            ...areas.map(([k, label]) => h('option', { value: k, selected: k === state.area }, `${label} (${active.filter((i) => i.area === k).length})`)));

        if (!session.activeCase) {
            return list.replaceChildren(h('div', { class: 'graph-empty position-static py-5' },
                h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')));
        }
        const shown = active.filter((i) => state.levels.has(i.level) && (!state.area || i.area === state.area));
        if (!shown.length) {
            return list.replaceChildren(h('div', { class: 'text-center py-5 text-body-secondary' },
                icon('fa-circle-check text-success fs-3 d-block mb-2'),
                state.issues.length ? 'Nessun avviso con questi filtri.' : 'Nessuna incongruenza trovata.'));
        }
        const order = ['danger', 'warning', 'info'];
        list.replaceChildren(...Object.entries(AREAS).map(([area, label]) => {
            const items = shown.filter((i) => i.area === area).sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
            if (!items.length) return null;
            return h('section', { class: 'check-group' },
                h('h2', { class: 'h6 text-body-secondary' }, label, h('span', { class: 'ms-2 badge text-bg-secondary' }, items.length)),
                ...items.map((i) => issueRow(i, skip.has(i.id))));
        }).filter(Boolean));
    }

    function issueRow(i, isIgnored) {
        const l = LEVELS[i.level];
        return h('div', { class: `check-item level-${l.cls}${isIgnored ? ' ignored' : ''}` },
            icon(`${l.icon} text-${l.cls} mt-1`),
            h('div', { class: 'flex-grow-1' },
                h('div', {}, i.text),
                i.links.length ? h('div', { class: 'check-links' }, ...i.links.map((ln) => h('span', { class: 'ref-link', dataset: { refEntity: ln.entity, refId: ln.id } }, ln.label))) : null),
            h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: isIgnored ? 'Non ignorare più' : 'Ignora (è voluto)', dataset: { ignore: i.id } },
                icon(isIgnored ? 'fa-eye' : 'fa-eye-slash')));
    }

    tiles.addEventListener('click', (e) => {
        const tile = e.target.closest('.check-tile');
        if (!tile) return;
        const k = tile.dataset.level;
        if (state.levels.has(k)) state.levels.delete(k);
        else state.levels.add(k);
        prefs.setJSON('consistency.levels', [...state.levels]);
        render();
    });
    areaSelect.addEventListener('change', () => { state.area = areaSelect.value; render(); });
    ignoredInput.addEventListener('change', () => { state.showIgnored = ignoredInput.checked; render(); });
    list.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ignore]');
        if (!btn) return;
        const set = ignored();
        if (set.has(btn.dataset.ignore)) set.delete(btn.dataset.ignore);
        else set.add(btn.dataset.ignore);
        prefs.setJSON(ignoredKey(), [...set]);
        render();
    });

    // --- Dati --------------------------------------------------------------------------------------------
    async function load() {
        if (!session.activeCase) {
            state.issues = [];
        } else {
            const lists = await Promise.all(CHECK_ENTITIES.map((e) => resource(e).list({ limit: 1000 })));
            const data = Object.fromEntries(CHECK_ENTITIES.map((e, i) => [e, lists[i].data]));
            state.issues = checkCase(data);
        }
        state.checkedAt = new Date();
        checkedLabel.textContent = `Controllato alle ${state.checkedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        render();
    }

    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 150);
    };
    const keys = [['r', () => load(), 'Ricontrolla la coerenza']];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity }) => { if (CHECK_ENTITIES.includes(entity)) reload(); }, { signal });
    on('case:changed', () => load(), { signal });

    keys.forEach(([combo, handler, description]) => hotkeys.register(combo, handler, description));
    await load();

    return () => {
        controller.abort();
        clearTimeout(timer);
        keys.forEach(([combo, handler]) => hotkeys.unregister(combo, handler));
    };
}
