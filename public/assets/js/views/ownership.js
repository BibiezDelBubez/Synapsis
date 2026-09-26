/**
 * Vista "Matrice proprietà": chi possiede cosa, in che quota, capitolo per capitolo.
 *
 * - Righe = asset, colonne = personaggi. Cella = quota posseduta al capitolo scelto.
 * - Colonna "Quote": somma delle quote dell'asset (avviso se non fa 100%).
 * - Riga "Valore posseduto": patrimonio di ciascun personaggio (valore × quota) → utile per i moventi.
 * - Clic su una cella: apre la proprietà, oppure ne crea una già compilata (personaggio + asset).
 * - Schede "Proprietà" e "Testamenti" (con i lasciti nel pannello).
 *
 * Tastiera: Alt+N nuova proprietà · , e . capitolo precedente/successivo.
 */
import { chapterSlider } from '../core/chapter-slider.js';
import { h, icon, on } from '../core/dom.js';
import { formatValue } from '../core/format.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';

const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** Una proprietà è in vigore al capitolo ch se è iniziata e non ancora finita. */
const activeAt = (o, ch) => (o.from_chapter === null || o.from_chapter <= ch) && (o.to_chapter === null || o.to_chapter > ch);

export async function mount(container, { module }) {
    const [ownSchema, assetSchema, willSchema] = await Promise.all([getSchema('ownerships'), getSchema('assets'), getSchema('wills')]);
    const state = { assets: [], characters: [], ownerships: [], allCharacters: false, showSecret: true };

    // --- Struttura --------------------------------------------------------------------
    const slider = chapterSlider({ onChange: () => render(), emptyText: 'Nessun passaggio di proprietà nel tempo' });
    const allSwitch = switchControl('Tutti i personaggi', false, (v) => { state.allCharacters = v; render(); });
    const secretSwitch = switchControl('Proprietà nascoste', true, (v) => { state.showSecret = v; render(); });
    const table = h('table', { class: 'table table-sm mb-0 matrix-table' });
    const matrixWrap = h('div', { class: 'matrix-wrap' }, table);
    const matrixView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' }, slider.el, h('div', { class: 'd-flex gap-3 ms-auto' }, secretSwitch, allSwitch)),
        matrixWrap);

    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create() },
        icon('fa-plus', 'me-1'), 'Nuova proprietà');

    const tabs = viewTabs([
        { id: 'matrix', label: 'Matrice', icon: 'fa-table-cells', persistent: true, render: (el) => el.append(matrixView) },
        { id: 'list', label: ownSchema.label_plural, icon: 'fa-list', render: (el) => mountTable(el, { module, embedded: true }) },
        { id: 'wills', label: willSchema.label_plural, icon: willSchema.icon, render: (el) => mountTable(el, { module: { ...module, entity: 'wills' }, embedded: true }) },
    ], { prefKey: 'ownership.view', onChange: (id) => { newBtn.hidden = id !== 'matrix'; } });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            newBtn),
        tabs.body));

    // --- Disegno della matrice -----------------------------------------------------------
    function render() {
        const ch = slider.current;
        const visible = state.ownerships.filter((o) => state.showSecret || !o.secret);
        const current = visible.filter((o) => activeAt(o, ch));

        if (!session.activeCase || !state.assets.length) {
            table.replaceChildren(h('tbody', {}, h('tr', {}, h('td', { class: 'empty-cell' },
                !session.activeCase
                    ? h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')
                    : ['Nessun asset nel caso. ', h('a', { href: '#', dataset: { action: 'open-palette' } }, 'Creane uno con Ctrl+K'), ' o in Asset (Alt+4).']))));
            newBtn.disabled = !session.activeCase;
            return;
        }
        newBtn.disabled = false;

        const ownerIds = new Set(visible.map((o) => o.owner_id));
        const owners = state.characters.filter((c) => state.allCharacters || ownerIds.has(c.id));

        const cells = new Map(); // "asset:owner" → [ownership]
        current.forEach((o) => {
            const key = `${o.asset_id}:${o.owner_id}`;
            cells.set(key, [...(cells.get(key) ?? []), o]);
        });

        const head = h('thead', {}, h('tr', {},
            h('th', { class: 'matrix-corner' }, assetSchema.label_plural),
            h('th', { class: 'text-end' }, 'Valore'),
            ...owners.map((c) => h('th', { class: 'matrix-owner', title: c.name },
                h('span', { class: 'ref-link', dataset: { refEntity: 'characters', refId: c.id } }, c.name))),
            h('th', { class: 'text-end' }, 'Quote')));

        const worth = new Map(owners.map((c) => [c.id, 0]));
        const rows = state.assets.map((a) => {
            let total = 0;
            const tds = owners.map((c) => {
                const list = cells.get(`${a.id}:${c.id}`) ?? [];
                const share = list.reduce((sum, o) => sum + (o.share ?? 0), 0);
                total += share;
                if (a.value) worth.set(c.id, worth.get(c.id) + a.value * share / 100);
                return ownershipCell(a, c, list, share);
            });
            const status = total === 0 ? 'none' : Math.abs(total - 100) < 0.01 ? 'ok' : total > 100 ? 'over' : 'under';
            return h('tr', {},
                h('th', { scope: 'row', class: 'matrix-asset' },
                    h('span', { class: 'ref-link', dataset: { refEntity: 'assets', refId: a.id } }, a.name),
                    a.type ? h('div', { class: 'matrix-sub' }, assetSchema.fields.type.options[a.type] ?? a.type) : null),
                h('td', { class: 'text-end text-nowrap' }, a.value ? currency.format(a.value) : h('span', { class: 'text-body-tertiary' }, '—')),
                ...tds,
                h('td', { class: `text-end text-nowrap quota-${status}`, title: quotaTitle(status, total) },
                    status === 'none' ? '—' : `${Math.round(total * 100) / 100} %`,
                    status === 'over' || status === 'under' ? icon('fa-triangle-exclamation', 'ms-1') : null));
        });

        const foot = h('tfoot', {}, h('tr', {},
            h('th', { colspan: 2 }, 'Valore posseduto'),
            ...owners.map((c) => h('td', { class: 'text-center text-nowrap fw-semibold' }, worth.get(c.id) ? currency.format(worth.get(c.id)) : '—')),
            h('td')));

        table.replaceChildren(head, h('tbody', {}, ...rows), foot);
    }

    function ownershipCell(asset, owner, list, share) {
        const base = { class: 'matrix-cell', tabindex: 0, dataset: { assetId: asset.id, ownerId: owner.id } };
        if (!list.length) {
            return h('td', { ...base, title: `Aggiungi: ${owner.name} possiede ${asset.name}` }, h('span', { class: 'matrix-add' }, icon('fa-plus')));
        }
        const o = list[0];
        const tip = list.map((x) => [
            ownSchema.fields.acquisition.options[x.acquisition],
            x.from_chapter !== null ? `dal cap. ${x.from_chapter}` : null,
            x.to_chapter !== null ? `al cap. ${x.to_chapter}` : null,
            x.moment, x.secret ? 'nascosta' : null,
        ].filter(Boolean).join(' · ')).join('\n');
        return h('td', { ...base, dataset: { ...base.dataset, ownershipId: o.id }, title: tip || 'Apri la proprietà' },
            h('span', { class: `matrix-share${list.some((x) => x.secret) ? ' secret' : ''}`, style: `--share:${Math.min(share, 100) / 100}` },
                formatValue(ownSchema.fields.share, share),
                list.some((x) => x.secret) ? icon('fa-user-secret', 'ms-1') : null,
                list.some((x) => x.acquisition === 'inheritance') ? icon('fa-scroll', 'ms-1') : null));
    }

    function quotaTitle(status, total) {
        if (status === 'under') return `Quote assegnate: ${total}%. Manca il ${Math.round((100 - total) * 100) / 100}%.`;
        if (status === 'over') return `Quote assegnate: ${total}%: superano il 100%.`;
        return '';
    }

    table.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return;
        const cell = e.target.closest('.matrix-cell');
        if (!cell) return;
        if (cell.dataset.ownershipId) panel.open('ownerships', Number(cell.dataset.ownershipId));
        else create({ owner_id: Number(cell.dataset.ownerId), asset_id: Number(cell.dataset.assetId), from_chapter: slider.value });
    });
    table.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.closest('.matrix-cell')) {
            e.preventDefault();
            e.target.click();
        }
    });

    // --- Dati e azioni ----------------------------------------------------------------------
    function create(defaults = {}) {
        if (!session.activeCase || modal.isOpen()) return;
        panel.create('ownerships', defaults);
    }

    async function load() {
        if (!session.activeCase) {
            Object.assign(state, { assets: [], characters: [], ownerships: [] });
        } else {
            const [assets, chars, owns] = await Promise.all([
                resource('assets').list({ limit: 1000 }),
                resource('characters').list({ limit: 1000 }),
                resource('ownerships').list({ limit: 1000 }),
            ]);
            state.assets = assets.data;
            state.characters = chars.data;
            state.ownerships = owns.data;
        }
        const chapters = state.ownerships.flatMap((o) => [o.from_chapter, o.to_chapter]).filter((c) => c !== null);
        slider.setRange(chapters.length ? Math.max(...chapters) : 0, chapters.length > 0);
        render();
    }

    function switchControl(label, checked, onChange) {
        const input = h('input', { type: 'checkbox', class: 'form-check-input', role: 'switch', checked, onchange: () => onChange(input.checked) });
        return h('label', { class: 'form-check form-switch mb-0 small' }, input, h('span', { class: 'form-check-label' }, label));
    }

    const keys = [
        ['alt+n', () => create(), 'Nuova proprietà'],
        [',', () => slider.step(-1), 'Capitolo precedente'],
        ['.', () => slider.step(1), 'Capitolo successivo'],
    ];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity }) => { if (['assets', 'characters', 'ownerships'].includes(entity)) load(); }, { signal });
    on('case:changed', () => load(), { signal });

    keys.forEach(([combo, handler, description]) => hotkeys.register(combo, handler, description));
    await tabs.start();
    await load();

    return () => {
        controller.abort();
        tabs.destroy();
        keys.forEach(([combo, handler]) => hotkeys.unregister(combo, handler));
    };
}
