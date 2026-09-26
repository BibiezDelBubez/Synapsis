/**
 * Finestra modale unica e riutilizzabile (Bootstrap Modal).
 *   modal.open({ title, icon, size: 'lg', body: nodo, footer: nodo })
 *   modal.setBody(nodo) / modal.setFooter(nodo) / modal.close()
 * Esc chiude la finestra (comportamento standard di Bootstrap).
 */
import { h, icon as faIcon } from './dom.js';

let element = null;
let instance = null;
let onCloseHandler = null;

function ensure() {
    if (element) return;
    element = h('div', { class: 'modal fade', id: 'app-modal', tabindex: -1, 'aria-hidden': 'true' },
        h('div', { class: 'modal-dialog modal-dialog-scrollable' },
            h('div', { class: 'modal-content' },
                h('div', { class: 'modal-header py-2' },
                    h('h2', { class: 'modal-title h6 d-flex align-items-center gap-2' }),
                    h('button', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'modal', 'aria-label': 'Chiudi' })),
                h('div', { class: 'modal-body' }),
                h('div', { class: 'modal-footer py-2' }))));
    document.body.append(element);
    instance = new window.bootstrap.Modal(element);
    element.addEventListener('hidden.bs.modal', () => {
        const handler = onCloseHandler;
        onCloseHandler = null;
        handler?.();
    });
}

const part = (selector) => element.querySelector(selector);

export const modal = {
    open({ title = '', icon = null, size = 'lg', body = null, footer = null, onClose = null } = {}) {
        ensure();
        onCloseHandler = onClose;
        part('.modal-dialog').className = `modal-dialog modal-dialog-scrollable${size ? ` modal-${size}` : ''}`;
        modal.setTitle(title, icon);
        modal.setBody(body);
        modal.setFooter(footer);
        instance.show();
    },
    setTitle(title, icon = null) {
        part('.modal-title').replaceChildren(...(icon ? [faIcon(icon)] : []), title);
    },
    setBody(node) {
        part('.modal-body').replaceChildren(...(node ? [node] : []));
    },
    setFooter(node) {
        const footer = part('.modal-footer');
        footer.replaceChildren(...(node ? [node] : []));
        footer.hidden = !node;
    },
    close() {
        instance?.hide();
    },
    isOpen() {
        return Boolean(element?.classList.contains('show'));
    },
    /** Esegue fn quando la finestra è completamente visibile (per dare il focus). */
    whenShown(fn) {
        if (element.classList.contains('show')) fn();
        else element.addEventListener('shown.bs.modal', fn, { once: true });
    },
};
