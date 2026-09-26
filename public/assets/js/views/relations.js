/**
 * Vista "Grafo dei legami" (vis-network, locale).
 *
 * - Nodi = personaggi, archi = legami. Colore dell'arco = stato del legame al capitolo scelto.
 * - Cursore "Stato al capitolo": ricalcola gli stati dalle fasi (relation_phases) senza spostare i nodi.
 * - Filtri per tipo di legame, legami segreti, personaggi isolati.
 * - Clic su nodo/arco → scheda nel pannello laterale. "Collega" → trascina da un personaggio all'altro.
 * - Le posizioni dei nodi trascinati vengono ricordate per ogni caso.
 * - Vista "Elenco": la tabella generica dei legami.
 *
 * Tastiera: L collega · F adatta · Alt+N nuovo legame · , e . capitolo precedente/successivo.
 */
import { loadScript, loadStyle } from '../core/assets.js';
import { h, icon, on } from '../core/dom.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { mount as mountTable } from './entity-table.js';

const SENTIMENT_COLORS = {
    ally: '#2fb344',
    friendly: '#20c997',
    neutral: '#8a94a6',
    tense: '#f59f00',
    enemy: '#e03131',
};

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export async function mount(container, { module }) {
    await Promise.all([
        loadScript('vendor/vis-network/vis-network.min.js'),
        loadStyle('vendor/vis-network/vis-network.min.css'),
    ]);
    const { Network, DataSet } = window.vis;
    const [relSchema, charSchema] = await Promise.all([getSchema('relations'), getSchema('characters')]);
    const typeOptions = relSchema.fields.type.options;
    const sentimentOptions = relSchema.fields.sentiment.options;

    const state = {
        view: prefs.get('relations.view', 'graph'),
        chapter: null,          // null = stato finale
        maxChapter: 0,
        hiddenTypes: new Set(),
        showSecret: true,
        showIsolated: true,
        characters: [],
        relations: [],
        phases: [],
    };

    // --- Struttura della pagina -------------------------------------------------
    const count = h('span', { class: 'badge text-bg-secondary ms-2 fw-normal' });
    const viewButtons = {
        graph: h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: () => setView('graph') }, icon('fa-diagram-project', 'me-1'), 'Grafo'),
        list: h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: () => setView('list') }, icon('fa-list', 'me-1'), 'Elenco'),
    };
    const linkBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary', title: 'Trascina da un personaggio all\'altro (L)', onclick: () => toggleLinkMode() },
        icon('fa-link', 'me-1'), 'Collega');
    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => createRelation() },
        icon('fa-plus', 'me-1'), 'Nuovo legame');

    const slider = h('input', { type: 'range', class: 'form-range chapter-range', min: 0, max: 0, step: 1, value: 0, 'aria-label': 'Capitolo' });
    const sliderLabel = h('span', { class: 'chapter-label' });
    const typeChips = h('div', { class: 'chip-group' }, ...Object.entries(typeOptions).map(([key, label]) =>
        h('button', { type: 'button', class: 'chip active', dataset: { type: key }, onclick: (e) => toggleType(key, e.currentTarget) }, label)));
    const secretSwitch = switchControl('Segreti', true, (v) => { state.showSecret = v; draw(); });
    const isolatedSwitch = switchControl('Isolati', true, (v) => { state.showIsolated = v; draw(); });

    const canvas = h('div', { class: 'graph-canvas' });
    const linkHint = h('div', { class: 'graph-hint', hidden: true }, icon('fa-link', 'me-2'), 'Trascina da un personaggio all\'altro · Esc annulla');
    const emptyOverlay = h('div', { class: 'graph-empty', hidden: true });
    const legend = h('div', { class: 'graph-legend' },
        ...Object.entries(sentimentOptions).map(([key, label]) => h('span', {}, h('i', { class: 'legend-line', style: `background:${SENTIMENT_COLORS[key]}` }), label)),
        h('span', {}, h('i', { class: 'legend-line legend-dashed' }), 'Segreto'),
        h('span', {}, icon('fa-arrow-right-long', 'me-1'), 'Unidirezionale'));

    const graphView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' },
            h('div', { class: 'chapter-control' }, icon('fa-clock-rotate-left', 'text-body-secondary'), slider, sliderLabel),
            typeChips,
            h('div', { class: 'd-flex gap-3 ms-auto' }, secretSwitch.el, isolatedSwitch.el)),
        h('div', { class: 'graph-stage' }, canvas, linkHint, emptyOverlay, legend));
    const listView = h('div', { class: 'graph-list' });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label, count),
            h('div', { class: 'btn-group' }, viewButtons.graph, viewButtons.list),
            h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Adatta alla finestra (F)', onclick: () => fit() }, icon('fa-expand')),
            h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Riorganizza automaticamente', onclick: () => relayout() }, icon('fa-wand-magic-sparkles')),
            linkBtn,
            newBtn),
        graphView,
        listView));

    // --- Rete vis-network ----------------------------------------------------------
    const nodes = new DataSet();
    const edges = new DataSet();
    const network = new Network(canvas, { nodes, edges }, {
        autoResize: true,
        interaction: { hover: true, tooltipDelay: 250, multiselect: false, navigationButtons: false, keyboard: false },
        physics: {
            enabled: true,
            solver: 'barnesHut',
            barnesHut: { gravitationalConstant: -6000, springLength: 160, springConstant: 0.03, avoidOverlap: 0.4 },
            stabilization: { iterations: 400, fit: true },
        },
        nodes: { shape: 'dot', size: 16, borderWidth: 2, font: { size: 13, face: 'system-ui, sans-serif' } },
        edges: { font: { size: 11, align: 'middle', face: 'system-ui, sans-serif' }, selectionWidth: 2, hoverWidth: 1 },
        manipulation: {
            enabled: false,
            addEdge: (data, callback) => {
                callback(null); // l'arco vero arriva dal salvataggio del legame
                setLinkMode(false);
                if (data.from !== data.to) createRelation({ source_id: data.from, target_id: data.to });
            },
        },
    });

    const positionsKey = () => `graph.positions.${session.activeCase?.id ?? 0}`;
    const savedPositions = () => {
        try { return JSON.parse(prefs.get(positionsKey(), '{}')) || {}; } catch { return {}; }
    };
    const savePositions = () => prefs.set(positionsKey(), JSON.stringify(network.getPositions()));

    network.on('stabilizationIterationsDone', () => {
        network.setOptions({ physics: { enabled: false } });
        savePositions();
        network.fit();
    });
    network.on('dragEnd', (params) => { if (params.nodes.length) savePositions(); });
    network.on('click', (params) => {
        if (params.nodes.length) panel.open('characters', params.nodes[0]);
        else if (params.edges.length) panel.open('relations', params.edges[0]);
    });

    // --- Calcolo stati e disegno -----------------------------------------------------
    function sentimentAt(relation, chapter) {
        let current = relation.sentiment;
        for (const phase of state.phases) {
            if (phase.relation_id === relation.id && (chapter === null || phase.chapter <= chapter)) current = phase.sentiment;
        }
        return current; // le fasi arrivano già ordinate per capitolo
    }

    function changedAt(relation, chapter) {
        return chapter !== null && state.phases.some((p) => p.relation_id === relation.id && p.chapter === chapter);
    }

    function visibleRelations() {
        return state.relations.filter((r) => !state.hiddenTypes.has(r.type) && (state.showSecret || !r.secret));
    }

    let needsFit = true; // adatta la vista al primo disegno e dopo il cambio di caso

    function draw() {
        const fontColor = cssVar('--bs-body-color');
        const bg = cssVar('--bs-body-bg');
        const rels = visibleRelations();
        const linked = new Set(rels.flatMap((r) => [r.source_id, r.target_id]));
        const positions = savedPositions();

        const nodeData = state.characters
            .filter((c) => state.showIsolated || linked.has(c.id))
            .map((c) => {
                const saved = positions[c.id];
                const dead = c.status === 'dead';
                return {
                    id: c.id,
                    label: c.name,
                    title: [c.name, charSchema.fields.role.options[c.role], charSchema.fields.status.options[c.status]].filter(Boolean).join(' · '),
                    color: { background: c.color || '#adb5bd', border: dead ? '#e03131' : cssVar('--bs-border-color'), highlight: { background: c.color || '#adb5bd', border: cssVar('--bs-primary') } },
                    shapeProperties: { borderDashes: dead ? [4, 3] : false },
                    opacity: dead ? 0.65 : 1,
                    font: { color: fontColor, strokeWidth: 3, strokeColor: bg },
                    ...(saved ? { x: saved.x, y: saved.y, physics: false } : { physics: true }),
                };
            });

        // Più legami tra la stessa coppia: curve con raggi diversi per non sovrapporli
        const pairCount = {};
        const edgeData = rels.map((r) => {
            const pair = [r.source_id, r.target_id].sort().join('-');
            const n = pairCount[pair] = (pairCount[pair] ?? 0) + 1;
            const sentiment = sentimentAt(r, state.chapter);
            const color = SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;
            const changed = changedAt(r, state.chapter);
            return {
                id: r.id,
                from: r.source_id,
                to: r.target_id,
                label: r.label,
                title: `${typeOptions[r.type] ?? r.type} · ${sentimentOptions[sentiment] ?? sentiment}${r.secret ? ' · segreto' : ''}`,
                color: { color, highlight: color, hover: color },
                width: 1 + (r.intensity ?? 3) * 0.7 + (changed ? 2 : 0),
                dashes: r.secret ? [6, 5] : false,
                arrows: r.directed ? { to: { enabled: true, scaleFactor: 0.7 } } : { to: { enabled: false } },
                shadow: changed ? { enabled: true, color, size: 12, x: 0, y: 0 } : false,
                smooth: { enabled: true, type: n % 2 ? 'curvedCW' : 'curvedCCW', roundness: 0.12 * Math.ceil(n / 2) },
                font: { color: fontColor, strokeWidth: 3, strokeColor: bg },
            };
        });

        nodes.update(nodeData);
        nodes.remove(nodes.getIds().filter((id) => !nodeData.some((n) => n.id === id)));
        edges.clear();
        edges.add(edgeData);

        if (nodeData.some((n) => n.physics)) {
            network.setOptions({ physics: { enabled: true } });
            network.stabilize(200); // al termine: fisica spenta, posizioni salvate, vista adattata
        } else if (needsFit && nodeData.length) {
            network.fit();
        }
        if (nodeData.length) needsFit = false;

        count.textContent = String(rels.length);
        updateSliderLabel();
        showEmpty();
    }

    function showEmpty() {
        let message = null;
        if (!session.activeCase) message = [h('div', { class: 'fw-semibold mb-2' }, 'Nessun caso aperto'), h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')];
        else if (state.characters.length < 2) message = [h('div', { class: 'fw-semibold mb-1' }, 'Servono almeno due personaggi'), h('div', { class: 'small' }, 'Creali in Personaggi (Alt+2) o con Ctrl+K.')];
        else if (!state.relations.length) message = [h('div', { class: 'fw-semibold mb-1' }, 'Nessun legame ancora'), h('div', { class: 'small' }, 'Premi L e trascina da un personaggio all\'altro, oppure Alt+N.')];
        emptyOverlay.hidden = !message;
        if (message) emptyOverlay.replaceChildren(...message);
        linkBtn.disabled = newBtn.disabled = !session.activeCase || state.characters.length < 2;
    }

    // --- Cursore capitolo -----------------------------------------------------------
    function updateSlider() {
        state.maxChapter = state.phases.reduce((max, p) => Math.max(max, p.chapter), 0);
        slider.max = String(state.maxChapter);
        slider.disabled = state.maxChapter === 0 && !state.phases.length;
        if (state.chapter !== null && state.chapter > state.maxChapter) state.chapter = null;
        slider.value = String(state.chapter ?? state.maxChapter);
    }

    function updateSliderLabel() {
        if (!state.phases.length) {
            sliderLabel.textContent = 'Nessuna evoluzione: aggiungi fasi a un legame';
            return;
        }
        const ch = state.chapter ?? state.maxChapter;
        sliderLabel.replaceChildren('Stato al capitolo ', h('strong', {}, String(ch)),
            ...(ch === state.maxChapter ? [h('span', { class: 'text-body-tertiary ms-1' }, '(finale)')] : []));
    }

    function setChapter(value) {
        const ch = Math.max(0, Math.min(state.maxChapter, value));
        state.chapter = ch === state.maxChapter ? null : ch;
        slider.value = String(ch);
        draw();
    }
    slider.addEventListener('input', () => setChapter(Number(slider.value)));

    // --- Filtri e modalità ------------------------------------------------------------
    function toggleType(type, chip) {
        if (state.hiddenTypes.has(type)) state.hiddenTypes.delete(type);
        else state.hiddenTypes.add(type);
        chip.classList.toggle('active', !state.hiddenTypes.has(type));
        draw();
    }

    let linkMode = false;
    function setLinkMode(active) {
        linkMode = active;
        linkHint.hidden = !active;
        linkBtn.classList.toggle('active', active);
        if (active) network.addEdgeMode();
        else network.disableEditMode();
    }
    function toggleLinkMode() {
        if (!linkBtn.disabled && state.view === 'graph') setLinkMode(!linkMode);
    }
    canvas.addEventListener('keydown', (e) => { if (e.key === 'Escape' && linkMode) setLinkMode(false); });

    function createRelation(defaults = {}) {
        if (!session.activeCase || modal.isOpen()) return;
        panel.create('relations', defaults);
    }

    function fit() {
        network.fit({ animation: { duration: 300 } });
    }

    function relayout() {
        prefs.set(positionsKey(), '{}');
        nodes.clear();
        draw();
    }

    let tableCleanup = null;
    async function setView(view) {
        state.view = view;
        prefs.set('relations.view', view);
        viewButtons.graph.classList.toggle('active', view === 'graph');
        viewButtons.list.classList.toggle('active', view === 'list');
        graphView.hidden = view !== 'graph';
        listView.hidden = view !== 'list';
        linkBtn.hidden = view !== 'graph';
        if (linkMode) setLinkMode(false);

        if (view === 'list' && !tableCleanup) {
            listView.replaceChildren();
            tableCleanup = await mountTable(listView, { module: { ...module, label: relSchema.label_plural } });
            listView.querySelector('.page-header')?.remove(); // l'intestazione è già quella del grafo
        } else if (view === 'graph') {
            tableCleanup?.();
            tableCleanup = null;
            network.redraw();
        }
    }

    // --- Dati -----------------------------------------------------------------------
    async function load() {
        if (!session.activeCase) {
            Object.assign(state, { characters: [], relations: [], phases: [] });
            nodes.clear();
            edges.clear();
            updateSlider();
            draw();
            return;
        }
        const [chars, rels, phases] = await Promise.all([
            resource('characters').list({ limit: 1000 }),
            resource('relations').list({ limit: 1000 }),
            resource('relation_phases').list({ limit: 1000, sort: 'chapter', dir: 'asc' }),
        ]);
        state.characters = chars.data;
        state.relations = rels.data;
        state.phases = phases.data;
        updateSlider();
        draw();
    }

    function switchControl(label, checked, onChange) {
        const input = h('input', { type: 'checkbox', class: 'form-check-input', role: 'switch', checked, onchange: () => onChange(input.checked) });
        return { el: h('label', { class: 'form-check form-switch mb-0 small' }, input, h('span', { class: 'form-check-label' }, label)) };
    }

    const keys = [
        ['alt+n', () => createRelation(), 'Nuovo legame'],
        ['l', () => toggleLinkMode(), 'Collega due personaggi (grafo)'],
        ['f', () => fit(), 'Adatta il grafo alla finestra'],
        [',', () => setChapter((state.chapter ?? state.maxChapter) - 1), 'Capitolo precedente (grafo)'],
        ['.', () => setChapter((state.chapter ?? state.maxChapter) + 1), 'Capitolo successivo (grafo)'],
        ['escape', () => (linkMode ? setLinkMode(false) : panel.current && !modal.isOpen() && panel.close()), 'Annulla collegamento / chiudi il pannello'],
    ];

    // --- Eventi ------------------------------------------------------------------------
    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity }) => { if (['characters', 'relations', 'relation_phases'].includes(entity)) load(); }, { signal });
    on('case:changed', () => { nodes.clear(); needsFit = true; load(); }, { signal });
    on('theme:changed', () => draw(), { signal });
    on('panel:changed', ({ entity, id }) => {
        if (entity === 'characters' && nodes.get(id)) network.selectNodes([id]);
        else if (entity === 'relations' && edges.get(id)) network.selectEdges([id]);
        else network.unselectAll();
    }, { signal });

    keys.forEach(([combo, handler, description]) => hotkeys.register(combo, handler, description));
    await setView(state.view);
    await load();

    return () => {
        controller.abort();
        tableCleanup?.();
        network.destroy();
        keys.forEach(([combo, handler]) => hotkeys.unregister(combo, handler));
    };
}
