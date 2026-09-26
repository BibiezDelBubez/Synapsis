/**
 * Schede interne di una vista (es. Grafo | Elenco). La scheda scelta viene ricordata.
 *
 *   const tabs = viewTabs([
 *       { id: 'graph', label: 'Grafo', icon: 'fa-diagram-project', persistent: true, render: (el) => …, onShow, onHide },
 *       { id: 'list',  label: 'Elenco', icon: 'fa-list', render: (el) => mountTable(el, …) },   // restituisce la pulizia
 *   ], { prefKey: 'relations.view', onChange: (id) => … });
 *   header.append(tabs.header); page.append(tabs.body); await tabs.start();
 *
 * persistent: disegnata una volta e poi solo nascosta (utile per grafi costosi);
 * altrimenti viene montata a ogni apertura e smontata all'uscita.
 */
import { h, icon } from './dom.js';
import { prefs } from './prefs.js';

export function viewTabs(tabs, { prefKey, onChange = null }) {
    const buttons = tabs.map((tab) => h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: () => select(tab.id) },
        icon(tab.icon, 'me-1'), tab.label));
    const panes = tabs.map(() => h('div', { class: 'view-pane', hidden: true }));
    const rendered = new Set();
    let current = null;
    let cleanup = null;

    async function select(id) {
        const index = Math.max(0, tabs.findIndex((t) => t.id === id));
        if (index === current) return;

        if (current !== null) {
            const previous = tabs[current];
            panes[current].hidden = true;
            buttons[current].classList.remove('active');
            previous.onHide?.();
            if (!previous.persistent) {
                cleanup?.();
                cleanup = null;
                panes[current].replaceChildren();
            }
        }

        current = index;
        const tab = tabs[index];
        buttons[index].classList.add('active');
        panes[index].hidden = false;
        prefs.set(prefKey, tab.id);

        if (tab.persistent) {
            if (!rendered.has(index)) {
                rendered.add(index);
                await tab.render(panes[index]);
            }
        } else {
            cleanup = await tab.render(panes[index]);
        }
        tab.onShow?.();
        onChange?.(tab.id);
    }

    return {
        header: h('div', { class: 'btn-group' }, ...buttons),
        body: h('div', { class: 'view-panes' }, ...panes),
        select,
        start: () => select(prefs.get(prefKey, tabs[0].id)),
        get current() {
            return current === null ? null : tabs[current].id;
        },
        destroy() {
            cleanup?.();
            cleanup = null;
        },
    };
}
