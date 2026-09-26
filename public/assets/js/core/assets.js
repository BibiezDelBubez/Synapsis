/**
 * Caricamento su richiesta (una sola volta) delle librerie locali in public/vendor/:
 * le pagine che non le usano restano leggere.
 *   await loadScript('vendor/vis-network/vis-network.min.js');
 */
import { url } from './api.js';

const loaded = new Map();

function once(key, create) {
    if (!loaded.has(key)) {
        loaded.set(key, new Promise((resolve, reject) => {
            const el = create();
            el.addEventListener('load', () => resolve(el));
            el.addEventListener('error', () => {
                loaded.delete(key);
                reject(new Error(`Impossibile caricare ${key}`));
            });
            document.head.append(el);
        }));
    }
    return loaded.get(key);
}

export function loadScript(path) {
    return once(path, () => Object.assign(document.createElement('script'), { src: url(path) }));
}

export function loadStyle(path) {
    return once(path, () => Object.assign(document.createElement('link'), { rel: 'stylesheet', href: url(path) }));
}
