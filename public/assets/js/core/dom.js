/**
 * Piccoli strumenti DOM condivisi da tutti i moduli.
 */

/** Escape per inserire testo in HTML costruito a stringhe. */
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Crea un elemento: h('button', { class: 'btn', onclick: fn, dataset: { id: 1 } }, 'Testo', altroNodo)
 * Gli attributi con valore null/false vengono omessi; true li imposta vuoti.
 */
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs ?? {})) {
        if (value === null || value === undefined || value === false) continue;
        if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2), value);
        } else if (key === 'dataset') {
            Object.assign(el.dataset, value);
        } else if (key === 'html') {
            el.innerHTML = value;
        } else if (key in el && typeof value !== 'string' && key !== 'list') {
            el[key] = value;
        } else {
            el.setAttribute(key, value === true ? '' : value);
        }
    }
    for (const child of children.flat()) {
        if (child === null || child === undefined || child === false) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
}

/** Icona FontAwesome: icon('fa-pen') */
export const icon = (name, extra = '') => h('i', { class: `fa-solid ${name} ${extra}`.trim(), 'aria-hidden': 'true' });

/** Data "AAAA-MM-GG hh:mm:ss" → formato italiano breve. */
export function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Eventi applicativi globali (es. 'case:changed', 'data:changed').
 * on() accetta { signal } di un AbortController per rimuovere l'ascolto (le viste lo usano all'uscita).
 */
export const emit = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, handler, options = undefined) => document.addEventListener(name, (e) => handler(e.detail), options);

/**
 * Pulsante con conferma a due clic (niente finestre di dialogo del browser):
 * il primo clic mostra "Conferma", il secondo esegue onConfirm entro pochi secondi.
 */
export function confirmButton({ label = '', title = 'Elimina', iconName = 'fa-trash', className = 'btn btn-sm btn-icon', onConfirm }) {
    let timer = null;
    const idle = () => [icon(iconName, label ? 'me-1' : ''), label].filter(Boolean);
    const btn = h('button', { type: 'button', class: className, title }, ...idle());
    const reset = () => {
        btn.classList.remove('confirming', 'btn-danger');
        btn.replaceChildren(...idle());
    };
    btn.addEventListener('click', async () => {
        if (!btn.classList.contains('confirming')) {
            btn.classList.add('confirming', 'btn-danger');
            btn.replaceChildren(icon(iconName, 'me-1'), 'Conferma');
            timer = setTimeout(reset, 3000);
            return;
        }
        clearTimeout(timer);
        reset();
        await onConfirm();
    });
    return btn;
}
