/**
 * Vista "Doppia timeline" (vis-timeline, locale).
 *
 * Scheda Timeline, tre modi di leggere gli stessi eventi:
 *   - Verità / Percepito: due righe; ciò che è accaduto davvero e ciò che credono investigatori e lettori.
 *     Nascosti solo nella verità, falsi solo nel percepito, orari "creduti" diversi evidenziati.
 *   - Per personaggio: una riga per personaggio → eventi simultanei, dove si trovava ciascuno.
 *   - Per luogo: una riga per luogo.
 * Conflitti: lo stesso personaggio in due luoghi diversi nello stesso momento (verità).
 * Trascinando un evento (modo Verità/Percepito) si aggiornano i suoi orari; doppio clic crea un evento lì.
 *
 * Scheda Narrazione: capitolo in cui si racconta ogni evento contro il suo ordine cronologico (fabula e intreccio).
 * Scheda Elenco: la tabella generica.
 *
 * Tastiera: Alt+N nuovo evento · F adatta · + e - zoom · R cambia righe.
 */
import { emit, escapeHtml, h, icon, on } from '../core/dom.js';
import { loadTimeline } from '../core/graph.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';

const ROW_MODES = [
    { id: 'truth', label: 'Verità / Percepito', icon: 'fa-eye' },
    { id: 'characters', label: 'Per personaggio', icon: 'fa-user-secret' },
    { id: 'places', label: 'Per luogo', icon: 'fa-location-dot' },
];
const NARRATION_COLORS = { linear: '#6ea8fe', flashback: '#f59f00', testimony: '#b197fc', flashforward: '#20c997', untold: '#868e96' };

// --- Date: "AAAA-MM-GG hh:mm:ss" (database) ↔ Date locale -------------------------------------
const toDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);
const pad = (n) => String(n).padStart(2, '0');
const toDb = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
const fmt = (value) => (value ? toDate(value).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/** Orario "principale" di un evento: la verità, o il creduto per gli eventi falsi. */
function mainTime(e) {
    return e.kind === 'false'
        ? { start: e.perceived_start, end: e.perceived_end }
        : { start: e.real_start, end: e.real_end };
}

/** Personaggi presenti in due luoghi diversi nello stesso momento (solo verità, esclusi i "dichiara di esserci"). */
function findConflicts(events, participants) {
    const byId = new Map(events.map((e) => [e.id, e]));
    const presence = new Map(); // characterId → [{event, start, end}]
    participants.forEach((p) => {
        const e = byId.get(p.event_id);
        if (!e || e.kind === 'false' || p.role === 'claimed' || !e.real_start || !e.place_id) return;
        const start = toDate(e.real_start).getTime();
        const end = e.real_end ? toDate(e.real_end).getTime() : start + 60_000;
        if (!presence.has(p.character_id)) presence.set(p.character_id, []);
        presence.get(p.character_id).push({ event: e, start, end });
    });
    const conflicts = [];
    presence.forEach((list, characterId) => {
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i];
                const b = list[j];
                if (a.event.place_id !== b.event.place_id && a.start < b.end && b.start < a.end) {
                    conflicts.push({ characterId, a: a.event, b: b.event });
                }
            }
        }
    });
    return conflicts;
}

