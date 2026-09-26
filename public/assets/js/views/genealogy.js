/**
 * Vista "Alberi genealogici" (vis-network, layout gerarchico).
 *
 * - Generazioni calcolate dalle filiazioni; i coniugi stanno sulla stessa riga.
 * - Modalità "Verità": mostra anche le paternità segrete (rosso) e segna quelle presunte (grigio tratteggiato).
 *   Modalità "Pubblica": ciò che credono tutti (presunte come vere, niente segreti).
 * - Filtro per casato (campo "Casato / famiglia" dei personaggi).
 * - Trascina per collegare: L genitore → figlio, U unione. Clic su nodo o collegamento → scheda nel pannello.
 * - Schede "Filiazioni" e "Unioni": le tabelle per modificare in blocco.
 *
 * Tastiera: L · U · V (verità/pubblica) · F adatta · Alt+N nuova filiazione.
 */
import { h, icon, on } from '../core/dom.js';
import { graphTheme, linkMode, loadVis } from '../core/graph.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';

const LINEAGE_STYLE = {
    biological: { color: null, dashes: false },
    adoptive: { color: '#4dabf7', dashes: [2, 4], label: 'adottivo' },
    presumed: { color: '#adb5bd', dashes: [6, 4], label: 'presunto' },
    secret: { color: '#e03131', dashes: [6, 4], label: 'segreto', width: 2.5 },
};
const UNION_COLOR = '#fab005';
const ENDED = ['separated', 'divorced', 'annulled'];

/** Generazione di ogni persona: figli sotto i genitori, coniugi sulla stessa riga. */
function computeLevels(ids, parentEdges, unionPairs) {
    const level = new Map(ids.map((id) => [id, 0]));
    const hasParent = new Set(parentEdges.map((e) => e.to));
    const settle = () => {
        for (let i = 0; i < ids.length * 3 + 5; i++) {
            let changed = false;
            for (const { from, to } of parentEdges) {
                if (level.get(to) < level.get(from) + 1) { level.set(to, level.get(from) + 1); changed = true; }
            }
            for (const [a, b] of unionPairs) {
                const max = Math.max(level.get(a), level.get(b));
                if (level.get(a) !== max || level.get(b) !== max) { level.set(a, max); level.set(b, max); changed = true; }
            }
            if (!changed) break;
        }
    };
    settle();
    // Chi non ha genitori scende subito sopra il figlio più alto (evita rami lunghissimi)
    for (const id of ids) {
        if (hasParent.has(id)) continue;
        const childLevels = parentEdges.filter((e) => e.from === id).map((e) => level.get(e.to));
        if (childLevels.length) level.set(id, Math.max(level.get(id), Math.min(...childLevels) - 1));
    }
    settle();
    return level;
}

