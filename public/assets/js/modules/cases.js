/**
 * Modulo Casi: elenco dei romanzi, apertura/chiusura del caso attivo.
 * Tutta la logica di elenco e form è nel gestore generico (core/entity-manager.js).
 */
import { formatDateTime } from '../core/dom.js';
import { openManager } from '../core/entity-manager.js';
import { modal } from '../core/modal.js';
import { session } from '../core/session.js';

export function openCases() {
    return openManager('cases', {
        describe: (row, schema) => ({
            title: row.title,
            subtitle: row.subtitle,
            color: row.color,
            badges: [schema.fields.status.options[row.status] ?? row.status],
            meta: `Modificato ${formatDateTime(row.updated_at)}`,
        }),
        isActive: (row) => session.activeCase?.id === row.id,
        primary: (row) => (session.activeCase?.id === row.id
            ? { label: 'Chiudi', icon: 'fa-folder-closed', run: async () => { await session.openCase(null); modal.close(); } }
            : { label: 'Apri', icon: 'fa-folder-open', run: async () => { await session.openCase(row.id); modal.close(); } }),
        // Un caso appena creato viene aperto subito
        afterCreate: async (row) => {
            await session.openCase(row.id);
            modal.close();
        },
    });
}