export async function mount(container, { module }) {
    const { Timeline, DataSet } = await loadTimeline();
    const [evSchema, partSchema] = await Promise.all([getSchema('events'), getSchema('event_participants')]);

    const state = {
        rows: prefs.get('timeline.rows', 'truth'),
        events: [],
        participants: [],
        characters: [],
        places: [],
        conflicts: [],
    };

    // --- Struttura --------------------------------------------------------------------
    const rowButtons = ROW_MODES.map((m) => h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', dataset: { mode: m.id }, onclick: () => setRows(m.id) },
        icon(m.icon, 'me-1'), m.label));
    const conflictBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', hidden: true, onclick: () => { conflictList.hidden = !conflictList.hidden; } });
    const conflictList = h('div', { class: 'conflict-list', hidden: true });
    const undatedNote = h('span', { class: 'small text-body-secondary' });
    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create() },
        icon('fa-plus', 'me-1'), 'Nuovo evento');

    const canvas = h('div', { class: 'timeline-canvas' });
    const emptyOverlay = h('div', { class: 'graph-empty', hidden: true });
    const legend = h('div', { class: 'graph-legend' },
        h('span', {}, h('i', { class: 'legend-box ev-fact' }), 'Accaduto e noto'),
        h('span', {}, h('i', { class: 'legend-box ev-hidden' }), 'Nascosto'),
        h('span', {}, h('i', { class: 'legend-box ev-false' }), 'Falso'),
        h('span', {}, h('i', { class: 'legend-box ev-fact ev-divergent' }), 'Orario creduto diverso'),
        h('span', {}, h('i', { class: 'legend-box ev-fact ev-conflict' }), 'Conflitto'));
    const stage = h('div', { class: 'graph-stage timeline-stage' }, canvas, emptyOverlay, legend, conflictList);

    const timelineView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' },
            h('div', { class: 'btn-group', title: 'R' }, ...rowButtons),
            conflictBtn,
            undatedNote,
            h('div', { class: 'd-flex gap-1 ms-auto' },
                h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Riduci (-)', onclick: () => timeline.zoomOut(0.4) }, icon('fa-magnifying-glass-minus')),
                h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Ingrandisci (+)', onclick: () => timeline.zoomIn(0.4) }, icon('fa-magnifying-glass-plus')),
                h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Adatta (F)', onclick: () => fit() }, icon('fa-expand')))),
        stage);

    const narrationView = h('div', { class: 'narration-view' });

    const tabs = viewTabs([
        { id: 'timeline', label: 'Timeline', icon: 'fa-timeline', persistent: true, render: (el) => el.append(timelineView), onShow: () => timeline.redraw() },
        { id: 'narration', label: 'Narrazione', icon: 'fa-book-open', persistent: true, render: (el) => el.append(narrationView), onShow: () => renderNarration() },
        { id: 'list', label: 'Elenco', icon: 'fa-list', render: (el) => mountTable(el, { module, embedded: true }) },
    ], { prefKey: 'timeline.view', onChange: (id) => { newBtn.hidden = id === 'list'; } });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            newBtn),
        tabs.body));

    // --- Timeline ------------------------------------------------------------------------
    const items = new DataSet();
    const groups = new DataSet();
    const timeline = new Timeline(canvas, items, groups, {
        height: '100%',
        stack: true,
        orientation: 'top',
        margin: { item: { horizontal: 4, vertical: 6 } },
        groupOrder: 'order',
        tooltip: { followMouse: true, overflowMethod: 'cap' },
        editable: { updateTime: true, updateGroup: false, add: false, remove: false, overrideItems: false },
        snap: null,
        locale: 'it',
        onMove: (item, callback) => moveItem(item, callback),
    });

    timeline.on('select', ({ items: selected }) => {
        if (selected.length) panel.open('events', eventIdOf(selected[0]));
    });
    timeline.on('doubleClick', (props) => {
        if (props.item || !props.time) return;
        const time = toDb(props.time);
        if (state.rows === 'truth' && props.group === 'perceived') create({ kind: 'false', perceived_start: time });
        else create({ real_start: time });
    });

    const eventIdOf = (itemId) => Number(String(itemId).split(':')[1]);

    /** Contenuto dell'elemento come nodo DOM (le stringhe HTML verrebbero ripulite da vis-timeline). */
    function itemContent(e, extra = null) {
        const place = state.places.find((p) => p.id === e.place_id);
        return h('div', { class: 'ev-content' },
            h('span', { class: 'ev-title' }, e.title),
            extra,
            place ? h('span', { class: 'ev-place' }, icon('fa-location-dot', 'me-1'), place.name) : null);
    }

    function tooltip(e) {
        const lines = [
            `<strong>${escapeHtml(e.title)}</strong>`,
            escapeHtml(evSchema.fields.kind.options[e.kind]),
            e.real_start ? `Verità: ${escapeHtml(fmt(e.real_start))}${e.real_end ? ` → ${escapeHtml(fmt(e.real_end))}` : ''}` : null,
            e.perceived_start ? `Creduto: ${escapeHtml(fmt(e.perceived_start))}${e.perceived_end ? ` → ${escapeHtml(fmt(e.perceived_end))}` : ''}` : null,
            e.chapter !== null ? `Capitolo ${e.chapter}${e.narration ? ` · ${escapeHtml(evSchema.fields.narration.options[e.narration])}` : ''}` : null,
        ];
        return lines.filter(Boolean).join('<br>');
    }

    function itemFor(e, id, group, start, end, extraClass = '', editable = false, extra = null) {
        return {
            id, group,
            start: toDate(start),
            ...(end ? { end: toDate(end), type: 'range' } : { type: 'box' }),
            content: itemContent(e, extra),
            title: tooltip(e),
            className: `ev ev-${e.kind}${extraClass}`,
            // Solo lo spostamento nel tempo: niente pulsante di eliminazione né cambio di riga
            editable: editable ? { updateTime: true, updateGroup: false, remove: false } : false,
        };
    }

    function draw() {
        const conflictEvents = new Set(state.conflicts.flatMap((c) => [c.a.id, c.b.id]));
        const conflictClass = (e) => (conflictEvents.has(e.id) ? ' ev-conflict' : '');
        const data = [];
        let groupData = [];

        if (state.rows === 'truth') {
            groupData = [
                { id: 'real', content: `${icon('fa-eye').outerHTML} Verità`, order: 1, className: 'grp-real' },
                { id: 'perceived', content: `${icon('fa-users').outerHTML} Percepito`, order: 2, className: 'grp-perceived' },
            ];
            state.events.forEach((e) => {
                if (e.kind !== 'false' && e.real_start) {
                    data.push(itemFor(e, `r:${e.id}`, 'real', e.real_start, e.real_end, conflictClass(e), true));
                }
                if (e.kind !== 'hidden') {
                    const own = Boolean(e.perceived_start);
                    const start = own ? e.perceived_start : e.real_start;
                    const end = own ? e.perceived_end : e.real_end;
                    const divergent = e.kind === 'fact' && own && (e.perceived_start !== e.real_start || (e.perceived_end ?? null) !== (e.real_end ?? null));
                    if (start) data.push(itemFor(e, `p:${e.id}`, 'perceived', start, end, divergent ? ' ev-divergent' : '', true));
                }
            });
        } else if (state.rows === 'characters') {
            const byEvent = new Map();
            state.participants.forEach((p) => byEvent.set(p.event_id, [...(byEvent.get(p.event_id) ?? []), p]));
            const used = new Set(state.participants.map((p) => p.character_id));
            groupData = state.characters.filter((c) => used.has(c.id))
                .map((c, i) => ({ id: `c${c.id}`, content: escapeHtml(c.name), order: i }));
            groupData.push({ id: 'none', content: '<span class="text-body-tertiary">Nessun personaggio</span>', order: 9999 });
            state.events.forEach((e) => {
                const { start, end } = mainTime(e);
                if (!start) return;
                const list = byEvent.get(e.id) ?? [];
                if (!list.length) data.push(itemFor(e, `n:${e.id}`, 'none', start, end, conflictClass(e)));
                list.forEach((p) => {
                    const role = p.role !== 'present' ? h('span', { class: 'ev-role' }, partSchema.fields.role.options[p.role]) : null;
                    data.push(itemFor(e, `c:${e.id}:${p.character_id}`, `c${p.character_id}`, start, end,
                        `${conflictClass(e)}${p.role === 'claimed' ? ' ev-claimed' : ''}`, false, role));
                });
            });
        } else {
            const used = new Set(state.events.map((e) => e.place_id).filter(Boolean));
            groupData = state.places.filter((p) => used.has(p.id)).map((p, i) => ({ id: `l${p.id}`, content: escapeHtml(p.name), order: i }));
            groupData.push({ id: 'none', content: '<span class="text-body-tertiary">Luogo non indicato</span>', order: 9999 });
            state.events.forEach((e) => {
                const { start, end } = mainTime(e);
                if (start) data.push(itemFor(e, `l:${e.id}`, e.place_id ? `l${e.place_id}` : 'none', start, end, conflictClass(e)));
            });
        }

        const usedGroups = new Set(data.map((d) => d.group));
        groups.clear();
        groups.add(groupData.filter((g) => state.rows === 'truth' || usedGroups.has(g.id)));
        items.clear();
        items.add(data);

        const undated = state.events.filter((e) => !mainTime(e).start).length;
        undatedNote.textContent = undated ? `${undated} ${undated === 1 ? 'evento' : 'eventi'} senza data (vedi Elenco)` : '';
        rowButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === state.rows));
        renderConflicts();
        showEmpty(data.length);
    }

    function renderConflicts() {
        const n = state.conflicts.length;
        conflictBtn.hidden = !n;
        conflictBtn.replaceChildren(icon('fa-triangle-exclamation', 'me-1'), `${n} ${n === 1 ? 'conflitto' : 'conflitti'}`);
        if (!n) conflictList.hidden = true;
        const name = (id) => state.characters.find((c) => c.id === id)?.name ?? `#${id}`;
        const place = (id) => state.places.find((p) => p.id === id)?.name ?? '?';
        conflictList.replaceChildren(
            h('div', { class: 'fw-semibold mb-2' }, icon('fa-triangle-exclamation', 'me-2 text-danger'), 'Nello stesso momento in due luoghi'),
            ...state.conflicts.map((c) => h('button', { type: 'button', class: 'conflict-item', onclick: () => focusEvents([c.a.id, c.b.id]) },
                h('strong', {}, name(c.characterId)), ': ',
                `${c.a.title} (${place(c.a.place_id)}) e ${c.b.title} (${place(c.b.place_id)})`)));
    }

    function focusEvents(eventIds) {
        const ids = items.getIds().filter((id) => eventIds.includes(eventIdOf(id)));
        if (ids.length) timeline.focus(ids, { animation: { duration: 300 } });
        timeline.setSelection(ids);
    }

    function showEmpty(count) {
        let message = null;
        if (!session.activeCase) message = [h('div', { class: 'fw-semibold mb-2' }, 'Nessun caso aperto'), h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')];
        else if (!count) message = [h('div', { class: 'fw-semibold mb-1' }, 'Nessun evento con data'), h('div', { class: 'small' }, 'Alt+N per un nuovo evento, oppure doppio clic sulla timeline nel punto giusto.')];
        emptyOverlay.hidden = !message;
        if (message) emptyOverlay.replaceChildren(...message);
        newBtn.disabled = !session.activeCase;
    }

    async function moveItem(item, callback) {
        const [line, rawId] = String(item.id).split(':');
        const prefix = line === 'r' ? 'real' : line === 'p' ? 'perceived' : null;
        if (!prefix) return callback(null);
        const data = { [`${prefix}_start`]: toDb(item.start) };
        if (item.end) data[`${prefix}_end`] = toDb(item.end);
        try {
            await resource('events').update(Number(rawId), data);
            callback(item);
        } catch (error) {
            callback(null);
            emit('app:error', { message: error.message });
        }
        return undefined;
    }

    // --- Narrazione: fabula (ordine cronologico) contro intreccio (ordine dei capitoli) -----
    function renderNarration() {
        const dated = state.events.filter((e) => mainTime(e).start)
            .sort((a, b) => toDate(mainTime(a).start) - toDate(mainTime(b).start));
        const rank = new Map(dated.map((e, i) => [e.id, i + 1]));
        const told = state.events.filter((e) => e.chapter !== null && e.narration !== 'untold')
            .sort((a, b) => a.chapter - b.chapter || (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
        const untold = state.events.filter((e) => e.chapter === null || e.narration === 'untold');

        if (!session.activeCase || !told.length) {
            narrationView.replaceChildren(h('div', { class: 'empty-state' }, icon('fa-book-open', 'fa-2x mb-2 text-body-tertiary'),
                h('div', { class: 'fw-semibold' }, 'Nessun evento collocato nei capitoli'),
                h('div', { class: 'small' }, 'Compila "Raccontato nel capitolo" negli eventi per confrontare l\'ordine del racconto con quello dei fatti.')));
            return;
        }

        // Grafico: X = capitolo, Y = posizione cronologica (in alto i fatti più antichi)
        const W = 800;
        const H = 260;
        const M = { l: 44, r: 16, t: 16, b: 34 };
        const chapters = told.map((e) => e.chapter);
        const minCh = Math.min(...chapters);
        const maxCh = Math.max(...chapters);
        const x = (ch) => M.l + (maxCh === minCh ? (W - M.l - M.r) / 2 : ((ch - minCh) / (maxCh - minCh)) * (W - M.l - M.r));
        const y = (r) => M.t + (dated.length <= 1 ? (H - M.t - M.b) / 2 : ((r - 1) / (dated.length - 1)) * (H - M.t - M.b));
        const points = told.filter((e) => rank.has(e.id)).map((e) => ({ e, x: x(e.chapter), y: y(rank.get(e.id)) }));

        const svgNs = 'http://www.w3.org/2000/svg';
        const el = (tag, attrs, ...children) => {
            const node = document.createElementNS(svgNs, tag);
            Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
            children.forEach((c) => node.append(c));
            return node;
        };
        const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'narration-chart', role: 'img', 'aria-label': 'Ordine del racconto e ordine dei fatti' });
        for (let ch = minCh; ch <= maxCh; ch++) {
            svg.append(el('line', { x1: x(ch), x2: x(ch), y1: M.t, y2: H - M.b, class: 'nc-grid' }),
                el('text', { x: x(ch), y: H - M.b + 16, class: 'nc-tick', 'text-anchor': 'middle' }, String(ch)));
        }
        svg.append(el('text', { x: W - M.r, y: H - 4, class: 'nc-axis', 'text-anchor': 'end' }, 'Capitolo →'),
            el('text', { x: 4, y: M.t + 4, class: 'nc-axis' }, 'Prima'),
            el('text', { x: 4, y: H - M.b, class: 'nc-axis' }, 'Dopo'));
        if (points.length > 1) {
            svg.append(el('polyline', { points: points.map((p) => `${p.x},${p.y}`).join(' '), class: 'nc-path' }));
        }
        points.forEach((p) => {
            const dot = el('circle', { cx: p.x, cy: p.y, r: 6, class: 'nc-dot', fill: NARRATION_COLORS[p.e.narration] ?? NARRATION_COLORS.linear },
                el('title', {}, `${p.e.title} · cap. ${p.e.chapter} · ${evSchema.fields.narration.options[p.e.narration] ?? ''}`));
            dot.addEventListener('click', () => panel.open('events', p.e.id));
            svg.append(dot);
        });

        // Tabella: salti indietro nel tempo rispetto a quanto già raccontato
        let maxSeen = 0;
        const rows = told.map((e) => {
            const r = rank.get(e.id);
            const jumpBack = r !== undefined && r < maxSeen;
            if (r !== undefined) maxSeen = Math.max(maxSeen, r);
            return h('tr', { dataset: { id: e.id }, tabindex: 0, onclick: () => panel.open('events', e.id) },
                h('td', { class: 'text-nowrap' }, `Cap. ${e.chapter}`),
                h('td', { class: 'fw-medium' }, e.title),
                h('td', { class: 'text-nowrap' }, fmt(mainTime(e).start)),
                h('td', {}, h('span', { class: 'badge badge-enum', style: `border-color:${NARRATION_COLORS[e.narration] ?? ''}` }, evSchema.fields.narration.options[e.narration] ?? '—')),
                h('td', { class: 'text-nowrap' }, r ? `${r}° di ${dated.length}` : '—',
                    jumpBack ? h('span', { class: 'badge text-bg-warning ms-2', title: 'Racconta un fatto precedente a quelli già narrati' }, icon('fa-rotate-left', 'me-1'), 'salto indietro') : null));
        });

        narrationView.replaceChildren(
            h('div', { class: 'narration-legend small text-body-secondary mb-2' },
                ...Object.entries(evSchema.fields.narration.options).filter(([k]) => k !== 'untold').map(([k, label]) =>
                    h('span', { class: 'me-3' }, h('i', { class: 'legend-dot', style: `background:${NARRATION_COLORS[k]}` }), label))),
            h('div', { class: 'narration-chart-wrap' }, svg),
            h('div', { class: 'table-responsive entity-table-wrap mt-3' },
                h('table', { class: 'table table-sm table-hover align-middle mb-0 entity-table' },
                    h('thead', {}, h('tr', {}, ...['Capitolo', 'Evento', 'Quando', 'Come', 'Ordine dei fatti'].map((t) => h('th', {}, t)))),
                    h('tbody', {}, ...rows))),
            untold.length ? h('div', { class: 'mt-3 small' },
                h('div', { class: 'fw-semibold text-body-secondary mb-1' }, icon('fa-eye-slash', 'me-2'), `Mai raccontati (${untold.length}): la verità che il lettore deve ricostruire`),
                ...untold.map((e) => h('span', { class: 'ref-link me-3', dataset: { refEntity: 'events', refId: e.id } }, e.title))) : null);
    }

    // --- Azioni e dati --------------------------------------------------------------------------
    function setRows(mode) {
        state.rows = mode;
        prefs.set('timeline.rows', mode);
        draw();
        fit();
    }

    function create(defaults = {}) {
        if (!session.activeCase || modal.isOpen()) return;
        panel.create('events', defaults);
    }

    function fit() {
        timeline.fit({ animation: { duration: 300 } });
    }

    let fitted = false;
    async function load() {
        if (!session.activeCase) {
            Object.assign(state, { events: [], participants: [], characters: [], places: [], conflicts: [] });
        } else {
            const [events, parts, chars, places] = await Promise.all([
                resource('events').list({ limit: 1000 }),
                resource('event_participants').list({ limit: 1000 }),
                resource('characters').list({ limit: 1000 }),
                resource('places').list({ limit: 1000 }),
            ]);
            state.events = events.data;
            state.participants = parts.data;
            state.characters = chars.data;
            state.places = places.data;
            state.conflicts = findConflicts(state.events, state.participants);
        }
        draw();
        if (tabs.current === 'narration') renderNarration();
        if (!fitted && items.length) {
            timeline.fit({ animation: false });
            fitted = true;
        }
    }

    const keys = [
        ['alt+n', () => create(), 'Nuovo evento'],
        ['f', () => fit(), 'Adatta la timeline'],
        ['+', () => timeline.zoomIn(0.4), 'Ingrandisci la timeline'],
        ['-', () => timeline.zoomOut(0.4), 'Riduci la timeline'],
        ['r', () => setRows(ROW_MODES[(ROW_MODES.findIndex((m) => m.id === state.rows) + 1) % ROW_MODES.length].id), 'Cambia righe della timeline'],
    ];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity }) => { if (['events', 'event_participants', 'characters', 'places'].includes(entity)) load(); }, { signal });
    on('case:changed', () => { fitted = false; load(); }, { signal });
    on('panel:changed', ({ entity, id }) => {
        // Se l'utente ha già cliccato un elemento di quell'evento, si lascia la sua selezione
        // (così trascinando si sposta solo la riga scelta, verità o percepito)
        if (entity === 'events' && timeline.getSelection().some((itemId) => eventIdOf(itemId) === id)) return;
        timeline.setSelection(entity === 'events' ? items.getIds().filter((itemId) => eventIdOf(itemId) === id) : []);
    }, { signal });

    keys.forEach(([combo, handler, description]) => hotkeys.register(combo, handler, description));
    await tabs.start();
    await load();

    return () => {
        controller.abort();
        tabs.destroy();
        timeline.destroy();
        keys.forEach(([combo, handler]) => hotkeys.unregister(combo, handler));
    };
}
