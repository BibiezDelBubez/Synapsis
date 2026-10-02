/**
 * Router della SPA basato sul registro dei moduli (config/modules.php, incluso nella pagina).
 * Ogni modulo attivo ha un path e una vista: public/assets/js/views/{view}.js
 * La vista esporta mount(container, { module, params }) e può restituire una funzione di pulizia.
 *
 * Navigazione: link con attributo data-link, router.navigate('/percorso'), Alt+1…9.
 */
import { url } from './api.js';
import { emit, h } from './dom.js';
import { hotkeys } from './hotkeys.js';
import { renderNotFound } from './not-found.js';

const BASE = new URL(url('/'), location.origin).pathname.replace(/\/$/, '');
const modules = JSON.parse(document.getElementById('app-modules')?.textContent || '[]');
const enabled = modules.filter((m) => m.enabled);

let cleanup = null;
let current = null;
let renderToken = 0;

function currentPath() {
    let path = location.pathname;
    if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
    return `/${path.replace(/^\/+|\/+$/g, '')}`;
}

function findModule(path) {
    return enabled.find((m) => m.path === path) ?? null;
}

function highlight(module) {
    document.querySelectorAll('.sidebar-link[data-module]').forEach((link) => {
        link.classList.toggle('active', link.dataset.module === module?.id);
    });
}

function notFound(container, path) {
    renderNotFound(container, path);
}

let showingNotFound = false;

async function render() {
    const token = ++renderToken;
    const container = document.getElementById('app-content');
    const path = currentPath();
    const module = findModule(path);

    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    current = module;
    highlight(module);

    showingNotFound = !module;
    if (!module) {
        notFound(container, path);
        return;
    }

    try {
        const view = await import(`../views/${module.view}.js`);
        if (token !== renderToken) return; // nel frattempo si è già navigato altrove
        container.replaceChildren();
        container.scrollTop = 0;
        cleanup = await view.mount(container, { module });
        emit('route:changed', { module });
    } catch (error) {
        container.replaceChildren(h('div', { class: 'alert alert-danger m-3' }, `Impossibile aprire «${module.label}»: ${error.message}`));
    }
}

export const router = {
    modules: enabled,
    get current() {
        return current;
    },
    /** true se è mostrata la pagina «Nessun modulo a …». */
    get notFound() {
        return showingNotFound;
    },
    navigate(path) {
        const target = url(path);
        if (target !== location.pathname + location.search) history.pushState({}, '', target);
        return render();
    },
    /** Ridisegna la vista corrente (es. dopo il cambio di caso). */
    refresh: () => render(),
    start() {
        window.addEventListener('popstate', render);
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-link]');
            if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            const path = new URL(link.href).pathname;
            router.navigate(BASE && path.startsWith(BASE) ? path.slice(BASE.length) || '/' : path);
        });
        enabled.slice(0, 9).forEach((module, index) => {
            hotkeys.register(`alt+${index + 1}`, () => router.navigate(module.path), `Vai a ${module.label}`);
        });
        return render();
    },
};
