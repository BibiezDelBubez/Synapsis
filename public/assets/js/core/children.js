/**
 * Sotto-elenchi nel pannello di dettaglio, dichiarati nello schema del "padre":
 *   'children' => [['entity' => 'relation_phases', 'foreign_key' => 'relation_id', 'label' => '…']]
 * Ogni riga si modifica ed elimina sul posto; "Aggiungi" apre un piccolo form in fondo.
 * Serve a tutte le entità con dati collegati (evoluzione dei legami, catena di custodia, …).
 */
import { confirmButton, emit, h, icon, on } from './dom.js';
import { formatValue, loadRefsFor } from './format.js';
import { attachSubmit, focusFirst, renderForm } from './form.js';
import { getSchema, resource } from './resource.js';

/**
 * @param {{entity: string, foreign_key: string, label: string}} child
 * @param {number} parentId
 * @param {AbortSignal} signal  per smettere di ascoltare gli aggiornamenti quando il pannello cambia
 */
export async function renderChildSection(child, parentId, signal) {
    const schema = await getSchema(child.entity);
    const api = resource(child.entity);
    const columns = schema.list_columns.filter((c) => c !== child.foreign_key);

    const list = h('div', { class: 'child-list' });
    const addBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: () => openForm(null, null) },
        icon('fa-plus', 'me-1'), 'Aggiungi');
    const section = h('section', { class: 'child-section' },
        h('div', { class: 'child-header' }, h('h3', {}, icon(schema.icon, 'me-2'), child.label), addBtn),
        list);

    let openFormRow = null;

    function closeForm() {
        openFormRow?.remove();
        openFormRow = null;
        list.querySelectorAll('.child-row[hidden]').forEach((row) => { row.hidden = false; });
        addBtn.disabled = false;
    }

    /** Form in linea: sostituisce la riga modificata oppure compare in fondo per un nuovo elemento. */
    function openForm(record, rowElement) {
        closeForm();
        const form = renderForm(schema, record, { exclude: [child.foreign_key] });
        form.classList.add('child-form');
        const saveBtn = h('button', { type: 'submit', class: 'btn btn-sm btn-primary' }, icon('fa-check', 'me-1'), 'Salva');
        form.append(h('div', { class: 'col-12 d-flex gap-2 justify-content-end' },
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: closeForm }, 'Annulla'),
            saveBtn));

        attachSubmit(form, schema, {
            submitButton: saveBtn,
            onCancel: closeForm,
            save: async (data) => {
                data[child.foreign_key] = parentId;
                if (record) await api.update(record.id, data);
                else await api.create(data);
                // l'elenco si ricarica tramite l'evento data:changed
            },
        });

        openFormRow = h('div', { class: 'child-form-wrap' }, form);
        if (rowElement) {
            rowElement.hidden = true;
            rowElement.after(openFormRow);
        } else {
            list.append(openFormRow);
            addBtn.disabled = true;
        }
        focusFirst(form);
    }

    async function load() {
        try {
            const [{ data }, refs] = await Promise.all([
                api.list({ [child.foreign_key]: parentId, limit: 1000 }),
                loadRefsFor(schema, columns),
            ]);
            openFormRow = null;
            addBtn.disabled = false;
            list.replaceChildren(...(data.length
                ? data.map((row) => {
                    const el = h('div', { class: 'child-row' },
                        h('div', { class: 'child-values' },
                            ...columns.map((name) => h('span', { class: `child-value child-${schema.fields[name].type}`, title: schema.fields[name].label },
                                formatValue(schema.fields[name], row[name], refs[name], true)))),
                        h('div', { class: 'child-actions' },
                            h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Modifica', onclick: () => openForm(row, el) }, icon('fa-pen')),
                            confirmButton({
                                onConfirm: async () => {
                                    try {
                                        await api.remove(row.id);
                                    } catch (error) {
                                        emit('app:error', { message: error.message });
                                    }
                                },
                            })));
                    return el;
                })
                : [h('div', { class: 'child-empty' }, 'Nessun elemento.')]));
        } catch (error) {
            list.replaceChildren(h('div', { class: 'text-danger small' }, error.message));
        }
    }

    on('data:changed', ({ entity }) => { if (entity === child.entity) load(); }, { signal });
    await load();
    return section;
}
