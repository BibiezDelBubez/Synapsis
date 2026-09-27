/**
 * Vista "Percorsi e planimetrie".
 *
 * Schede:
 * - Planimetrie: immagini con segnaposto (vedi space-maps.js).
 * - Percorrenze: calcolatore "da → a, partenza → arrivo" e matrice dei tempi tra i luoghi
 *   (in grassetto i percorsi registrati, in corsivo quelli calcolati passando per altri luoghi).
 * - Spostamenti: per ogni personaggio, gli spostamenti tra eventi consecutivi della timeline (orari verità)
 *   confrontati con i tempi di percorrenza → impossibile / al limite / percorso sconosciuto / possibile.
 * - Percorsi: elenco completo.
 *
 * Tastiera: Alt+N nuovo (planimetria o percorso, secondo la scheda) · P segnaposto · F adatta · + − zoom.
 */
import { h, icon, on } from '../core/dom.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';
import { mapViewer } from './space-maps.js';
import { formatMinutes, movementChecks, parseDateTime, travelNetwork } from './space-routes.js';

const ENTITIES = ['places', 'routes', 'maps', 'map_pins', 'events', 'event_participants', 'characters'];

const STATUS = {
    impossible: { label: 'Impossibile', icon: 'fa-ban', cls: 'text-danger' },
    tight: { label: 'Al limite', icon: 'fa-stopwatch', cls: 'text-warning' },
    unknown: { label: 'Percorso sconosciuto', icon: 'fa-circle-question', cls: 'text-info' },
    ok: { label: 'Possibile', icon: 'fa-check', cls: 'text-success' },
};

const timeFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export async function mount(container, { module }) {
    const [routeSchema, mapSchema, pinSchema] = await Promise.all([getSchema('routes'), getSchema('maps'), getSchema('map_pins')]);
    const modes = routeSchema.fields.mode.options;
    const state = {
        tab: 'maps', places: [], routes: [], maps: [], pins: [], events: [], participants: [], characters: [],
        mode: prefs.get('space.mode', ''), allPlaces: false, onlyProblems: true, network: null,
    };
    const placeName = (id) => state.places.find((p) => p.id === id)?.name ?? `#${id}`;
    const placeLink = (id) => h('span', { class: 'ref-link', dataset: { refEntity: 'places', refId: id } }, placeName(id));

    // --- Struttura ---------------------------------------------------------------------------
    const viewer = mapViewer({ pinSchema });

    const modeSelects = [];
    const modeSelect = () => {
        const sel = h('select', { class: 'form-select form-select-sm', style: 'width:auto', 'aria-label': 'Mezzo',
            onchange: () => { state.mode = sel.value; prefs.set('space.mode', state.mode); compute(); } },
        h('option', { value: '' }, 'Mezzo più veloce'),
        ...Object.entries(modes).map(([k, label]) => h('option', { value: k }, label)));
        sel.value = state.mode;
        modeSelects.push(sel);
        return sel;
    };

    // Calcolatore
    const calcFrom = h('select', { class: 'form-select form-select-sm', 'aria-label': 'Da' });
    const calcTo = h('select', { class: 'form-select form-select-sm', 'aria-label': 'A' });
    const calcStart = h('input', { type: 'datetime-local', class: 'form-control form-control-sm', 'aria-label': 'Partenza' });
    const calcResult = h('div', { class: 'calc-result small' });
    [calcFrom, calcTo, calcStart].forEach((el) => el.addEventListener('change', () => renderCalc()));
    const swapBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'Inverti',
        onclick: () => { [calcFrom.value, calcTo.value] = [calcTo.value, calcFrom.value]; renderCalc(); } }, icon('fa-right-left'));
    const calculator = h('div', { class: 'calc-box' },
        h('div', { class: 'd-flex flex-wrap align-items-center gap-2' },
            h('strong', { class: 'small me-1' }, icon('fa-calculator', 'me-1'), 'Calcola'),
            calcFrom, swapBtn, calcTo,
            h('span', { class: 'small text-body-secondary' }, 'partenza'), calcStart),
        calcResult);

    const allSwitch = switchControl('Tutti i luoghi', false, (v) => { state.allPlaces = v; renderMatrix(); });
    const matrixTable = h('table', { class: 'table table-sm mb-0 matrix-table travel-matrix' });
    const matrixView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' }, modeSelect(),
            h('span', { class: 'small text-body-secondary' }, h('b', {}, '12 min'), ' = percorso registrato · ', h('i', {}, '20 min'), ' = calcolato passando per altri luoghi'),
            h('div', { class: 'ms-auto' }, allSwitch)),
        calculator,
        h('div', { class: 'matrix-wrap' }, matrixTable));

    const problemsSwitch = switchControl('Solo da controllare', true, (v) => { state.onlyProblems = v; renderMoves(); });
    const movesSummary = h('div', { class: 'd-flex flex-wrap gap-3 small' });
    const movesTable = h('table', { class: 'table table-sm mb-0 matrix-table moves-table' });
    const movesView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' }, modeSelect(), movesSummary, h('div', { class: 'ms-auto' }, problemsSwitch)),
        h('div', { class: 'matrix-wrap' }, movesTable));

    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create() });

    const tabs = viewTabs([
        { id: 'maps', label: mapSchema.label_plural, icon: mapSchema.icon, persistent: true, render: (el) => el.append(viewer.el) },
        { id: 'matrix', label: 'Percorrenze', icon: 'fa-table-cells', persistent: true, render: (el) => el.append(matrixView) },
        { id: 'moves', label: 'Spostamenti', icon: 'fa-person-walking-arrow-right', persistent: true, render: (el) => el.append(movesView) },
        { id: 'list', label: routeSchema.label_plural, icon: routeSchema.icon, render: (el) => mountTable(el, { module, embedded: true }) },
    ], {
        prefKey: 'space.view',
        onChange: (id) => {
            state.tab = id;
            newBtn.hidden = id === 'list';
            newBtn.replaceChildren(icon('fa-plus', 'me-1'), id === 'maps' ? 'Nuova planimetria' : 'Nuovo percorso');
            if (id === 'maps') requestAnimationFrame(() => viewer.fit());
        },
    });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            newBtn),
        tabs.body));

    // --- Calcoli --------------------------------------------------------------------------------
    function compute() {
        modeSelects.forEach((s) => { s.value = state.mode; });
        state.network = travelNetwork(state.places, state.routes, state.mode);
        renderMatrix();
        renderCalc();
        renderMoves();
    }

    const emptyRow = (content) => h('tbody', {}, h('tr', {}, h('td', { class: 'empty-cell' }, content)));
    const noCase = () => h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso');

    // --- Matrice dei tempi ---------------------------------------------------------------------
    function renderMatrix() {
        if (!session.activeCase) return matrixTable.replaceChildren(emptyRow(noCase()));
        const used = new Set(state.routes.flatMap((r) => [r.from_place_id, r.to_place_id]));
        const places = state.places.filter((p) => state.allPlaces || used.has(p.id));
        if (places.length < 2) {
            return matrixTable.replaceChildren(emptyRow(state.places.length < 2
                ? 'Servono almeno due luoghi (Alt+3).'
                : ['Nessun percorso registrato. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); create(); } }, 'Aggiungi il primo'), ' oppure attiva «Tutti i luoghi» e clicca su una cella.']));
        }
        const head = h('thead', {}, h('tr', {},
            h('th', { class: 'matrix-corner' }, 'Da ↓ · A →'),
            ...places.map((p) => h('th', { class: 'matrix-owner', title: p.name }, placeLink(p.id)))));
        const rows = places.map((a) => h('tr', {},
            h('th', { scope: 'row', class: 'matrix-asset' }, placeLink(a.id)),
            ...places.map((b) => travelCell(a, b))));
        matrixTable.replaceChildren(head, h('tbody', {}, ...rows));
    }

    function travelCell(a, b) {
        if (a.id === b.id) return h('td', { class: 'matrix-diag' });
        const base = { class: 'matrix-cell', tabindex: 0, dataset: { from: a.id, to: b.id } };
        const direct = state.network.directRoute(a.id, b.id);
        const best = state.network.best(a.id, b.id);
        if (!best) {
            return h('td', { ...base, title: `Aggiungi percorso ${a.name} → ${b.name}` }, h('span', { class: 'matrix-add' }, icon('fa-plus')));
        }
        const via = best.path.length > 2 ? `\nPassando per: ${best.path.slice(1, -1).map(placeName).join(', ')}` : '';
        const inherited = best.from !== a.id || best.to !== b.id ? `\nCalcolato da: ${placeName(best.from)} → ${placeName(best.to)}` : '';
        if (direct && direct.minutes === best.minutes) {
            return h('td', { ...base, dataset: { ...base.dataset, routeId: direct.id }, title: `${modes[direct.mode]}${direct.note ? `\n${direct.note}` : ''}` },
                h('b', {}, formatMinutes(direct.minutes)));
        }
        return h('td', { ...base, title: `Tempo calcolato${via}${inherited}\nClic: registra un percorso diretto` },
            h('i', { class: 'text-body-secondary' }, formatMinutes(best.minutes)));
    }

    matrixTable.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return;
        const cell = e.target.closest('.matrix-cell');
        if (!cell) return;
        if (cell.dataset.routeId) panel.open('routes', Number(cell.dataset.routeId));
        else create({ from_place_id: Number(cell.dataset.from), to_place_id: Number(cell.dataset.to) });
    });
    matrixTable.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.closest('.matrix-cell')) {
            e.preventDefault();
            e.target.click();
        }
    });

    // --- Calcolatore -------------------------------------------------------------------------------
    function fillPlaceSelect(select, placeholder) {
        const value = select.value;
        select.replaceChildren(h('option', { value: '' }, placeholder),
            ...state.places.map((p) => h('option', { value: p.id }, p.name)));
        select.value = state.places.some((p) => String(p.id) === value) ? value : '';
    }

    function renderCalc() {
        const from = Number(calcFrom.value);
        const to = Number(calcTo.value);
        if (!from || !to) return calcResult.replaceChildren(h('span', { class: 'text-body-tertiary' }, 'Scegli partenza e arrivo.'));
        const best = state.network.best(from, to);
        if (!best) {
            return calcResult.replaceChildren(h('span', { class: 'text-info' }, icon('fa-circle-question', 'me-1'),
                'Nessun percorso conosciuto', state.mode ? ` con: ${modes[state.mode].toLowerCase()}` : '', '. '),
            h('a', { href: '#', onclick: (e) => { e.preventDefault(); create({ from_place_id: from, to_place_id: to }); } }, 'Registralo'));
        }
        const legs = [];
        for (let k = 1; k < best.path.length; k++) {
            const r = state.network.directRoute(best.path[k - 1], best.path[k]);
            legs.push(h('li', {}, placeName(best.path[k - 1]), ' → ', placeName(best.path[k]), ': ',
                formatMinutes(r?.minutes), r ? ` (${modes[r.mode].toLowerCase()})` : ''));
        }
        const start = parseDateTime(calcStart.value);
        const arrival = start ? new Date(start.getTime() + best.minutes * 60000) : null;
        calcResult.replaceChildren(
            h('div', {}, h('b', {}, formatMinutes(best.minutes)),
                arrival ? [' · arrivo ', h('b', {}, timeFmt.format(arrival))] : null,
                best.from !== from || best.to !== to
                    ? h('span', { class: 'text-body-secondary' }, ` · calcolato da ${placeName(best.from)} → ${placeName(best.to)}`) : null),
            legs.length > 1 ? h('ol', { class: 'mb-0 mt-1 ps-3' }, ...legs) : '');
    }

    // --- Controllo spostamenti ---------------------------------------------------------------------
    function renderMoves() {
        if (!session.activeCase) {
            movesSummary.replaceChildren();
            return movesTable.replaceChildren(emptyRow(noCase()));
        }
        const checks = movementChecks(state.events, state.participants, state.characters, state.network);
        const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, checks.filter((c) => c.status === k).length]));
        movesSummary.replaceChildren(...Object.entries(STATUS).map(([k, s]) =>
            h('span', { class: counts[k] ? s.cls : 'text-body-tertiary' }, icon(s.icon, 'me-1'), `${s.label}: ${counts[k]}`)));

        const shown = checks.filter((c) => !state.onlyProblems || c.status !== 'ok');
        if (!shown.length) {
            return movesTable.replaceChildren(emptyRow(checks.length
                ? 'Tutti gli spostamenti sono compatibili con i tempi di percorrenza.'
                : 'Nessuno spostamento da controllare: servono eventi con orario verità, luogo e partecipanti (Timeline, Alt+6).'));
        }
        const charName = (id) => state.characters.find((c) => c.id === id)?.name ?? `#${id}`;
        const head = h('thead', {}, h('tr', {},
            h('th', {}, 'Personaggio'), h('th', {}, 'Da'), h('th', {}, 'A'),
            h('th', { class: 'text-end' }, 'Tempo a disposizione'), h('th', { class: 'text-end' }, 'Tempo necessario'), h('th', {}, 'Esito')));
        const rows = shown.map((c) => {
            const s = STATUS[c.status];
            const endpoint = (p) => h('div', {},
                h('span', { class: 'ref-link', dataset: { refEntity: 'events', refId: p.event.id } }, p.event.title),
                h('div', { class: 'matrix-sub' }, placeName(p.placeId), ' · ', timeFmt.format(p.time)));
            return h('tr', { class: `move-${c.status}` },
                h('td', {}, h('span', { class: 'ref-link', dataset: { refEntity: 'characters', refId: c.characterId } }, charName(c.characterId)),
                    c.claimed ? h('div', { class: 'matrix-sub', title: 'Almeno una delle due presenze è solo dichiarata' }, icon('fa-comment-dots', 'me-1'), 'dichiarato') : null),
                h('td', {}, endpoint(c.from)),
                h('td', {}, endpoint(c.to)),
                h('td', { class: 'text-end text-nowrap' }, c.gap < 0 ? h('span', { class: 'text-danger' }, 'si sovrappongono') : formatMinutes(c.gap)),
                h('td', { class: 'text-end text-nowrap', title: c.path.length > 2 ? `Passando per: ${c.path.slice(1, -1).map(placeName).join(', ')}` : '' }, formatMinutes(c.need)),
                h('td', { class: `text-nowrap ${s.cls}` }, icon(s.icon, 'me-1'), s.label,
                    c.status === 'unknown'
                        ? h('button', { type: 'button', class: 'btn btn-link btn-sm p-0 ms-2 align-baseline',
                            onclick: () => create({ from_place_id: c.from.placeId, to_place_id: c.to.placeId }) }, 'aggiungi percorso')
                        : null));
        });
        movesTable.replaceChildren(head, h('tbody', {}, ...rows));
    }

    // --- Dati e azioni ---------------------------------------------------------------------------------
    function create(defaults = {}) {
        if (!session.activeCase || modal.isOpen()) return;
        if (state.tab === 'maps') viewer.createMap();
        else panel.create('routes', { mode: state.mode || 'walk', ...defaults });
    }

    let focusMap = null;
    async function load() {
        if (!session.activeCase) {
            Object.assign(state, { places: [], routes: [], maps: [], pins: [], events: [], participants: [], characters: [] });
        } else {
            const lists = await Promise.all(ENTITIES.map((e) => resource(e).list({ limit: 1000 })));
            [state.places, state.routes, state.maps, state.pins, state.events, state.participants, state.characters] = lists.map((l) => l.data);
        }
        fillPlaceSelect(calcFrom, 'Da…');
        fillPlaceSelect(calcTo, 'A…');
        viewer.setData({ maps: state.maps, pins: state.pins }, focusMap);
        focusMap = null;
        compute();
    }

    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 50);
    };

    function switchControl(label, checked, onChange) {
        const input = h('input', { type: 'checkbox', class: 'form-check-input', role: 'switch', checked, onchange: () => onChange(input.checked) });
        return h('label', { class: 'form-check form-switch mb-0 small' }, input, h('span', { class: 'form-check-label' }, label));
    }

    const onMapTab = (fn) => () => { if (state.tab === 'maps' && !modal.isOpen()) fn(); };
    const keys = [
        ['alt+n', () => create(), 'Nuova planimetria / nuovo percorso'],
        ['p', onMapTab(() => viewer.toggleAdd()), 'Planimetria: aggiungi segnaposto'],
        ['f', onMapTab(() => viewer.fit()), 'Planimetria: adatta alla finestra'],
        ['+', onMapTab(() => viewer.zoom(1.25)), 'Planimetria: ingrandisci'],
        ['-', onMapTab(() => viewer.zoom(0.8)), 'Planimetria: riduci'],
    ];
    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity, action, record }) => {
        if (!ENTITIES.includes(entity)) return;
        if (entity === 'maps' && action === 'create') focusMap = record?.id ?? null;
        reload();
    }, { signal });
    on('case:changed', () => load(), { signal });
    on('panel:changed', () => viewer.refreshSelection(), { signal });
    // Esc annulla la modalità "aggiungi segnaposto" prima di arrivare alle altre scorciatoie (es. chiudi pannello)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && viewer.cancelAdd()) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { capture: true, signal });

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
