/**
 * Vista "POV e bugie".
 *
 * - Chi sa cosa: righe = informazioni, colonne = Lettore + personaggi; al capitolo scelto mostra chi lo sa,
 *   chi lo sospetta e chi lo scoprirà più avanti. La colonna del punto di vista del capitolo è evidenziata e
 *   l'ultima colonna segnala ironia drammatica (il lettore sa, il POV no) e "il POV sa, il lettore no" (fair play).
 * - Mappa delle bugie: grafo chi mente → a chi; rosse le bugie in piedi, grigie tratteggiate quelle smascherate.
 * - Capitoli: scaletta con POV e, per ogni capitolo, indizi, rivelazioni, bugie, alibi ed eventi raccontati.
 * - Elenchi completi di informazioni e bugie.
 *
 * Tastiera: Alt+N nuovo (informazione / bugia / capitolo, secondo la scheda) · , e . capitolo precedente/successivo · F adatta il grafo.
 */
import { chapterSlider } from '../core/chapter-slider.js';
import { h, icon, on } from '../core/dom.js';
import { graphTheme, loadVis } from '../core/graph.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';

const ENTITIES = ['facts', 'knowledge', 'lies', 'chapters', 'characters', 'clues', 'alibis', 'events'];
const EVERYONE = -1; // nodo "Tutti / inquirenti" nella mappa delle bugie
const LIE_ACTIVE = '#fa5252';
const LIE_EXPOSED = '#868e96';

