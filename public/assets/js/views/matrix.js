/**
 * Vista "Matrice e alibi".
 *
 * - Matrice: per un delitto (evento), una riga per sospettato con Chi / Perché (movente) / Cosa (mezzo) /
 *   Dove e quando dice di essere stato (alibi) / Opportunità reale calcolata dalla timeline e dai tempi di percorrenza.
 * - Registro alibi: tenuta (Solido, Debole, Falso, Non verificato) e controlli automatici: smentito dalla timeline,
 *   testimone altrove, solido senza testimone, incoerenze con il capitolo in cui crolla.
 * - Elenchi completi di sospettati e alibi.
 *
 * Tastiera: Alt+N nuovo sospettato / alibi · V mostra o nasconde il colpevole.
 */
import { formatDateTime, h, icon, on } from '../core/dom.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { viewTabs } from '../core/tabs.js';
import { mount as mountTable } from './entity-table.js';
import { caseAnalysis } from './analysis.js';
import { parseDateTime } from './space-routes.js';

const ENTITIES = ['suspects', 'alibis', 'events', 'event_participants', 'characters', 'places', 'routes'];

const OPPORTUNITY = {
    present: { label: 'Sul posto', icon: 'fa-location-crosshairs', cls: 'text-danger' },
    possible: { label: 'Possibile', icon: 'fa-person-running', cls: 'text-warning' },
    unknown: { label: 'Da verificare', icon: 'fa-circle-question', cls: 'text-info' },
    elsewhere: { label: 'Altrove', icon: 'fa-plane-departure', cls: 'text-success' },
    impossible: { label: 'Impossibile', icon: 'fa-ban', cls: 'text-success' },
};
const LEVEL_ICON = { danger: 'fa-triangle-exclamation', warning: 'fa-circle-exclamation', info: 'fa-circle-info' };

