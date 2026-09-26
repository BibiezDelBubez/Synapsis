/**
 * Gestore generico di un'entità dentro la finestra modale: elenco con ricerca,
 * creazione, modifica ed eliminazione. Ogni modulo lo configura con poche opzioni.
 *
 *   openManager('cases', {
 *       describe: (row, schema) => ({ title, subtitle, color, badges: [], meta }),
 *       isActive: (row) => bool,                         // evidenzia una riga
 *       primary:  (row) => ({ label, icon, run }),        // azione principale (Invio)
 *       afterCreate: (row) => ...,                        // dopo "Salva" di un nuovo record
 *   });
 *
 * Tastiera: nella ricerca Invio esegue l'azione principale sul primo risultato,
 * ↓/↑ scorrono l'elenco, Alt+N crea un nuovo record, Esc chiude.
 */
import { confirmButton, emit, formatDateTime, h, icon } from './dom.js';
import { attachSubmit, focusFirst, renderForm } from './form.js';
import { modal } from './modal.js';
import { getSchema, resource } from './resource.js';

const SEARCH_DELAY = 150;

function defaultDescribe(row, schema) {
    return { title: row[schema.title_field] ?? `#${row.id}`, meta: `Modificato ${formatDateTime(row.updated_at)}` };
}

export async function openManager(entity, options = {}) {
    const schema = await getSchema(entity);
    const api = resource(entity);
    const describe = options.describe ?? defaultDescribe;
    let query = '';
    let searchTimer = null;

    // --- Vista elenco --------------------------------------------------------
    const search = h('input', {
        type: 'search', class: 'form-control', placeholder: `Cerca ${schema.label_plural.toLowerCase()}…`, 'aria-label': 'Cerca',
    });
    const list = h('div', { class: 'list-group list-group-flush entity-list' });
    const listView = h('div', {},
        h('div', { class: 'd-flex gap-2 mb-3' },
            search,
            h('button', { type: 'button', class: 'btn btn-primary text-nowrap', title: 'Alt+N', onclick: () => showForm(null) },
                icon('fa-plus', 'me-1'), `Nuovo ${schema.label.toLowerCase()}`)),
        list);

    search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { query = search.value; refresh(); }, SEARCH_DELAY);
    });
    search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            list.querySelector('[data-primary]')?.click();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            list.querySelector('.entity-row')?.focus();
        }
    });
    list.addEventListener('keydown', (e) => {
        const row = e.target.closest('.entity-row');
        if (!row) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const next = e.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
            (next ?? (e.key === 'ArrowUp' ? search : null))?.focus();
        } else if (e.key === 'Enter' && e.target === row) {
            e.preventDefault();
            row.querySelector('[data-primary]')?.click();
        }
    });
    listView.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === 'KeyN') {
            e.preventDefault();
            showForm(null);
        }
    });

    function renderRow(row) {
        const d = describe(row, schema);
        const active = options.isActive?.(row) ?? false;
        const primary = options.primary?.(row);

        const actions = h('div', { class: 'entity-actions' },
            primary ? h('button', {
                type: 'button', class: `btn btn-sm ${active ? 'btn-outline-secondary' : 'btn-outline-primary'}`, dataset: { primary: '' },
                onclick: () => run(primary.run),
            }, primary.icon ? icon(primary.icon, 'me-1') : null, primary.label) : null,
            h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Modifica', onclick: () => showForm(row) }, icon('fa-pen')),
            deleteButton(row));

        return h('div', { class: `list-group-item entity-row${active ? ' active-row' : ''}`, tabindex: 0 },
            h('span', { class: 'entity-color', style: `background:${d.color ?? 'var(--bs-secondary-bg)'}` }),
            h('div', { class: 'entity-text' },
                h('div', { class: 'entity-title' }, d.title,
                    active ? h('span', { class: 'badge text-bg-primary ms-2' }, 'aperto') : null,
                    ...(d.badges ?? []).map((b) => h('span', { class: 'badge text-bg-secondary ms-2 fw-normal' }, b))),
                d.subtitle ? h('div', { class: 'entity-subtitle' }, d.subtitle) : null,
                d.meta ? h('div', { class: 'entity-meta' }, d.meta) : null),
            actions);
    }

    function deleteButton(row) {
        return confirmButton({ onConfirm: () => run(async () => { await api.remove(row.id); await refresh(); }) });
    }

    async function refresh() {
        try {
            const { data, meta } = await api.list({ q: query });
            list.replaceChildren(...(data.length
                ? data.map(renderRow)
                : [h('div', { class: 'text-body-secondary text-center py-4' },
                    query ? 'Nessun risultato.' : `Nessun ${schema.label.toLowerCase()} ancora. Premi Alt+N per crearne uno.`)]));
            modal.setFooter(h('small', { class: 'text-body-secondary me-auto' },
                `${meta.total} ${meta.total === 1 ? schema.label.toLowerCase() : schema.label_plural.toLowerCase()} · Invio apre · ↑↓ scorre · Alt+N nuovo · Esc chiude`));
        } catch (error) {
            list.replaceChildren(h('div', { class: 'alert alert-danger m-0' }, error.message));
        }
    }

    async function run(fn) {
        try {
            await fn();
        } catch (error) {
            emit('app:error', { message: error.message });
        }
    }

    function showList() {
        modal.setTitle(schema.label_plural, schema.icon);
        modal.setBody(listView);
        refresh().then(() => search.focus());
    }

    // --- Vista form ----------------------------------------------------------
    function showForm(record) {
        const form = renderForm(schema, record);
        const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, icon('fa-check', 'me-1'), 'Salva');
        saveBtn.setAttribute('form', form.id = `form-${entity}`);

        attachSubmit(form, schema, {
            submitButton: saveBtn,
            onCancel: showList,
            save: async (data) => {
                const saved = record ? await api.update(record.id, data) : await api.create(data);
                if (!record && options.afterCreate) await options.afterCreate(saved);
                else showList();
            },
        });

        modal.setTitle(record ? `Modifica ${schema.label.toLowerCase()}` : `Nuovo ${schema.label.toLowerCase()}`, schema.icon);
        modal.setBody(form);
        modal.setFooter(h('div', { class: 'd-flex w-100 align-items-center gap-2' },
            h('small', { class: 'text-body-secondary me-auto' }, 'Ctrl+Invio salva · Esc torna all\'elenco'),
            h('button', { type: 'button', class: 'btn btn-outline-secondary', onclick: showList }, 'Annulla'),
            saveBtn));
        focusFirst(form);
    }

    modal.open({ title: schema.label_plural, icon: schema.icon, body: listView });
    modal.whenShown(() => search.focus());
    refresh();
}
