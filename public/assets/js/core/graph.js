/**
 * Strumenti condivisi dalle viste a grafo e timeline (legami, alberi genealogici, doppia timeline).
 *   const { Network, DataSet } = await loadVis();
 *   const { Timeline, DataSet } = await loadTimeline();
 *   const theme = graphTheme();                     // colori del tema attivo
 *   const link = linkMode(network, stage, onLink);  // "trascina da un nodo all'altro"
 */
import { loadScript, loadStyle } from './assets.js';
import { h, icon } from './dom.js';

/*
 * vis-network e vis-timeline (build "standalone") si registrano entrambi come window.vis:
 * l'oggetto va catturato subito dopo il caricamento di ciascuno, altrimenti il secondo sovrascrive il primo.
 */
let visNetwork = null;
let visTimeline = null;

function loadVisBundle(script, style) {
    const lib = loadScript(script).then(() => window.vis);
    return Promise.all([lib, loadStyle(style)]).then(([vis]) => vis);
}

/** vis-network: { Network, DataSet } */
export function loadVis() {
    visNetwork ??= loadVisBundle('vendor/vis-network/vis-network.min.js', 'vendor/vis-network/vis-network.min.css');
    return visNetwork;
}

/** vis-timeline: { Timeline, DataSet } */
export function loadTimeline() {
    visTimeline ??= loadVisBundle('vendor/vis-timeline/vis-timeline-graph2d.min.js', 'vendor/vis-timeline/vis-timeline-graph2d.min.css');
    return visTimeline;
}

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Colori del tema chiaro/scuro in uso, da passare a vis-network. */
export function graphTheme() {
    return {
        font: cssVar('--bs-body-color'),
        bg: cssVar('--bs-body-bg'),
        border: cssVar('--bs-border-color'),
        muted: cssVar('--bs-secondary-color'),
        primary: cssVar('--bs-primary'),
    };
}

/**
 * Modalità "collega": l'utente trascina da un nodo all'altro e viene chiamato onLink(from, to, kind).
 * Più tipi di collegamento sulla stessa rete (es. genitore→figlio, unione) con start(kind, …).
 *
 * @param {object} network  istanza vis.Network
 * @param {HTMLElement} stage  contenitore del grafo (ospita l'avviso in alto)
 * @param {(from, to, kind) => void} onLink
 */
export function linkMode(network, stage, onLink) {
    const text = h('span');
    const hint = h('div', { class: 'graph-hint', hidden: true }, icon('fa-link', 'me-2'), text);
    stage.append(hint);
    let current = null; // { kind, button }

    network.setOptions({
        manipulation: {
            enabled: false,
            addEdge: (data, callback) => {
                callback(null); // l'arco vero arriva dal salvataggio del record
                const kind = current?.kind;
                stop();
                if (kind && data.from !== data.to) onLink(data.from, data.to, kind);
            },
        },
    });

    function start(kind, button = null, message = 'Trascina da un nodo all\'altro') {
        stop();
        current = { kind, button };
        button?.classList.add('active');
        text.textContent = `${message} · Esc annulla`;
        hint.hidden = false;
        network.addEdgeMode();
    }

    function stop() {
        if (!current) return;
        current.button?.classList.remove('active');
        current = null;
        hint.hidden = true;
        network.disableEditMode();
    }

    return {
        start,
        stop,
        toggle: (kind, button, message) => (current?.kind === kind ? stop() : start(kind, button, message)),
        get active() {
            return current !== null;
        },
    };
}