export async function mount(container, { module }) {
    const { Network, DataSet } = await loadVis();
    const [lineageSchema, unionSchema] = await Promise.all([getSchema('lineages'), getSchema('unions')]);

    const state = {
        truth: prefs.get('genealogy.truth', '1') === '1',
        family: '',
        characters: [],
        lineages: [],
        unions: [],
    };

    // --- Struttura ----------------------------------------------------------------
    const familySelect = h('select', { class: 'form-select form-select-sm family-select', 'aria-label': 'Casato',
        onchange: () => { state.family = familySelect.value; needsFit = true; draw(); } });
    const truthButtons = {
        truth: h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'V', onclick: () => setTruth(true) }, icon('fa-eye', 'me-1'), 'Verità'),
        public: h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'V', onclick: () => setTruth(false) }, icon('fa-users', 'me-1'), 'Versione pubblica'),
    };
    const parentBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary', title: 'Trascina dal genitore al figlio (L)', onclick: () => toggleLink('lineage') },
        icon('fa-arrow-down-long', 'me-1'), 'Genitore → figlio');
    const unionBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary', title: 'Trascina tra i due partner (U)', onclick: () => toggleLink('union') },
        icon('fa-ring', 'me-1'), 'Unione');
    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create('lineages') },
        icon('fa-plus', 'me-1'), 'Nuova filiazione');

    const canvas = h('div', { class: 'graph-canvas' });
    const emptyOverlay = h('div', { class: 'graph-empty', hidden: true });
    const legend = h('div', { class: 'graph-legend' },
        h('span', {}, h('i', { class: 'legend-line', style: 'background:var(--bs-secondary-color)' }), 'Filiazione'),
        h('span', {}, h('i', { class: 'legend-line legend-dashed', style: '--legend-color:#4dabf7' }), 'Adottiva'),
        h('span', { class: 'truth-only' }, h('i', { class: 'legend-line legend-dashed', style: '--legend-color:#adb5bd' }), 'Presunta'),
        h('span', { class: 'truth-only' }, h('i', { class: 'legend-line legend-dashed', style: '--legend-color:#e03131' }), 'Segreta'),
        h('span', {}, h('i', { class: 'legend-line', style: `background:${UNION_COLOR}` }), 'Unione'),
        h('span', {}, h('i', { class: 'legend-line legend-dashed', style: '--legend-color:var(--bs-secondary-color)' }), 'Unione finita'));
    const stage = h('div', { class: 'graph-stage' }, canvas, emptyOverlay, legend);

    const treeView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' },
            h('div', { class: 'd-flex align-items-center gap-2' }, icon('fa-crown', 'text-body-secondary'), familySelect),
            h('div', { class: 'btn-group' }, truthButtons.truth, truthButtons.public),
            h('div', { class: 'd-flex gap-2 ms-auto' }, parentBtn, unionBtn)),
        stage);

    const tabs = viewTabs([
        { id: 'tree', label: 'Albero', icon: 'fa-sitemap', persistent: true, render: (el) => el.append(treeView), onShow: () => network.redraw(), onHide: () => link.stop() },
        { id: 'lineages', label: lineageSchema.label_plural, icon: lineageSchema.icon, render: (el) => mountTable(el, { module: { ...module, entity: 'lineages' }, embedded: true }) },
        { id: 'unions', label: unionSchema.label_plural, icon: unionSchema.icon, render: (el) => mountTable(el, { module: { ...module, entity: 'unions' }, embedded: true }) },
    ], { prefKey: 'genealogy.view', onChange: (id) => { newBtn.hidden = id !== 'tree'; } });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Adatta alla finestra (F)', onclick: () => fit() }, icon('fa-expand')),
            newBtn),
        tabs.body));

    // --- Rete -----------------------------------------------------------------------
    const nodes = new DataSet();
    const edges = new DataSet();
    const network = new Network(canvas, { nodes, edges }, {
        autoResize: true,
        physics: false,
        layout: {
            hierarchical: {
                enabled: true, direction: 'UD', sortMethod: 'directed', shakeTowards: 'roots',
                levelSeparation: 120, nodeSpacing: 190, treeSpacing: 240,
                blockShifting: true, edgeMinimization: true, parentCentralization: true,
            },
        },
        interaction: { hover: true, tooltipDelay: 250, keyboard: false, dragNodes: false },
        nodes: { shape: 'box', margin: { top: 8, bottom: 8, left: 12, right: 12 }, borderWidth: 2, font: { size: 13, face: 'system-ui, sans-serif', multi: 'md' } },
        edges: { font: { size: 10, face: 'system-ui, sans-serif', align: 'middle' }, selectionWidth: 2 },
    });
    const link = linkMode(network, stage, (from, to, kind) => (kind === 'lineage'
        ? create('lineages', { parent_id: from, child_id: to })
        : create('unions', { partner_a: from, partner_b: to })));

    network.on('click', (params) => {
        if (params.nodes.length) panel.open('characters', params.nodes[0]);
        else if (params.edges.length) {
            const [type, id] = String(params.edges[0]).split(':');
            panel.open(type === 'u' ? 'unions' : 'lineages', Number(id));
        }
    });

    // --- Disegno ----------------------------------------------------------------------
    let needsFit = true;

    function visibleLineages() {
        return state.lineages.filter((l) => state.truth || l.kind !== 'secret');
    }

    function visibleUnions() {
        return state.unions.filter((u) => state.truth || !u.secret);
    }

    function draw() {
        const theme = graphTheme();
        const lineages = visibleLineages();
        const unions = visibleUnions();
        const byId = new Map(state.characters.map((c) => [c.id, c]));

        // Chi compare: tutti i personaggi collegati, oppure il casato scelto + parenti diretti
        let ids;
        if (state.family) {
            const core = new Set(state.characters.filter((c) => c.family === state.family).map((c) => c.id));
            ids = new Set(core);
            lineages.forEach((l) => { if (core.has(l.parent_id) || core.has(l.child_id)) { ids.add(l.parent_id); ids.add(l.child_id); } });
            unions.forEach((u) => { if (core.has(u.partner_a) || core.has(u.partner_b)) { ids.add(u.partner_a); ids.add(u.partner_b); } });
        } else {
            ids = new Set([...lineages.flatMap((l) => [l.parent_id, l.child_id]), ...unions.flatMap((u) => [u.partner_a, u.partner_b])]);
        }
        ids = [...ids].filter((id) => byId.has(id));
        const shown = new Set(ids);
        const visL = lineages.filter((l) => shown.has(l.parent_id) && shown.has(l.child_id));
        const visU = unions.filter((u) => shown.has(u.partner_a) && shown.has(u.partner_b));

        const levels = computeLevels(ids, visL.map((l) => ({ from: l.parent_id, to: l.child_id })), visU.map((u) => [u.partner_a, u.partner_b]));

        const nodeData = ids.map((id) => {
            const c = byId.get(id);
            const dead = c.status === 'dead' || Boolean(c.died);
            const years = c.born || c.died ? `\n_${c.born ?? '?'} – ${c.died ?? ''}_` : '';
            return {
                id,
                level: levels.get(id),
                label: `*${c.name}*${years}`,
                title: [c.name, c.family, c.occupation].filter(Boolean).join(' · '),
                color: { background: theme.bg, border: c.color || theme.border, highlight: { background: theme.bg, border: theme.primary }, hover: { background: theme.bg, border: theme.primary } },
                shapeProperties: { borderDashes: dead ? [4, 3] : false },
                font: { color: theme.font },
            };
        });

        const edgeData = [
            ...visL.map((l) => {
                const style = (!state.truth && l.kind === 'presumed') ? LINEAGE_STYLE.biological : LINEAGE_STYLE[l.kind] ?? LINEAGE_STYLE.biological;
                const color = style.color ?? theme.muted;
                return {
                    id: `l:${l.id}`,
                    from: l.parent_id,
                    to: l.child_id,
                    label: state.truth ? style.label : undefined,
                    title: `${lineageSchema.fields.kind.options[l.kind]}${l.note ? ` · ${l.note}` : ''}`,
                    color: { color, highlight: color, hover: color },
                    dashes: state.truth || l.kind === 'adoptive' ? style.dashes : false,
                    width: style.width ?? 1.5,
                    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                    smooth: { enabled: true, type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 },
                    font: { color, strokeWidth: 3, strokeColor: theme.bg },
                };
            }),
            ...visU.map((u) => {
                const ended = ENDED.includes(u.status);
                const color = u.secret || u.kind === 'affair' ? '#e03131' : ended ? theme.muted : UNION_COLOR;
                return {
                    id: `u:${u.id}`,
                    from: u.partner_a,
                    to: u.partner_b,
                    title: [unionSchema.fields.kind.options[u.kind], unionSchema.fields.status.options[u.status], u.moment, u.secret ? 'segreta' : null].filter(Boolean).join(' · '),
                    color: { color, highlight: color, hover: color },
                    dashes: ended || u.secret ? [5, 4] : false,
                    width: 3,
                    arrows: { to: { enabled: false } },
                    smooth: false,
                    font: { color, strokeWidth: 3, strokeColor: theme.bg },
                };
            }),
        ];

        nodes.clear();
        edges.clear();
        nodes.add(nodeData);
        edges.add(edgeData);
        if (needsFit && nodeData.length) {
            network.fit();
            needsFit = false;
        }
        stage.classList.toggle('public-mode', !state.truth);
        showEmpty(nodeData.length);
    }

    function showEmpty(nodeCount) {
        let message = null;
        if (!session.activeCase) message = [h('div', { class: 'fw-semibold mb-2' }, 'Nessun caso aperto'), h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')];
        else if (state.characters.length < 2) message = [h('div', { class: 'fw-semibold mb-1' }, 'Servono almeno due personaggi'), h('div', { class: 'small' }, 'Creali in Personaggi (Alt+2) o con Ctrl+K.')];
        else if (!nodeCount) message = [h('div', { class: 'fw-semibold mb-1' }, 'Nessuna parentela ancora'), h('div', { class: 'small' }, 'Nuova filiazione con Alt+N, oppure trascina: L genitore → figlio, U unione.')];
        emptyOverlay.hidden = !message;
        if (message) emptyOverlay.replaceChildren(...message);
        const disabled = !session.activeCase || state.characters.length < 2;
        parentBtn.disabled = unionBtn.disabled = newBtn.disabled = disabled;
    }

    function fillFamilies() {
        const families = [...new Set(state.characters.map((c) => c.family).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
        if (state.family && !families.includes(state.family)) state.family = '';
        familySelect.replaceChildren(h('option', { value: '' }, 'Tutti i casati'),
            ...families.map((f) => h('option', { value: f, selected: f === state.family }, f)));
        familySelect.disabled = !families.length;
    }

    // --- Azioni ------------------------------------------------------------------------
    function setTruth(truth) {
        state.truth = truth;
        prefs.set('genealogy.truth', truth ? '1' : '0');
        truthButtons.truth.classList.toggle('active', truth);
        truthButtons.public.classList.toggle('active', !truth);
        draw();
    }

    function toggleLink(kind) {
        if (parentBtn.disabled || tabs.current !== 'tree') return;
        if (kind === 'lineage') link.toggle('lineage', parentBtn, 'Trascina dal genitore al figlio');
        else link.toggle('union', unionBtn, 'Trascina da un partner all\'altro');
    }

    function create(entity, defaults = {}) {
        if (!session.activeCase || modal.isOpen()) return;
        panel.create(entity, defaults);
    }

    function fit() {
        network.fit({ animation: { duration: 300 } });
    }

    async function load() {
        if (!session.activeCase) {
            Object.assign(state, { characters: [], lineages: [], unions: [] });
        } else {
            const [chars, lineages, unions] = await Promise.all([
                resource('characters').list({ limit: 1000 }),
                resource('lineages').list({ limit: 1000 }),
                resource('unions').list({ limit: 1000 }),
            ]);
            state.characters = chars.data;
            state.lineages = lineages.data;
            state.unions = unions.data;
        }
        fillFamilies();
        draw();
    }

    const keys = [
        ['alt+n', () => create('lineages'), 'Nuova filiazione'],
        ['l', () => toggleLink('lineage'), 'Collega genitore → figlio (albero)'],
        ['u', () => toggleLink('union'), 'Collega due partner (albero)'],
        ['v', () => setTruth(!state.truth), 'Verità / versione pubblica (albero)'],
        ['f', () => fit(), 'Adatta l\'albero alla finestra'],
        ['escape', () => (link.active ? link.stop() : panel.current && !modal.isOpen() && panel.close()), 'Annulla collegamento / chiudi il pannello'],
    ];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity }) => { if (['characters', 'lineages', 'unions'].includes(entity)) load(); }, { signal });
    on('case:changed', () => { needsFit = true; load(); }, { signal });
    on('theme:changed', () => draw(), { signal });
    on('panel:changed', ({ entity, id }) => {
        if (entity === 'characters' && nodes.get(id)) network.selectNodes([id]);
        else if (entity === 'lineages' && edges.get(`l:${id}`)) network.selectEdges([`l:${id}`]);
        else if (entity === 'unions' && edges.get(`u:${id}`)) network.selectEdges([`u:${id}`]);
        else network.unselectAll();
    }, { signal });

    keys.forEach(([combo, handler, description]) => hotkeys.register(combo, handler, description));
    truthButtons.truth.classList.toggle('active', state.truth);
    truthButtons.public.classList.toggle('active', !state.truth);
    await tabs.start();
    await load();

    return () => {
        controller.abort();
        tabs.destroy();
        network.destroy();
        keys.forEach(([combo, handler]) => hotkeys.unregister(combo, handler));
    };
}