export async function mount(container, { module }) {
    const [suspectSchema, alibiSchema] = await Promise.all([getSchema('suspects'), getSchema('alibis')]);
    const SF = suspectSchema.fields;
    const AF = alibiSchema.fields;
    const state = {
        tab: 'matrix', suspects: [], alibis: [], events: [], participants: [], characters: [], places: [], routes: [],
        crimeId: prefs.getJSON('matrix.crime', null), showCulprit: prefs.getJSON('matrix.culprit', true),
        statuses: new Set(Object.keys(AF.status.options)),
    };
    let ctx = caseAnalysis(state);
    const charName = (id) => ctx.charName(id);
    const placeName = (id) => ctx.placeName(id);
    const eventById = (id) => ctx.eventById(id);
    const link = (entity, id, text) => h('span', { class: 'ref-link', dataset: { refEntity: entity, refId: id } }, text);
    const fmt = (d) => (d ? formatDateTime(d) : '');

    // --- Struttura ------------------------------------------------------------------------------------
    const crimeSelect = h('select', { class: 'form-select form-select-sm', style: 'width:auto;min-width:16rem', 'aria-label': 'Delitto' });
    crimeSelect.addEventListener('change', () => {
        state.crimeId = Number(crimeSelect.value) || null;
        prefs.setJSON('matrix.crime', state.crimeId);
        renderMatrix();
    });
    const culpritInput = h('input', { type: 'checkbox', class: 'form-check-input', role: 'switch', checked: state.showCulprit, onchange: () => setCulprit(culpritInput.checked) });
    const crimeInfo = h('div', { class: 'small text-body-secondary' });
    const matrixTable = h('table', { class: 'table table-sm mb-0 matrix-table w5-table' });
    const matrixView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' }, crimeSelect, crimeInfo,
            h('label', { class: 'form-check form-switch mb-0 small ms-auto', title: 'V' }, culpritInput, h('span', { class: 'form-check-label' }, 'Mostra il colpevole'))),
        h('div', { class: 'matrix-wrap' }, matrixTable));

    const statusChips = h('div', { class: 'chip-group' });
    const alibiTable = h('table', { class: 'table table-sm mb-0 matrix-table alibi-table' });
    const alibiView = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' }, statusChips, h('span', { class: 'small text-body-secondary ms-auto' }, 'Clic su una riga per aprire l\'alibi')),
        h('div', { class: 'matrix-wrap' }, alibiTable));

    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Alt+N', onclick: () => create() });

    const tabs = viewTabs([
        { id: 'matrix', label: 'Matrice', icon: 'fa-table-cells', persistent: true, render: (el) => el.append(matrixView) },
        { id: 'alibis', label: 'Registro alibi', icon: alibiSchema.icon, persistent: true, render: (el) => el.append(alibiView) },
        { id: 'list', label: suspectSchema.label_plural, icon: suspectSchema.icon, render: (el) => mountTable(el, { module, embedded: true }) },
        { id: 'alibi-list', label: 'Elenco alibi', icon: 'fa-list', render: (el) => mountTable(el, { module: { ...module, entity: 'alibis' }, embedded: true }) },
    ], {
        prefKey: 'matrix.view',
        onChange: (id) => {
            state.tab = id;
            newBtn.hidden = id === 'list' || id === 'alibi-list';
            newBtn.replaceChildren(icon('fa-plus', 'me-1'), id === 'alibis' ? 'Nuovo alibi' : 'Nuovo sospettato');
        },
    });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header,
            newBtn),
        tabs.body));

    const emptyRow = (content) => h('tbody', {}, h('tr', {}, h('td', { class: 'empty-cell' }, content)));
    const noCase = () => h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso');

    // --- Matrice --------------------------------------------------------------------------------------
    function crimes() {
        const withSuspects = new Set(state.suspects.map((s) => s.crime_event_id));
        return [...state.events].sort((a, b) => Number(withSuspects.has(b.id)) - Number(withSuspects.has(a.id))
            || String(a.real_start ?? a.perceived_start ?? '').localeCompare(String(b.real_start ?? b.perceived_start ?? '')));
    }

    function renderMatrix() {
        const list = crimes();
        const withSuspects = new Set(state.suspects.map((s) => s.crime_event_id));
        if (!list.some((e) => e.id === state.crimeId)) state.crimeId = list.find((e) => withSuspects.has(e.id))?.id ?? list[0]?.id ?? null;
        crimeSelect.replaceChildren(...list.map((e) => h('option', { value: e.id, selected: e.id === state.crimeId },
            `${e.title}${withSuspects.has(e.id) ? ` (${state.suspects.filter((s) => s.crime_event_id === e.id).length})` : ''}`)));
        crimeSelect.disabled = !list.length;

        if (!session.activeCase) {
            crimeInfo.replaceChildren();
            return matrixTable.replaceChildren(emptyRow(noCase()));
        }
        const crime = eventById(state.crimeId);
        if (!crime) {
            crimeInfo.replaceChildren();
            return matrixTable.replaceChildren(emptyRow('Nessun evento nel caso: crea il delitto nella Doppia timeline (Alt+6).'));
        }
        const victims = state.participants.filter((p) => p.event_id === crime.id && p.role === 'victim').map((p) => charName(p.character_id));
        crimeInfo.replaceChildren([
            crime.real_start ? `${fmt(crime.real_start)}${crime.real_end ? ` – ${fmt(crime.real_end)}` : ''}` : 'senza orario verità',
            crime.place_id ? placeName(crime.place_id) : null,
            victims.length ? `vittima: ${victims.join(', ')}` : null,
        ].filter(Boolean).join(' · '));

        const rows = state.suspects.filter((s) => s.crime_event_id === crime.id);
        if (!rows.length) {
            return matrixTable.replaceChildren(emptyRow(['Nessun sospettato per questo delitto. ',
                h('a', { href: '#', onclick: (e) => { e.preventDefault(); create(); } }, 'Aggiungine uno'), ' (Alt+N).']));
        }
        const head = h('thead', {}, h('tr', {},
            h('th', { class: 'matrix-corner' }, 'Chi'),
            h('th', {}, 'Perché'),
            h('th', {}, 'Cosa'),
            h('th', {}, 'Dove e quando (dichiara)'),
            h('th', {}, 'Opportunità reale'),
            state.showCulprit ? h('th', { class: 'text-center' }, 'Colpevole') : null));
        const body = rows.map((s) => {
            const opp = ctx.opportunity(crime, s.character_id);
            const o = OPPORTUNITY[opp.status];
            const alibis = state.alibis.filter((a) => a.character_id === s.character_id
                && (a.event_id === crime.id || (!a.event_id && alibiCovers(a, crime))));
            return h('tr', { class: `suspect-row${state.showCulprit && s.is_culprit ? ' culprit' : ''}`, dataset: { suspectId: s.id } },
                h('th', { scope: 'row', class: 'matrix-asset' }, link('characters', s.character_id, charName(s.character_id))),
                h('td', { class: `w5-cell strength-${s.motive_strength}` },
                    h('span', { class: `badge badge-enum enum-${s.motive_strength}` }, SF.motive_strength.options[s.motive_strength]),
                    s.motive ? h('div', { class: 'w5-text' }, s.motive) : null),
                h('td', { class: 'w5-cell' },
                    h('span', { class: `badge badge-enum enum-${s.means_access}` }, SF.means_access.options[s.means_access]),
                    s.means ? h('div', { class: 'w5-text' }, s.means) : null),
                h('td', { class: 'w5-cell' }, alibis.length
                    ? alibis.map((a) => h('div', { class: 'w5-alibi', dataset: { alibiId: a.id } },
                        h('span', { class: `badge badge-enum enum-${a.status} me-1` }, AF.status.options[a.status]),
                        a.claimed_place_id ? placeName(a.claimed_place_id) : a.claim,
                        a.start_at ? h('div', { class: 'matrix-sub' }, fmt(a.start_at), a.end_at ? ` – ${fmt(a.end_at)}` : '') : null))
                    : h('button', { type: 'button', class: 'btn btn-link btn-sm p-0', dataset: { addAlibi: s.character_id } }, icon('fa-plus', 'me-1'), 'alibi')),
                h('td', { class: 'w5-cell' },
                    h('div', { class: o.cls }, icon(o.icon, 'me-1'), o.label),
                    h('div', { class: 'matrix-sub' }, opp.text)),
                state.showCulprit ? h('td', { class: 'text-center' }, s.is_culprit ? icon('fa-skull text-danger', '') : '') : null);
        });
        matrixTable.replaceChildren(head, h('tbody', {}, ...body));
    }

    function alibiCovers(a, crime) {
        const s = parseDateTime(a.start_at);
        const c = parseDateTime(crime.real_start);
        if (!s || !c) return false;
        const e = parseDateTime(a.end_at) ?? s;
        return s <= (parseDateTime(crime.real_end) ?? c) && e >= c;
    }

    matrixTable.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return;
        const add = e.target.closest('[data-add-alibi]');
        if (add) return createAlibi({ character_id: Number(add.dataset.addAlibi) });
        const alibi = e.target.closest('.w5-alibi');
        if (alibi) return panel.open('alibis', Number(alibi.dataset.alibiId));
        const row = e.target.closest('.suspect-row');
        if (row) panel.open('suspects', Number(row.dataset.suspectId));
    });

    // --- Registro alibi ---------------------------------------------------------------------------------
    function renderAlibis() {
        statusChips.replaceChildren(...Object.entries(AF.status.options).map(([k, label]) => {
            const count = state.alibis.filter((a) => a.status === k).length;
            return h('button', { type: 'button', class: `chip${state.statuses.has(k) ? ' active' : ''}`, dataset: { status: k } }, `${label} (${count})`);
        }));
        if (!session.activeCase) return alibiTable.replaceChildren(emptyRow(noCase()));
        const list = state.alibis.filter((a) => state.statuses.has(a.status));
        if (!list.length) {
            return alibiTable.replaceChildren(emptyRow(state.alibis.length ? 'Nessun alibi con la tenuta selezionata.'
                : ['Nessun alibi registrato. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); createAlibi(); } }, 'Aggiungine uno'), '.']));
        }
        const head = h('thead', {}, h('tr', {},
            h('th', {}, 'Chi'), h('th', {}, 'Dichiara'), h('th', {}, 'Dove'), h('th', {}, 'Quando'),
            h('th', {}, 'Testimone'), h('th', {}, 'Tenuta'), h('th', { class: 'text-nowrap' }, 'Capitoli'), h('th', {}, 'Controlli')));
        const rows = list.map((a) => {
            const issues = ctx.alibiIssues(a);
            const ev = eventById(a.event_id);
            return h('tr', { class: 'alibi-row', dataset: { alibiId: a.id } },
                h('td', { class: 'text-nowrap' }, link('characters', a.character_id, charName(a.character_id)),
                    ev ? h('div', { class: 'matrix-sub' }, 'per ', ev.title) : null),
                h('td', {}, a.claim, a.truth ? h('div', { class: 'matrix-sub fst-italic' }, 'Verità: ', a.truth) : null),
                h('td', {}, a.claimed_place_id ? placeName(a.claimed_place_id) : '—'),
                h('td', { class: 'text-nowrap small' }, a.start_at ? fmt(a.start_at) : '—', a.end_at ? h('div', {}, fmt(a.end_at)) : null),
                h('td', {}, a.witness_id ? link('characters', a.witness_id, charName(a.witness_id)) : h('span', { class: 'text-body-tertiary' }, 'nessuno')),
                h('td', {}, h('span', { class: `badge badge-enum enum-${a.status}` }, AF.status.options[a.status])),
                h('td', { class: 'text-nowrap small' }, a.given_chapter !== null ? `cap. ${a.given_chapter}` : '—',
                    a.broken_chapter !== null ? h('div', { class: 'text-danger-emphasis' }, icon('fa-burst', 'me-1'), `crolla al ${a.broken_chapter}`) : null),
                h('td', { class: 'small' }, issues.length
                    ? issues.map((i) => h('div', { class: `text-${i.level === 'info' ? 'body-secondary' : i.level}` }, icon(LEVEL_ICON[i.level], 'me-1'), i.text))
                    : h('span', { class: 'text-success' }, icon('fa-check', 'me-1'), 'Coerente')));
        });
        alibiTable.replaceChildren(head, h('tbody', {}, ...rows));
    }

    statusChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const k = chip.dataset.status;
        if (state.statuses.has(k)) state.statuses.delete(k);
        else state.statuses.add(k);
        renderAlibis();
    });
    alibiTable.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return;
        const row = e.target.closest('.alibi-row');
        if (row) panel.open('alibis', Number(row.dataset.alibiId));
    });

    // --- Dati e azioni ------------------------------------------------------------------------------
    function createAlibi(defaults = {}) {
        if (!session.activeCase || modal.isOpen()) return;
        const crime = state.tab === 'matrix' ? eventById(state.crimeId) : null;
        panel.create('alibis', crime ? { event_id: crime.id, ...defaults } : defaults);
    }

    function create() {
        if (!session.activeCase || modal.isOpen()) return;
        if (state.tab === 'alibis') return createAlibi();
        panel.create('suspects', state.crimeId ? { crime_event_id: state.crimeId } : {});
    }

    function setCulprit(on) {
        state.showCulprit = on;
        culpritInput.checked = on;
        prefs.setJSON('matrix.culprit', on);
        renderMatrix();
    }

    async function load() {
        if (!session.activeCase) {
            ENTITIES.forEach((e) => { state[e === 'event_participants' ? 'participants' : e] = []; });
        } else {
            const lists = await Promise.all(ENTITIES.map((e) => resource(e).list({ limit: 1000 })));
            [state.suspects, state.alibis, state.events, state.participants, state.characters, state.places, state.routes] = lists.map((l) => l.data);
        }
        ctx = caseAnalysis(state);
        renderMatrix();
        renderAlibis();
    }

    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 50);
    };

    const keys = [
        ['alt+n', () => create(), 'Nuovo sospettato / alibi'],
        ['v', () => setCulprit(!state.showCulprit), 'Matrice: mostra / nascondi il colpevole'],
    ];

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', ({ entity, action, record }) => {
        if (!ENTITIES.includes(entity)) return;
        if (entity === 'suspects' && record?.crime_event_id && action !== 'delete') state.crimeId = record.crime_event_id;
        reload();
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
