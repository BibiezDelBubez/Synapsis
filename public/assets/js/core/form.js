/**
 * Form generati dallo schema di un'entità: un solo codice per tutti i form dell'app.
 *
 *   const form = renderForm(schema, record);   // record = null per "nuovo"
 *   const data = readForm(form, schema);
 *   showErrors(form, { title: 'Campo obbligatorio.' });
 *
 * Larghezza dei campi: chiave 'width' nello schema ('full' | 'half');
 * se assente, testi lunghi e stringhe occupano tutta la riga, gli altri metà.
 */
import { ApiError, api, url } from './api.js';
import { emit, h } from './dom.js';
import { getSchema, resource } from './resource.js';

const HALF_BY_DEFAULT = ['int', 'float', 'bool', 'enum', 'date', 'datetime', 'color', 'ref'];

const inputId = (schema, name) => `f-${schema.name}-${name}`;

/** Costruttori dei controlli, uno per tipo di campo. */
const controls = {
    string: (f, v, id) => h('input', { type: 'text', class: 'form-control', id, value: v ?? '', maxlength: f.max ?? null }),
    text: (f, v, id) => h('textarea', { class: 'form-control', id, rows: f.rows ?? 4 }, v ?? ''),
    json: (f, v, id) => h('textarea', { class: 'form-control font-monospace', id, rows: f.rows ?? 4 }, v == null ? '' : JSON.stringify(v, null, 2)),
    int: (f, v, id) => h('input', { type: 'number', class: 'form-control', id, value: v ?? '', step: 1, min: f.min ?? null, max: f.max ?? null }),
    float: (f, v, id) => h('input', { type: 'number', class: 'form-control', id, value: v ?? '', step: 'any', min: f.min ?? null, max: f.max ?? null }),
    date: (f, v, id) => h('input', { type: 'date', class: 'form-control', id, value: v ?? '' }),
    datetime: (f, v, id) => h('input', { type: 'datetime-local', class: 'form-control', id, value: v ? String(v).replace(' ', 'T').slice(0, 16) : '' }),
    color: (f, v, id) => h('input', { type: 'color', class: 'form-control form-control-color w-100', id, value: v || f.default || '#6ea8fe' }),
    bool: (f, v, id) => h('div', { class: 'form-check form-switch mt-1' },
        h('input', { type: 'checkbox', class: 'form-check-input', id, role: 'switch', checked: Boolean(v) }),
        h('label', { class: 'form-check-label', for: id }, f.label)),
    enum: (f, v, id) => h('select', { class: 'form-select', id },
        f.required ? null : h('option', { value: '' }, '—'),
        Object.entries(f.options).map(([key, label]) => h('option', { value: key, selected: String(v ?? f.default ?? '') === key }, label))),
    image: (f, v, id) => imageControl(v, id),
    ref: (f, v, id) => {
        const select = h('select', { class: 'form-select', id }, h('option', { value: '' }, 'Caricamento…'));
        loadRefOptions(select, f, v);
        return select;
    },
};

/**
 * Campo immagine: il file viene caricato subito (POST /api/uploads) e nel campo
 * nascosto resta solo il percorso, che si salva insieme al resto del form.
 */
function imageControl(value, id) {
    const hidden = h('input', { type: 'hidden', id, value: value ?? '' });
    const preview = h('div', { class: 'image-field-preview' });
    const status = h('span', { class: 'small text-body-secondary' });
    const file = h('input', { type: 'file', class: 'form-control', accept: 'image/png,image/jpeg,image/gif,image/webp' });
    const clear = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'Togli immagine' }, h('i', { class: 'fa-solid fa-xmark' }));

    const show = () => {
        preview.replaceChildren(hidden.value ? h('img', { src: url(hidden.value), alt: '' }) : h('span', { class: 'text-body-tertiary small' }, 'Nessuna immagine'));
        clear.hidden = !hidden.value;
    };
    file.addEventListener('change', async () => {
        if (!file.files.length) return;
        status.textContent = 'Caricamento…';
        file.disabled = true;
        try {
            hidden.value = (await api.upload(file.files[0])).path;
            status.textContent = '';
            show();
        } catch (error) {
            status.textContent = error.message;
            status.className = 'small text-danger';
        } finally {
            file.disabled = false;
            file.value = '';
        }
    });
    clear.addEventListener('click', () => {
        hidden.value = '';
        show();
    });
    show();
    return h('div', { class: 'image-field' }, preview, h('div', { class: 'd-flex gap-2 align-items-center mt-2' }, file, clear), status, hidden);
}

