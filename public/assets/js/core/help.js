/**
 * Finestra di aiuto delle scorciatoie (tasto ?).
 * Elenca in automatico tutte le scorciatoie registrate in quel momento (anche quelle della vista aperta)
 * più i tasti locali di elenchi e form.
 */
import { h, icon } from './dom.js';
import { hotkeys } from './hotkeys.js';
import { modal } from './modal.js';

const LOCAL_KEYS = [
    ['↑ ↓', 'Scorri risultati e righe'],
    ['Invio', 'Apri l\'elemento selezionato'],
    ['Ctrl+Invio', 'Salva il form'],
    ['Esc', 'Annulla la modifica / chiudi'],
];

const pretty = (combo) => combo
    .split('+')
    .map((k) => ({ ctrl: 'Ctrl', alt: 'Alt', shift: 'Maiusc', meta: '⌘', escape: 'Esc' }[k] ?? (k.length === 1 ? k.toUpperCase() : k)))
    .map((k) => h('kbd', {}, k));

function table(rows) {
    return h('table', { class: 'table table-sm mb-0 shortcuts-table' },
        h('tbody', {}, ...rows.map(([keys, description]) => h('tr', {},
            h('td', { class: 'text-nowrap' }, ...keys),
            h('td', {}, description)))));
}

export function openHelp() {
    const global = hotkeys.list().map(({ combo, description }) => [pretty(combo), description]);
    const local = LOCAL_KEYS.map(([k, d]) => [[h('kbd', {}, k)], d]);

    modal.open({
        title: 'Scorciatoie da tastiera',
        icon: 'fa-keyboard',
        size: null,
        body: h('div', {},
            h('h3', { class: 'h6 text-body-secondary' }, 'Ovunque'),
            table(global),
            h('h3', { class: 'h6 text-body-secondary mt-3' }, 'In elenchi e form'),
            table(local)),
        footer: h('small', { class: 'text-body-secondary me-auto' }, icon('fa-circle-info', 'me-1'),
            'Le scorciatoie senza Ctrl/Alt non si attivano mentre scrivi in un campo.'),
    });
}
