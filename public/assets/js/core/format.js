/**
 * Visualizzazione dei valori secondo il tipo di campo dello schema.
 * Usata da tabelle, pannello di dettaglio e ricerca: un solo punto per tutte le regole.
 */
import { formatDateTime, h, icon, on } from './dom.js';
import { url } from './api.js';
import { getSchema, resource } from './resource.js';

const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('it-IT');

/**
 * Mappe id → titolo per i campi di tipo ref, caricate una volta per entità
 * e invalidate quando quell'entità cambia (vedi invalidateRefs).
 */
const refCache = new Map();

export function loadRefMap(entity) {
    if (!refCache.has(entity)) {
        refCache.set(entity, Promise.all([resource(entity).list({ limit: 1000 }), getSchema(entity)])
            .then(([{ data }, schema]) => new Map(data.map((row) => [row.id, row[schema.title_field] ?? row._title ?? `#${row.id}`])))
            .catch(() => new Map()));
    }
    return refCache.get(entity);
}

export function invalidateRefs(entity = null) {
    if (entity) refCache.delete(entity);
    else refCache.clear();
}

on('data:changed', ({ entity }) => invalidateRefs(entity));
on('case:changed', () => invalidateRefs());

/** "Nuovo personaggio" / "Nuova proprietà" secondo il genere dichiarato nello schema. */
export const newLabel = (schema) => `${schema.gender === 'f' ? 'Nuova' : 'Nuovo'} ${schema.label.toLowerCase()}`;

/** Carica le mappe dei ref usati da un insieme di campi. @returns {Promise<Object<string, Map>>} */
export async function loadRefsFor(schema, fieldNames = Object.keys(schema.fields)) {
    const refs = {};
    await Promise.all(fieldNames
        .filter((name) => schema.fields[name]?.type === 'ref')
        .map(async (name) => { refs[name] = await loadRefMap(schema.fields[name].entity); }));
    return refs;
}

/**
 * Restituisce un nodo DOM (o testo) per il valore di un campo.
 * @param {object} field  definizione del campo
 * @param {*} value
 * @param {Map|undefined} refMap  per i campi ref: id → titolo
 * @param {boolean} compact  true nelle tabelle (testi lunghi troncati)
 */
export function formatValue(field, value, refMap = undefined, compact = false) {
    if (value === null || value === undefined || value === '') {
        return h('span', { class: 'text-body-tertiary' }, '—');
    }
    const affix = (text) => `${field.prefix ?? ''}${text}${field.suffix ?? ''}`;
    switch (field.type) {
        case 'enum':
            return h('span', { class: `badge badge-enum enum-${value}` }, field.options[value] ?? value);
        case 'bool':
            return value ? icon('fa-check text-success') : icon('fa-xmark text-body-tertiary');
        case 'image':
            return h('img', { class: compact ? 'image-thumb' : 'image-full', src: url(value), alt: '', loading: 'lazy' });
        case 'color':
            return h('span', { class: 'color-swatch', style: `background:${value}`, title: value });
        case 'ref':
            return h('span', { class: 'ref-link', dataset: { refEntity: field.entity, refId: value } },
                refMap?.get(Number(value)) ?? `#${value}`);
        case 'float':
            return field.format === 'currency' ? currency.format(value) : affix(number.format(value));
        case 'int':
            return affix(number.format(value));
        case 'datetime':
            return formatDateTime(value);
        case 'date':
            return new Date(`${value}T00:00:00`).toLocaleDateString('it-IT');
        case 'json':
            return h('code', {}, JSON.stringify(value));
        case 'text':
            return compact
                ? h('span', { class: 'text-truncate d-inline-block', style: 'max-width:28ch' }, value)
                : h('span', { class: 'text-prewrap' }, value);
        default:
            return affix(String(value));
    }
}
