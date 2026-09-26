/**
 * Notifiche brevi in basso a destra (Bootstrap Toast).
 *   toast('Salvato', 'success')
 * Ogni errore emesso come evento 'app:error' viene mostrato automaticamente.
 */
import { h, on } from './dom.js';

let container = null;

export function toast(message, variant = 'danger', delay = 4000) {
    container ??= document.body.appendChild(h('div', { class: 'toast-container position-fixed bottom-0 end-0 p-3' }));
    const el = h('div', { class: `toast align-items-center text-bg-${variant} border-0`, role: 'alert', 'aria-live': 'assertive' },
        h('div', { class: 'd-flex' },
            h('div', { class: 'toast-body' }, message),
            h('button', { type: 'button', class: 'btn-close btn-close-white me-2 m-auto', 'data-bs-dismiss': 'toast', 'aria-label': 'Chiudi' })));
    container.append(el);
    el.addEventListener('hidden.bs.toast', () => el.remove());
    new window.bootstrap.Toast(el, { delay }).show();
}

on('app:error', ({ message }) => toast(message, 'danger'));
