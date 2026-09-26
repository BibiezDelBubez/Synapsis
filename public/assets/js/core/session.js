/**
 * Stato di lavoro condiviso: il caso attualmente aperto.
 * Chi deve reagire al cambio di caso ascolta l'evento 'case:changed'.
 */
import { api } from './api.js';
import { emit, on } from './dom.js';

let activeCase = null;

export const session = {
    get activeCase() {
        return activeCase;
    },

    async load() {
        activeCase = (await api.get('session')).active_case;
        emit('case:changed', { case: activeCase });
        return activeCase;
    },

    /** Apre un caso (id) oppure chiude quello aperto (null). */
    async openCase(id) {
        activeCase = (await api.put('session/case', { id })).active_case;
        emit('case:changed', { case: activeCase });
        return activeCase;
    },
};

// Mantiene coerente lo stato se il caso aperto viene modificato o eliminato
on('data:changed', ({ entity, action, record }) => {
    if (entity !== 'cases' || !activeCase || record?.id !== activeCase.id) return;
    activeCase = action === 'delete' ? null : record;
    emit('case:changed', { case: activeCase });
});
