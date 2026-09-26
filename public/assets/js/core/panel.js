/**
 * Pannello di dettaglio a scorrimento laterale (a destra), unico per tutta l'app.
 *
 *   panel.open('characters', 12)          scheda in lettura
 *   panel.create('places', { name: '…' }) nuovo record, direttamente in modifica
 *   panel.close()
 *
 * Tastiera: E modifica, Esc chiude (o annulla la modifica), Ctrl+Invio salva.
 * Cliccando un collegamento (campo ref) si apre la scheda collegata.
 */
import { confirmButton, emit, formatDateTime, h, icon, on } from './dom.js';
import { formatValue, loadRefsFor, newLabel } from './format.js';
import { renderChildSection } from './children.js';
import { attachSubmit, focusFirst, renderForm } from './form.js';
import { hotkeys } from './hotkeys.js';
import { modal } from './modal.js';
import { getSchema, resource } from './resource.js';

const root = () => document.getElementById('app-panel');

let state = null; // { entity, id, mode: 'read' | 'edit' }
let sections = null; // AbortController delle sezioni figlie attualmente mostrate

function resetSections() {
    sections?.abort();
    sections = new AbortController();
    return sections.signal;
}

function setOpen(open) {
    document.body.classList.toggle('panel-open', open);
    emit('panel:changed', { entity: open ? state?.entity : null, id: open ? state?.id : null });
}

function header(schema, title, subtitle, actions) {
    return h('div', { class: 'panel-header' },
        h('div', { class: 'panel-heading' },
            h('div', { class: 'panel-kicker' }, icon(schema.icon, 'me-1'), schema.label),
            h('h2', { class: 'panel-title' }, title),
            subtitle ? h('div', { class: 'panel-subtitle' }, subtitle) : null),
        h('div', { class: 'panel-actions' }, ...actions,
            h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Chiudi (Esc)', onclick: () => panel.close() }, icon('fa-xmark'))));
}

async function renderRead(entity, id) {
    const [schema, record] = await Promise.all([getSchema(entity), resource(entity).get(id)]);
    const refs = await loadRefsFor(schema);
    const signal = resetSections();
    const children = await Promise.all(schema.children.map((child) => renderChildSection(child, id, signal)));
    state = { entity, id, mode: 'read' };
    emit('panel:changed', { entity, id });

    const title = record[schema.title_field];
    const subtitle = schema.subtitle_field && schema.fields[schema.subtitle_field]?.type !== 'text' ? record[schema.subtitle_field] : null;

    const rows = Object.entries(schema.fields)
        .filter(([name]) => name !== schema.title_field && name !== (subtitle ? schema.subtitle_field : null))
        .map(([name, field]) => h('div', { class: `panel-field${field.type === 'text' ? ' panel-field-wide' : ''}` },
            h('dt', {}, field.label),
            h('dd', {}, formatValue(field, record[name], refs[name]))));

    root().replaceChildren(
        header(schema, title, subtitle, [
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'Modifica (E)', onclick: () => renderEdit(entity, record) },
                icon('fa-pen', 'me-1'), 'Modifica'),
            confirmButton({
                onConfirm: async () => {
                    try {
                        await resource(entity).remove(id);
                        panel.close();
                    } catch (error) {
                        emit('app:error', { message: error.message });
                    }
                },
            }),
        ]),
        h('dl', { class: 'panel-body' }, ...rows),
        ...children,
        h('div', { class: 'panel-footer' },
            `Creato ${formatDateTime(record.created_at)} · Modificato ${formatDateTime(record.updated_at)}`));
}

async function renderEdit(entity, record = null, defaults = {}) {
    const schema = await getSchema(entity);
    resetSections();
    state = { entity, id: record?.id ?? null, mode: 'edit' };

    const form = renderForm(schema, record ?? { ...Object.fromEntries(Object.entries(schema.fields).map(([n, f]) => [n, f.default ?? null])), ...defaults });
    const saveBtn = h('button', { type: 'submit', class: 'btn btn-sm btn-primary' }, icon('fa-check', 'me-1'), 'Salva');
    saveBtn.setAttribute('form', form.id = 'panel-form');
    const cancel = () => (record ? renderRead(entity, record.id) : panel.close());

    attachSubmit(form, schema, {
        submitButton: saveBtn,
        onCancel: cancel,
        save: async (data) => {
            const saved = record ? await resource(entity).update(record.id, data) : await resource(entity).create(data);
            await renderRead(entity, saved.id);
        },
    });

    root().replaceChildren(
        header(schema, record ? record[schema.title_field] : newLabel(schema), null, [
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: cancel }, 'Annulla'),
            saveBtn,
        ]),
        h('div', { class: 'panel-body panel-form' }, form),
        h('div', { class: 'panel-footer' }, 'Ctrl+Invio salva · Esc annulla'));
    focusFirst(form);
}

async function guard(fn) {
    try {
        setOpen(true);
        await fn();
    } catch (error) {
        emit('app:error', { message: error.message });
        panel.close();
    }
}

export const panel = {
    get current() {
        return state;
    },
    open(entity, id) {
        return guard(async () => {
            await renderRead(entity, id);
            root().focus();
        });
    },
    create(entity, defaults = {}) {
        return guard(() => renderEdit(entity, null, defaults));
    },
    edit() {
        if (state?.mode !== 'read' || modal.isOpen()) return undefined;
        const { entity, id } = state;
        return guard(async () => renderEdit(entity, await resource(entity).get(id)));
    },
    close() {
        sections?.abort();
        state = null;
        setOpen(false);
        root().replaceChildren();
    },
};

// --- Eventi e scorciatoie ------------------------------------------------------
hotkeys.register('e', () => panel.edit(), 'Modifica la scheda aperta');
hotkeys.register('escape', () => {
    if (state && !modal.isOpen()) panel.close();
}, 'Chiudi il pannello');

document.addEventListener('click', (event) => {
    const link = event.target.closest('.ref-link[data-ref-id]');
    if (link) panel.open(link.dataset.refEntity, Number(link.dataset.refId));
});

on('data:changed', ({ entity, action, record }) => {
    if (!state || state.mode !== 'read' || state.entity !== entity || record?.id !== state.id) return;
    if (action === 'delete') panel.close();
    else renderRead(entity, state.id);
});
on('case:changed', () => panel.close());
