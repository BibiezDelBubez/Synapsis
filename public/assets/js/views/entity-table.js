/**
 * Vista generica "archivio": tabella di un'entità del caso aperto.
 * Si attiva da config/modules.php con view 'entity-table' e 'entity' => nome.
 * Colonne da schema.list_columns; clic o Invio su una riga apre il pannello di dettaglio.
 *
 * Con { embedded: true } la tabella si inserisce dentro un'altra vista (es. una scheda):
 * niente titolo di pagina, solo la barra con ricerca e "Nuovo".
 *
 * Tastiera: / cerca · Alt+N nuovo · ↑↓ scorrono le righe · Invio apre.
 */
import { h, icon, on } from '../core/dom.js';
import { formatValue, loadRefsFor, newLabel } from '../core/format.js';
import { hotkeys } from '../core/hotkeys.js';
import { modal } from '../core/modal.js';
import { panel } from '../core/panel.js';
import { getSchema, resource } from '../core/resource.js';
import { session } from '../core/session.js';

const SEARCH_DELAY = 150;

export async function mount(container, { module, embedded = false }) {
    const schema = await getSchema(module.entity);
    const api = resource(module.entity);
    const columns = schema.list_columns;
    const state = { q: '', sort: null, dir: 'asc' };

    const count = h('span', { class: 'badge text-bg-secondary ms-2 fw-normal' });
    const search = h('input', { type: 'search', class: 'form-control form-control-sm', placeholder: `Cerca… ( / )`, 'aria-label': 'Cerca' });
    const newBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary text-nowrap', title: 'Alt+N', onclick: () => createNew() },
        icon('fa-plus', 'me-1'), newLabel(schema));
    const thead = h('thead');
    const tbody = h('tbody');
    const body = h('div', { class: 'table-responsive entity-table-wrap' },
        h('table', { class: 'table table-sm table-hover align-middle mb-0 entity-table' }, thead, tbody));

    const heading = embedded
        ? h('div', { class: 'me-auto fw-semibold text-body-secondary' }, icon(schema.icon, 'me-2'), schema.label_plural, count)
        : h('h1', { class: 'h4 mb-0 me-auto' }, icon(schema.icon, 'me-2 text-primary'), schema.label_plural, count);

    container.append(
        h('section', { class: `${embedded ? 'table-toolbar' : 'page-header'} d-flex align-items-center gap-2 flex-wrap` },
            heading,
            h('div', { class: 'toolbar-search' }, search),
            newBtn),
        body);

    function createNew(defaults = {}) {
        if (!session.activeCase || modal.isOpen()) return;
        panel.create(module.entity, defaults);
    }

    function renderHead() {
        thead.replaceChildren(h('tr', {}, ...columns.map((name) => {
            const active = state.sort === name;
            return h('th', { scope: 'col', class: 'sortable', onclick: () => sortBy(name) },
                schema.fields[name].label,
                active ? icon(state.dir === 'asc' ? 'fa-caret-up' : 'fa-caret-down', 'ms-1') : null);
        })));
    }

    function sortBy(name) {
        state.dir = state.sort === name && state.dir === 'asc' ? 'desc' : 'asc';
        state.sort = name;
        load();
    }

    function emptyRow(content) {
        tbody.replaceChildren(h('tr', {}, h('td', { colspan: columns.length, class: 'empty-cell' }, content)));
    }

    async function load() {
        renderHead();
        newBtn.disabled = !session.activeCase;
        search.disabled = !session.activeCase;

        if (!session.activeCase) {
            count.textContent = '';
            emptyRow(h('div', {}, 'Apri un caso per vedere i suoi ', schema.label_plural.toLowerCase(), '. ',
                h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary ms-2', dataset: { action: 'open-cases' } }, 'Apri un caso')));
            return;
        }
        try {
            const [{ data, meta }, refs] = await Promise.all([
                api.list({ q: state.q, sort: state.sort, dir: state.dir }),
                loadRefsFor(schema, columns),
            ]);
            count.textContent = String(meta.total);
            if (!data.length) {
                emptyRow(state.q ? 'Nessun risultato.' : `Nessun ${schema.label.toLowerCase()} ancora. Premi Alt+N per crearne uno.`);
                return;
            }
            tbody.replaceChildren(...data.map((row) => h('tr', {
                tabindex: 0,
                class: panel.current?.entity === module.entity && panel.current?.id === row.id ? 'table-active' : null,
                dataset: { id: row.id },
            }, ...columns.map((name) => h('td', { class: name === schema.title_field ? 'cell-title' : null },
                name === schema.title_field
                    ? h('span', { class: 'd-inline-flex align-items-center gap-2 fw-medium' },
                        row.color ? h('span', { class: 'color-dot', style: `background:${row.color}` }) : null, row[name])
                    : formatValue(schema.fields[name], row[name], refs[name], true))))));
        } catch (error) {
            emptyRow(h('span', { class: 'text-danger' }, error.message));
        }
    }

    // --- Interazioni ------------------------------------------------------------
    let timer = null;
    search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = search.value; load(); }, SEARCH_DELAY);
    });
    search.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            tbody.querySelector('tr[data-id]')?.focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            tbody.querySelector('tr[data-id]')?.click();
        } else if (e.key === 'Escape' && search.value) {
            e.stopPropagation();
            search.value = '';
            state.q = '';
            load();
        }
    });
    tbody.addEventListener('click', (e) => {
        if (e.target.closest('.ref-link')) return; // i collegamenti aprono la scheda collegata
        const tr = e.target.closest('tr[data-id]');
        if (tr) panel.open(module.entity, Number(tr.dataset.id));
    });
    tbody.addEventListener('keydown', (e) => {
        const tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const next = e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling;
            (next ?? (e.key === 'ArrowUp' ? search : null))?.focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            tr.click();
        }
    });

    const controller = new AbortController();
    const { signal } = controller;
    on('case:changed', load, { signal });
    on('data:changed', ({ entity }) => {
        if (entity === module.entity || columns.some((c) => schema.fields[c].entity === entity)) load();
    }, { signal });

    on('panel:changed', ({ entity, id }) => {
        tbody.querySelectorAll('tr[data-id]').forEach((tr) => {
            tr.classList.toggle('table-active', entity === module.entity && Number(tr.dataset.id) === id);
        });
    }, { signal });

    const onNew = () => createNew();
    const onSearch = () => search.focus();
    hotkeys.register('alt+n', onNew, newLabel(schema));
    hotkeys.register('/', onSearch, 'Cerca nella tabella');

    await load();
    return () => {
        controller.abort();
        clearTimeout(timer);
        hotkeys.unregister('alt+n', onNew);
        hotkeys.unregister('/', onSearch);
    };
}