async function loadRefOptions(select, field, value) {
    try {
        const [{ data }, target] = await Promise.all([resource(field.entity).list({ limit: 1000 }), getSchema(field.entity)]);
        const titleKey = target.title_field;
        select.replaceChildren(
            h('option', { value: '' }, '—'),
            ...data.map((row) => h('option', { value: row.id, selected: Number(value) === row.id }, row[titleKey] ?? row.name ?? `#${row.id}`)),
        );
    } catch (error) {
        select.replaceChildren(h('option', { value: '' }, `Errore: ${error.message}`));
    }
}

/**
 * @param {object} schema
 * @param {object|null} record  valori iniziali (null = valori predefiniti)
 * @param {{exclude?: string[]}} options  campi da non mostrare (es. la chiave del record "padre")
 */
export function renderForm(schema, record = null, { exclude = [] } = {}) {
    const form = h('form', { class: 'row g-3', novalidate: true, autocomplete: 'off' });

    for (const [name, field] of Object.entries(schema.fields)) {
        if (exclude.includes(name)) continue;
        const id = inputId(schema, name);
        const width = field.width ?? (HALF_BY_DEFAULT.includes(field.type) ? 'half' : 'full');
        const value = record ? record[name] : field.default;
        const control = controls[field.type](field, value, id);
        control.dataset.field = name;

        form.append(h('div', { class: width === 'half' ? 'col-md-6' : 'col-12' },
            field.type === 'bool' ? null : h('label', { class: 'form-label', for: id },
                field.label, field.required ? h('span', { class: 'text-danger ms-1' }, '*') : null),
            control,
            h('div', { class: 'invalid-feedback', dataset: { errorFor: name } }),
            field.help ? h('div', { class: 'form-text' }, field.help) : null,
        ));
    }
    // Invio con Ctrl+Invio anche dentro le aree di testo
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            form.requestSubmit();
        }
    });
    // Un pulsante submit nascosto rende attivo l'invio con Enter nei campi di una riga
    form.append(h('button', { type: 'submit', hidden: true, tabindex: -1 }));
    return form;
}

export function readForm(form, schema) {
    const data = {};
    for (const [name, field] of Object.entries(schema.fields)) {
        const el = form.querySelector(`#${inputId(schema, name)}`);
        if (!el) continue;
        if (field.type === 'bool') {
            data[name] = el.checked;
        } else if (field.type === 'json') {
            const raw = el.value.trim();
            try {
                data[name] = raw === '' ? null : JSON.parse(raw);
            } catch {
                data[name] = raw; // il server segnalerà l'errore
            }
        } else if (['int', 'float', 'ref'].includes(field.type)) {
            data[name] = el.value === '' ? null : Number(el.value);
        } else {
            data[name] = el.value;
        }
    }
    return data;
}

/** Mostra gli errori restituiti dal server (details.fields) sotto i rispettivi campi. */
export function showErrors(form, errors = {}) {
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form.querySelectorAll('[data-error-for]').forEach((el) => { el.textContent = ''; el.style.display = ''; });

    let first = null;
    for (const [name, message] of Object.entries(errors)) {
        const control = form.querySelector(`[data-field="${name}"]`);
        const feedback = form.querySelector(`[data-error-for="${name}"]`);
        const target = control?.matches('div') ? control.querySelector('input') : control;
        target?.classList.add('is-invalid');
        if (feedback) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
        first ??= target;
    }
    first?.focus();
}

/** Mette il cursore nel primo campo del form. */
export function focusFirst(form) {
    form.querySelector('input:not([type=hidden]):not([type=color]), textarea, select')?.focus();
}

/**
 * Collega l'invio del form al salvataggio: legge i dati, chiama save(data),
 * mostra gli errori di validazione del server sotto i campi, disabilita il pulsante durante l'attesa.
 * Esc dentro il form esegue onCancel (se indicato) invece di chiudere la finestra.
 */
export function attachSubmit(form, schema, { save, onCancel = null, submitButton = null }) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitButton) submitButton.disabled = true;
        try {
            showErrors(form, {});
            await save(readForm(form, schema));
        } catch (error) {
            if (error instanceof ApiError && error.details?.fields) showErrors(form, error.details.fields);
            else emit('app:error', { message: error.message });
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
    if (onCancel) {
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
            }
        });
    }
}
