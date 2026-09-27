/**
 * Preferenze dell'interfaccia salvate nel browser (tema, menu compresso...).
 * Tutte le chiavi hanno il prefisso "sinapsi." e ogni accesso è protetto:
 * se il browser blocca lo storage l'app continua a funzionare con i valori predefiniti.
 */
const PREFIX = 'sinapsi.';

export const prefs = {
    get(key, fallback = null) {
        try {
            const value = localStorage.getItem(PREFIX + key);
            return value === null ? fallback : value;
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, String(value));
        } catch {
            /* storage non disponibile: la preferenza vale solo per questa sessione */
        }
    },
    /** Valori non testuali (numeri, booleani, liste): salvati come JSON. */
    getJSON(key, fallback = null) {
        const raw = this.get(key, null);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    },
    setJSON(key, value) {
        this.set(key, JSON.stringify(value));
    },
};
