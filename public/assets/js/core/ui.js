/**
 * Comportamenti di interfaccia condivisi: tema e menu laterale.
 * I pulsanti si collegano in modo dichiarativo con data-action="nome-azione".
 */
import { emit } from './dom.js';
import { prefs } from './prefs.js';

const root = document.documentElement;

export const theme = {
    current: () => root.dataset.bsTheme || 'dark',
    set(value) {
        root.dataset.bsTheme = value;
        prefs.set('theme', value);
        emit('theme:changed', { theme: value });
    },
    toggle() {
        theme.set(theme.current() === 'dark' ? 'light' : 'dark');
    },
};

export const sidebar = {
    apply(collapsed) {
        document.body.classList.toggle('sidebar-collapsed', collapsed);
    },
    toggle() {
        const collapsed = !document.body.classList.contains('sidebar-collapsed');
        sidebar.apply(collapsed);
        prefs.set('sidebar.collapsed', collapsed ? '1' : '0');
    },
    restore() {
        sidebar.apply(prefs.get('sidebar.collapsed') === '1');
    },
};

/** Registro delle azioni attivabili con data-action. */
const actions = new Map();

export function registerAction(name, handler) {
    actions.set(name, handler);
}

document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    const handler = actions.get(trigger.dataset.action);
    if (handler) {
        event.preventDefault();
        handler(trigger, event);
    }
});

// I link dei moduli non ancora attivi non devono navigare
document.addEventListener('click', (event) => {
    const link = event.target.closest('a[aria-disabled="true"]');
    if (link) event.preventDefault();
});
