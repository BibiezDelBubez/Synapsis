/**
 * Accesso uniforme alle entità via API REST generica.
 *   const cases = resource('cases');
 *   await cases.list({ q: 'villa', status: 'draft' });
 * Ogni scrittura emette 'data:changed' così le viste aperte possono aggiornarsi.
 */
import { api } from './api.js';
import { emit } from './dom.js';

function queryString(params = {}) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') qs.append(key, value);
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
}

export function resource(entity) {
    const changed = (action, record) => {
        emit('data:changed', { entity, action, record });
        return record;
    };

    return {
        entity,
        list: (params) => api.get(`${entity}${queryString(params)}`),
        get: async (id) => (await api.get(`${entity}/${id}`)).data,
        create: async (data) => changed('create', (await api.post(entity, data)).data),
        update: async (id, data) => changed('update', (await api.patch(`${entity}/${id}`, data)).data),
        remove: async (id) => {
            await api.del(`${entity}/${id}`);
            changed('delete', { id });
        },
    };
}

/** Schemi delle entità (config/entities), caricati una sola volta. */
let schemaCache = null;

/** Tutti gli schemi: { nome: schema } */
export function getSchemas() {
    schemaCache ??= api.get('schema').then((r) => r.schemas);
    return schemaCache;
}

export async function getSchema(entity) {
    const schemas = await getSchemas();
    if (!schemas[entity]) throw new Error(`Schema mancante: ${entity}`);
    return schemas[entity];
}
