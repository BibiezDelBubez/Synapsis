/**
 * Registro centralizzato delle scorciatoie da tastiera.
 * Uso: hotkeys.register('alt+t', () => ..., 'Cambia tema');
 * Combinazioni: modificatori (ctrl, alt, shift, meta) + tasto, separati da "+".
 * I simboli ('?', '/') si registrano da soli, senza 'shift': valgono su qualsiasi layout.
 * Le scorciatoie senza ctrl/alt/meta vengono ignorate mentre si scrive in un campo.
 */
const bindings = new Map();

function normalize(combo) {
    const parts = combo.toLowerCase().split('+').map((p) => p.trim());
    const key = parts.pop();
    const mods = ['ctrl', 'alt', 'shift', 'meta'].filter((m) => parts.includes(m));
    return [...mods, key].join('+');
}

function comboFromEvent(event) {
    const command = event.ctrlKey || event.altKey || event.metaKey;
    const code = event.code ?? '';
    // Lettere e (con Ctrl/Alt) numeri si leggono da event.code: indipendente dal layout,
    // così Alt+C o Alt+1 funzionano anche su tastiera italiana.
    let key;
    if (code.startsWith('Key')) key = code.slice(3).toLowerCase();
    else if (command && code.startsWith('Digit')) key = code.slice(5);
    else key = (event.key ?? '').toLowerCase();

    // Simboli senza Ctrl/Alt ('?', '/'): lo Shift fa parte del carattere, quindi si ignora
    if (!command && key.length === 1 && !/[a-z0-9]/.test(key)) return key;

    const mods = [];
    if (event.ctrlKey) mods.push('ctrl');
    if (event.altKey) mods.push('alt');
    if (event.shiftKey) mods.push('shift');
    if (event.metaKey) mods.push('meta');
    return [...mods, key].join('+');
}

function isTyping(target) {
    return target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    const stack = bindings.get(comboFromEvent(event));
    const binding = stack?.[stack.length - 1];
    if (!binding) return;
    const hasCommandModifier = event.ctrlKey || event.altKey || event.metaKey;
    if (!hasCommandModifier && isTyping(event.target)) return;
    event.preventDefault();
    binding.handler(event);
});

export const hotkeys = {
    /**
     * Registra una scorciatoia. Se la combinazione è già usata, la nuova ha la precedenza
     * finché non viene rimossa: così una vista può "prendere in prestito" un tasto
     * (es. Alt+N) e restituirlo all'uscita.
     */
    register(combo, handler, description = '') {
        const key = normalize(combo);
        if (!bindings.has(key)) bindings.set(key, []);
        bindings.get(key).push({ combo, handler, description });
    },
    /** Rimuove la scorciatoia indicata (o l'ultima registrata per quella combinazione). */
    unregister(combo, handler = null) {
        const key = normalize(combo);
        const stack = bindings.get(key);
        if (!stack) return;
        const index = handler ? stack.findLastIndex((b) => b.handler === handler) : stack.length - 1;
        if (index >= 0) stack.splice(index, 1);
        if (!stack.length) bindings.delete(key);
    },
    /** Scorciatoie attive (per la finestra di aiuto). */
    list() {
        return [...bindings.values()].map((stack) => stack[stack.length - 1]).map(({ combo, description }) => ({ combo, description }));
    },
};