export async function mount(container, { module }) {
    const [factSchema, knowSchema, lieSchema, chapterSchema] = await Promise.all(['facts', 'knowledge', 'lies', 'chapters'].map(getSchema));
    const { Network, DataSet } = await loadVis();
    const state = {
        tab: 'matrix', facts: [], knowledge: [], lies: [], chapters: [], characters: [], clues: [], alibis: [], events: [],
        allCharacters: false, showExposed: true,
    };
    const charName = (id) => state.characters.find((c) => c.id === id)?.name ?? `#${id}`;
    const link = (entity, id, text) => h('span', { class: 'ref-link', dataset: { refEntity: entity, refId: id } }, text);
    const short = (text, n = 32) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
    const emptyRow = (content) => h('tbody', {}, h('tr', {}, h('td', { class: 'empty-cell' }, content)));
    const noCase = () => h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso');

    // --- Struttura --------------------------------------------------------------------------------------
    const slider = chapterSlider({ onChange: () => { renderMatrix(); drawLies(); }, emptyText: 'Nessun capitolo indicato' });
    const povLabel = h('span', { class: 'small text-body-secondary' });
    const allSwitch = switchControl('Tutti i personaggi', false, (v) => { state.allCharacters = v; renderMatrix(); });
    const exposedSwitch = switchControl('Bugie smascherate', true, (v) => { state.showExposed = v; drawLies(); });
    const sharedBar = h('div', { class: 'graph-toolbar' }, slider.el, povLabel, h('div', { class: 'ms-auto d-flex gap-3' }, allSwitch, exposedSwitch));

    const matrixTable = h('table', { class: 'table table-sm mb-0 matrix-table know-table' });
    const matrixView = h('div', { class: 'graph-body' }, h('div', { class: 'matrix-wrap' }, matrixTable));

    const canvas = h('div', { class: 'graph-canvas' });
    const liesEmpty = h('div', { class: 'graph-empty', hidden: true });
    const legend = h('div', { class: 'graph-legend' },
        h('span', {}, h('i', { class: 'legend-line', style: `background:${LIE_ACTIVE}` }), 'Bugia in piedi'),
        h('span', {}, h('i', { class: 'legend-line legend-dashed', style: `--legend-color:${LIE_EXPOSED}` }), 'Smascherata'),
        h('span', {}, icon('fa-users', 'me-1'), 'Tutti / inquirenti'));
    const stage = h('div', { class: 'graph-stage' }, canvas, liesEmpty, legend);
    const liesView = h('div', { class: 'graph-body' }, stage);

    const chapterTable = h('table', { class: 'table table-sm mb-0 matrix-table chapter-table' });
    const chaptersView = h('div', { class: 'graph-body' }, h('div', { class: 'matrix-wrap' }, chapterTable));

    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create() });
    const NEW_LABEL = { matrix: 'Nuova informazione', lies: 'Nuova bugia', chapters: 'Nuovo capitolo' };

    const tabs = viewTabs([
        { id: 'matrix', label: 'Chi sa cosa', icon: 'fa-eye', persistent: true, render: (el) => el.append(matrixView) },
        { id: 'lies', label: 'Mappa delle bugie', icon: lieSchema.icon, persistent: true, render: (el) => el.append(liesView), onShow: () => requestAnimationFrame(() => network.fit()) },
        { id: 'chapters', label: chapterSchema.label_plural, icon: chapterSchema.icon, persistent: true, render: (el) => el.append(chaptersView) },
        { id: 'facts', label: factSchema.label_plural, icon: 'fa-list', render: (el) => mountTable(el, { module, embedded: true }) },
        { id: 'lies-list', label: 'Elenco bugie', icon: 'fa-list', render: (el) => mountTable(el, { module: { ...module, entity: 'lies' }, embedded: true }) },
    ], {
        prefKey: 'knowledge.view',
        onChange: (id) => {
            state.tab = id;
            newBtn.hidden = !NEW_LABEL[id];
            newBtn.replaceChildren(icon('fa-plus', 'me-1'), NEW_LABEL[id] ?? '');
            sharedBar.hidden = id !== 'matrix' && id !== 'lies';
            allSwitch.hidden = id !== 'matrix';
            exposedSwitch.hidden = id !== 'lies';
        },
    });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            newBtn),
        sharedBar,
        tabs.body));

    // --- Chi sa cosa -----------------------------------------------------------------------------------
    const chapterRecord = (n) => state.chapters.find((c) => c.number === n) ?? null;
    const knownAt = (k, ch) => k && (k.chapter === null || k.chapter <= ch);

    function renderMatrix() {
        const ch = slider.current;
        const pov = chapterRecord(ch)?.pov_character_id ?? null;
        povLabel.replaceChildren(...(pov ? [icon('fa-video', 'me-1'), 'Punto di vista: ', h('strong', {}, charName(pov))] : []));

        if (!session.activeCase) return matrixTable.replaceChildren(emptyRow(noCase()));
        if (!state.facts.length) {
            return matrixTable.replaceChildren(emptyRow(['Nessuna informazione registrata. ',
                h('a', { href: '#', onclick: (e) => { e.preventDefault(); create(); } }, 'Aggiungi la prima'),
                ' (es. "Livia è la figlia illegittima del conte").']));
        }
        const index = new Map(state.knowledge.map((k) => [`${k.fact_id}:${k.character_id}`, k]));
        const involved = new Set(state.knowledge.map((k) => k.character_id));
        if (pov) involved.add(pov);
        const people = state.characters.filter((c) => state.allCharacters || involved.has(c.id));

        const head = h('thead', {}, h('tr', {},
            h('th', { class: 'matrix-corner' }, factSchema.label_plural),
            h('th', { class: 'text-center reader-col' }, icon('fa-book-open', 'me-1'), 'Lettore'),
            ...people.map((c) => h('th', { class: `matrix-owner${c.id === pov ? ' pov-col' : ''}`, title: c.id === pov ? 'Punto di vista del capitolo' : c.name },
                c.id === pov ? icon('fa-video', 'me-1') : null, link('characters', c.id, c.name))),
            h('th', {}, 'POV e lettore')));

        const rows = state.facts.map((f) => {
            const readerKnows = f.reader_chapter !== null && f.reader_chapter <= ch;
            const povK = pov ? index.get(`${f.id}:${pov}`) : null;
            const povKnows = knownAt(povK, ch) && povK.level === 'knows';
            let irony = null;
            if (pov && readerKnows && !povKnows) irony = h('span', { class: 'text-info', title: 'Il lettore sa qualcosa che il personaggio POV ignora' }, icon('fa-masks-theater', 'me-1'), 'Ironia drammatica');
            else if (pov && povKnows && !readerKnows) irony = h('span', { class: 'text-warning', title: 'Il narratore POV lo sa ma il lettore non ancora: attenzione al fair play' }, icon('fa-circle-exclamation', 'me-1'), 'Il POV sa, il lettore no');

            return h('tr', {},
                h('th', { scope: 'row', class: 'matrix-asset' },
                    link('facts', f.id, f.title),
                    h('div', { class: 'matrix-sub' }, factSchema.fields.category.options[f.category],
                        f.is_true ? '' : h('span', { class: 'text-danger ms-1' }, '· falso'),
                        f.subject_id ? ` · ${charName(f.subject_id)}` : '')),
                readerCell(f, ch),
                ...people.map((c) => knowledgeCell(f, c, index.get(`${f.id}:${c.id}`), ch, c.id === pov)),
                h('td', { class: 'small text-nowrap' }, irony ?? ''));
        });
        matrixTable.replaceChildren(head, h('tbody', {}, ...rows));
    }

    function readerCell(f, ch) {
        const base = { class: 'matrix-cell reader-col', tabindex: 0, dataset: { factId: f.id } };
        if (f.reader_chapter === null) return h('td', { ...base, title: 'Il lettore non lo scopre mai (capitolo non indicato)' }, h('span', { class: 'text-body-tertiary' }, '—'));
        if (f.reader_chapter > ch) return h('td', { ...base, title: `Il lettore lo scopre al capitolo ${f.reader_chapter}` }, h('span', { class: 'know-later' }, `cap. ${f.reader_chapter}`));
        return h('td', { ...base, title: `Il lettore lo sa dal capitolo ${f.reader_chapter}` }, icon('fa-book-open text-success'));
    }

    function knowledgeCell(f, c, k, ch, isPov) {
        const base = { class: `matrix-cell${isPov ? ' pov-col' : ''}`, tabindex: 0, dataset: { factId: f.id, characterId: c.id } };
        if (!k) return h('td', { ...base, title: `${c.name} non lo sa · clic per aggiungere` }, h('span', { class: 'matrix-add' }, icon('fa-plus')));
        const data = { ...base, dataset: { ...base.dataset, knowledgeId: k.id } };
        const tip = [knowSchema.fields.level.options[k.level], knowSchema.fields.how.options[k.how],
            k.source_id ? `da ${charName(k.source_id)}` : null, k.chapter !== null ? `dal cap. ${k.chapter}` : 'da sempre',
            k.hides ? 'lo tiene nascosto' : null, !f.is_true ? 'ma è falso' : null].filter(Boolean).join(' · ');
        if (!knownAt(k, ch)) return h('td', { ...data, title: tip }, h('span', { class: 'know-later' }, `cap. ${k.chapter}`));
        const main = k.level === 'knows'
            ? icon(`fa-eye ${f.is_true ? 'text-primary' : 'text-danger'}`)
            : icon('fa-question text-warning');
        return h('td', { ...data, title: tip }, main, k.hides ? icon('fa-lock ms-1 small text-body-secondary') : null,
            k.chapter === ch ? h('span', { class: 'know-new', title: 'Lo scopre in questo capitolo' }, 'nuovo') : null);
    }

    matrixTable.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return;
        const cell = e.target.closest('.matrix-cell');
        if (!cell) return;
        if (cell.dataset.knowledgeId) panel.open('knowledge', Number(cell.dataset.knowledgeId));
        else if (cell.dataset.characterId) {
            panel.create('knowledge', { fact_id: Number(cell.dataset.factId), character_id: Number(cell.dataset.characterId), chapter: slider.value, how: slider.value === null ? 'always' : 'told' });
        } else panel.open('facts', Number(cell.dataset.factId));
    });
    matrixTable.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.closest('.matrix-cell')) {
            e.preventDefault();
            e.target.click();
        }
    });

    // --- Mappa delle bugie ---------------------------------------------------------------------------------
    const nodes = new DataSet();
    const edges = new DataSet();
    const network = new Network(canvas, { nodes, edges }, {
        autoResize: true,
        interaction: { hover: true, tooltipDelay: 200, keyboard: false },
        physics: { enabled: true, barnesHut: { gravitationalConstant: -5000, springLength: 200, avoidOverlap: 0.4 }, stabilization: { iterations: 300, fit: true } },
        nodes: { shape: 'dot', size: 16, borderWidth: 2, font: { size: 13, face: 'system-ui, sans-serif' } },
        edges: { font: { size: 11, align: 'middle', face: 'system-ui, sans-serif' }, selectionWidth: 2, arrows: { to: { enabled: true, scaleFactor: 0.7 } } },
    });
    network.on('stabilizationIterationsDone', () => { network.setOptions({ physics: { enabled: false } }); network.fit(); });
    network.on('click', (params) => {
        if (params.edges.length && !params.nodes.length) panel.open('lies', Number(params.edges[0]));
        else if (params.nodes.length && params.nodes[0] !== EVERYONE) panel.open('characters', params.nodes[0]);
    });

    function drawLies() {
        const ch = slider.current;
        const theme = graphTheme();
        const told = state.lies.filter((l) => l.told_chapter === null || l.told_chapter <= ch);
        const exposed = (l) => l.exposed_chapter !== null && l.exposed_chapter <= ch;
        const visible = told.filter((l) => state.showExposed || !exposed(l));

        let message = null;
        if (!session.activeCase) message = noCase();
        else if (!state.lies.length) message = [h('p', { class: 'mb-2' }, 'Nessuna bugia registrata.'), h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => createLie() }, icon('fa-plus', 'me-1'), 'Nuova bugia')];
        else if (!visible.length) message = `Nessuna bugia detta entro il capitolo ${ch}.`;
        liesEmpty.replaceChildren(...[message].flat().filter(Boolean));
        liesEmpty.hidden = !message;

        const liars = new Set(visible.filter((l) => !exposed(l)).map((l) => l.liar_id));
        const ids = new Set(visible.flatMap((l) => [l.liar_id, l.told_to_id ?? EVERYONE]));
        const nodeData = [...ids].map((id) => (id === EVERYONE
            ? { id, label: 'Tutti / inquirenti', shape: 'box', color: { background: theme.bg, border: theme.border }, font: { color: theme.font } }
            : {
                id,
                label: charName(id),
                color: { background: state.characters.find((c) => c.id === id)?.color || '#adb5bd', border: liars.has(id) ? LIE_ACTIVE : theme.border, highlight: { border: theme.primary } },
                borderWidth: liars.has(id) ? 3 : 2,
                font: { color: theme.font, strokeWidth: 3, strokeColor: theme.bg },
            }));
        const pairCount = {};
        const edgeData = visible.map((l) => {
            const to = l.told_to_id ?? EVERYONE;
            const n = pairCount[`${l.liar_id}>${to}`] = (pairCount[`${l.liar_id}>${to}`] ?? 0) + 1;
            const out = exposed(l);
            const color = out ? LIE_EXPOSED : LIE_ACTIVE;
            return {
                id: l.id,
                from: l.liar_id,
                to,
                label: short(l.statement),
                title: [`«${l.statement}»`, l.truth ? `Verità: ${l.truth}` : null, l.motive ? `Perché: ${l.motive}` : null,
                    l.told_chapter !== null ? `Detta al cap. ${l.told_chapter}` : null,
                    l.exposed_chapter !== null ? `Smascherata al cap. ${l.exposed_chapter}${l.exposed_by_id ? ` da ${charName(l.exposed_by_id)}` : ''}` : 'Mai smascherata'].filter(Boolean).join('\n'),
                color: { color, highlight: color, hover: color },
                dashes: out ? [6, 5] : false,
                width: out ? 1.5 : 2.5,
                smooth: { enabled: true, type: n % 2 ? 'curvedCW' : 'curvedCCW', roundness: 0.15 * Math.ceil(n / 2) },
                font: { color: theme.font, strokeWidth: 3, strokeColor: theme.bg },
            };
        });
        nodes.update(nodeData);
        nodes.remove(nodes.getIds().filter((id) => !ids.has(id)));
        edges.clear();
        edges.add(edgeData);
    }

    // --- Capitoli (scaletta) -----------------------------------------------------------------------------
    function renderChapters() {
        if (!session.activeCase) return chapterTable.replaceChildren(emptyRow(noCase()));
        const marks = new Map(); // capitolo → [{icon, cls, label, items[]}]
        const mark = (n, key, iconName, cls, label, text) => {
            if (n === null || n === undefined) return;
            const list = marks.get(n) ?? new Map();
            const m = list.get(key) ?? { iconName, cls, label, items: [] };
            m.items.push(text);
            list.set(key, m);
            marks.set(n, list);
        };
        state.events.forEach((e) => mark(e.chapter, 'events', 'fa-timeline', '', 'Eventi raccontati', e.title));
        state.clues.forEach((c) => {
            mark(c.found_chapter, 'clue-found', 'fa-magnifying-glass', '', 'Indizi scoperti', c.title);
            mark(c.revealed_chapter, 'clue-rev', 'fa-lightbulb', 'text-success', 'Indizi svelati', c.title);
        });
        state.facts.forEach((f) => mark(f.reader_chapter, 'fact', 'fa-book-open', 'text-info', 'Il lettore scopre', f.title));
        state.knowledge.forEach((k) => mark(k.chapter, 'know', 'fa-eye', '', 'Personaggi scoprono', `${charName(k.character_id)}: ${state.facts.find((f) => f.id === k.fact_id)?.title ?? ''}`));
        state.lies.forEach((l) => {
            mark(l.told_chapter, 'lie', 'fa-mask', 'text-danger', 'Bugie dette', `${charName(l.liar_id)}: «${short(l.statement, 60)}»`);
            mark(l.exposed_chapter, 'lie-out', 'fa-burst', 'text-success', 'Bugie smascherate', `${charName(l.liar_id)}: «${short(l.statement, 60)}»`);
        });
        state.alibis.forEach((a) => {
            mark(a.given_chapter, 'alibi', 'fa-user-shield', '', 'Alibi dichiarati', `${charName(a.character_id)}: ${short(a.claim, 60)}`);
            mark(a.broken_chapter, 'alibi-out', 'fa-user-shield', 'text-danger', 'Alibi che crollano', `${charName(a.character_id)}: ${short(a.claim, 60)}`);
        });

        const numbers = [...state.chapters.map((c) => c.number), ...marks.keys()];
        if (!numbers.length) {
            return chapterTable.replaceChildren(emptyRow(['Nessun capitolo. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); createChapter(); } }, 'Crea il primo'), '.']));
        }
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const head = h('thead', {}, h('tr', {}, h('th', { class: 'text-end' }, 'Cap.'), h('th', {}, 'Titolo'), h('th', {}, 'Punto di vista'), h('th', {}, 'Stato'), h('th', {}, 'Cosa succede')));
        const rows = [];
        for (let n = min; n <= max; n++) {
            const rec = chapterRecord(n);
            const list = [...(marks.get(n)?.values() ?? [])];
            rows.push(h('tr', { class: `chapter-row${rec ? '' : ' missing'}`, dataset: rec ? { chapterId: rec.id } : { number: n } },
                h('td', { class: 'text-end fw-semibold' }, n),
                h('td', {}, rec ? (rec.title || h('span', { class: 'text-body-tertiary' }, 'senza titolo'))
                    : h('span', { class: 'text-body-tertiary' }, icon('fa-plus', 'me-1'), 'crea la scheda del capitolo'),
                rec?.summary ? h('div', { class: 'matrix-sub' }, short(rec.summary, 120)) : null),
                h('td', {}, rec?.pov_character_id ? link('characters', rec.pov_character_id, charName(rec.pov_character_id)) : h('span', { class: 'text-body-tertiary' }, '—')),
                h('td', {}, rec ? h('span', { class: `badge badge-enum enum-${rec.status}` }, chapterSchema.fields.status.options[rec.status]) : ''),
                h('td', {}, h('div', { class: 'd-flex flex-wrap gap-2' }, ...list.map((m) => h('span', { class: `chapter-mark ${m.cls}`, title: `${m.label}:\n${m.items.join('\n')}` },
                    icon(m.iconName, 'me-1'), h('span', { class: 'd-none d-xl-inline me-1' }, `${m.label}:`), h('strong', {}, m.items.length)))))));
        }
        chapterTable.replaceChildren(head, h('tbody', {}, ...rows));
    }

    chapterTable.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return;
        const row = e.target.closest('.chapter-row');
        if (!row) return;
        if (row.dataset.chapterId) panel.open('chapters', Number(row.dataset.chapterId));
        else createChapter(Number(row.dataset.number));
    });

    // --- Dati e azioni --------------------------------------------------------------------------------------
    const nextChapter = () => (state.chapters.length ? Math.max(...state.chapters.map((c) => c.number)) + 1 : 1);
    function createChapter(number = nextChapter()) {
        if (session.activeCase && !modal.isOpen()) panel.create('chapters', { number });
    }
    function createLie() {
        if (session.activeCase && !modal.isOpen()) panel.create('lies', slider.value !== null ? { told_chapter: slider.value } : {});
    }
    function create() {
        if (!session.activeCase || modal.isOpen()) return;
        if (state.tab === 'lies') createLie();
        else if (state.tab === 'chapters') createChapter();
        else panel.create('facts', slider.value !== null ? { reader_chapter: slider.value } : {});
    }

    function switchControl(label, checked, onChange) {
        const input = h('input', { type: 'checkbox', class: 'form-check-input', role: 'switch', checked, onchange: () => onChange(input.checked) });
        return h('label', { class: 'form-check form-switch mb-0 small' }, input, h('span', { class: 'form-check-label' }, label));
    }

    async function load() {
        if (!session.activeCase) {
            ENTITIES.forEach((e) => { state[e] = []; });
        } else {
            const lists = await Promise.all(ENTITIES.map((e) => resource(e).list({ limit: 1000 })));
            ENTITIES.forEach((e, i) => { state[e] = lists[i].data; });
        }
        const chapters = [
            ...state.chapters.map((c) => c.number), ...state.facts.map((f) => f.reader_chapter), ...state.knowledge.map((k) => k.chapter),
            ...state.lies.flatMap((l) => [l.told_chapter, l.exposed_chapter]),
            ...state.clues.flatMap((c) => [c.found_chapter, c.revealed_chapter]),
            ...state.alibis.flatMap((a) => [a.given_chapter, a.broken_chapter]),
            ...state.events.map((e) => e.chapter),
        ].filter((n) => n !== null && n !== undefined);
        slider.setRange(chapters.length ? Math.max(...chapters) : 0, chapters.length > 0);
        renderMatrix();
        drawLies();
        renderChapters();
    }

    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 50);
    };

    const onTheme = () => drawLies();
    const keys = [
        ['alt+n', () => create(), 'Nuova informazione / bugia / capitolo'],
        [',', () => slider.step(-1), 'Capitolo precedente'],
        ['.', () => slider.step(1), 'Capitolo successivo'],
        ['f', () => { if (state.tab === 'lies') network.fit({ animation: true }); }, 'Mappa delle bugie: adatta'],
    ];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity }) => { if (ENTITIES.includes(entity)) reload(); }, { signal });
    on('case:changed', () => load(), { signal });
    on('theme:changed', onTheme, { signal });

    keys.forEach(([combo, handler, description]) => hotkeys.register(combo, handler, description));
    await tabs.start();
    await load();

    return () => {
        controller.abort();
        clearTimeout(timer);
        tabs.destroy();
        network.destroy();
        keys.forEach(([combo, handler]) => hotkeys.unregister(combo, handler));
    };
}
