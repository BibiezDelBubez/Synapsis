/**
 * Visualizzatore di planimetrie con segnaposto.
 *
 * - L'immagine si ingrandisce con la rotellina (attorno al puntatore) e si sposta trascinando lo sfondo.
 * - I segnaposto sono salvati come frazioni (0–1) dell'immagine: restano al loro posto a qualsiasi zoom.
 * - Trascinare un segnaposto lo sposta (salvataggio immediato); clic = apre la scheda.
 * - Doppio clic sulla mappa, oppure modalità "aggiungi" (P) + clic: nuovo segnaposto in quel punto.
 */
import { url } from '../core/api.js';
import { h, icon } from '../core/dom.js';
import { panel } from '../core/panel.js';
import { prefs } from '../core/prefs.js';
import { resource } from '../core/resource.js';
import { session } from '../core/session.js';
import { toast } from '../core/toast.js';

export const PIN_KINDS = {
    place: { icon: 'fa-location-dot', color: '#6ea8fe' },
    person: { icon: 'fa-user', color: '#63e6be' },
    body: { icon: 'fa-skull', color: '#e03131' },
    clue: { icon: 'fa-magnifying-glass', color: '#f59f00' },
    door: { icon: 'fa-door-open', color: '#b197fc' },
    other: { icon: 'fa-circle', color: '#adb5bd' },
};

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function mapViewer({ pinSchema }) {
    const state = { maps: [], pins: [], mapId: prefs.get('space.map', null), scale: 1, tx: 0, ty: 0, addMode: false, fitted: null };

    const select = h('select', { class: 'form-select form-select-sm', style: 'width:auto;min-width:14rem', 'aria-label': 'Planimetria' });
    const editBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'Scheda della planimetria' }, icon('fa-pen'));
    const addBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'Aggiungi segnaposto (P)' }, icon('fa-location-dot', 'me-1'), 'Segnaposto');
    const fitBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'Adatta alla finestra (F)' }, icon('fa-expand'));
    const zoomLabel = h('span', { class: 'small text-body-secondary', style: 'min-width:3.5rem' });

    const img = h('img', { class: 'map-image', alt: '', draggable: false });
    const pinLayer = h('div', { class: 'map-pins' });
    const canvas = h('div', { class: 'map-canvas' }, img, pinLayer);
    const hint = h('div', { class: 'graph-hint', hidden: true }, 'Clicca sulla planimetria per mettere il segnaposto · Esc per annullare');
    const empty = h('div', { class: 'graph-empty', hidden: true });
    const legend = h('div', { class: 'graph-legend' },
        ...Object.entries(PIN_KINDS).map(([kind, k]) => h('span', {}, h('i', { class: `fa-solid ${k.icon}`, style: `color:${k.color}`, 'aria-hidden': 'true' }), pinSchema.fields.kind.options[kind])));
    const stage = h('div', { class: 'graph-stage map-stage' }, canvas, hint, empty, legend);

    const el = h('div', { class: 'graph-body' },
        h('div', { class: 'graph-toolbar' }, select, editBtn, addBtn, fitBtn, zoomLabel,
            h('span', { class: 'small text-body-tertiary ms-auto d-none d-lg-inline' }, 'Rotellina: zoom · trascina: sposta · doppio clic: segnaposto')),
        stage);

    const currentMap = () => state.maps.find((m) => m.id === state.mapId) ?? null;

    // --- Trasformazioni ---------------------------------------------------------------
    function apply() {
        canvas.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
        canvas.style.setProperty('--inv', String(1 / state.scale));
        zoomLabel.textContent = img.naturalWidth ? `${Math.round(state.scale * 100)} %` : '';
    }

    function fit() {
        if (!img.naturalWidth || !stage.clientWidth) return;
        const s = clamp(Math.min(stage.clientWidth / img.naturalWidth, stage.clientHeight / img.naturalHeight) * 0.95, MIN_SCALE, MAX_SCALE);
        state.scale = s;
        state.tx = (stage.clientWidth - img.naturalWidth * s) / 2;
        state.ty = (stage.clientHeight - img.naturalHeight * s) / 2;
        state.fitted = state.mapId;
        apply();
    }

    function zoom(factor, cx = stage.clientWidth / 2, cy = stage.clientHeight / 2) {
        const s = clamp(state.scale * factor, MIN_SCALE, MAX_SCALE);
        state.tx = cx - (cx - state.tx) * (s / state.scale);
        state.ty = cy - (cy - state.ty) * (s / state.scale);
        state.scale = s;
        apply();
    }

    /** Coordinate del puntatore come frazioni dell'immagine (0–1). */
    function toImage(event) {
        const rect = stage.getBoundingClientRect();
        return {
            x: clamp((event.clientX - rect.left - state.tx) / state.scale / img.naturalWidth, 0, 1),
            y: clamp((event.clientY - rect.top - state.ty) / state.scale / img.naturalHeight, 0, 1),
        };
    }

    // --- Disegno ---------------------------------------------------------------------------
    function render() {
        select.replaceChildren(...state.maps.map((m) => h('option', { value: m.id, selected: m.id === state.mapId }, m.name)));
        select.disabled = !state.maps.length;
        const map = currentMap();
        editBtn.disabled = !map;
        addBtn.disabled = !map?.image;
        fitBtn.disabled = !map?.image;

        let message = null;
        if (!session.activeCase) {
            message = h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso');
        } else if (!map) {
            message = [h('p', { class: 'mb-2' }, 'Nessuna planimetria nel caso.'),
                h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => createMap() }, icon('fa-plus', 'me-1'), 'Nuova planimetria')];
        } else if (!map.image) {
            message = [h('p', { class: 'mb-2' }, 'Questa planimetria non ha ancora un\'immagine.'),
                h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => editMap() }, icon('fa-upload', 'me-1'), 'Carica immagine')];
        }
        empty.replaceChildren(...[message].flat().filter(Boolean));
        empty.hidden = !message;
        canvas.hidden = Boolean(message);
        legend.hidden = Boolean(message);
        if (message) {
            setAddMode(false);
            return;
        }

        const src = url(map.image);
        if (img.getAttribute('src') !== src) {
            state.fitted = null;
            img.src = src;
        } else if (img.complete && state.fitted !== state.mapId) {
            fit();
        }
        renderPins();
    }

    function renderPins() {
        const map = currentMap();
        const selected = panel.current?.entity === 'map_pins' ? panel.current.id : null;
        pinLayer.replaceChildren(...state.pins.filter((p) => p.map_id === map?.id).map((p) => {
            const kind = PIN_KINDS[p.kind] ?? PIN_KINDS.other;
            return h('div', {
                class: `map-pin${p.id === selected ? ' selected' : ''}`,
                style: `left:${p.x * 100}%;top:${p.y * 100}%;--pin-color:${p.color || kind.color}`,
                title: [p.label, pinSchema.fields.kind.options[p.kind], p.note].filter(Boolean).join('\n'),
                dataset: { pinId: p.id },
            }, h('span', { class: 'map-pin-dot' }, icon(kind.icon)), h('span', { class: 'map-pin-label' }, p.label));
        }));
    }

    img.addEventListener('load', () => {
        if (state.fitted !== state.mapId) fit();
        else apply();
    });
    img.addEventListener('error', () => {
        empty.replaceChildren(h('p', { class: 'mb-0' }, 'Immagine non trovata sul disco: caricala di nuovo dalla scheda.'));
        empty.hidden = false;
    });

    // --- Interazione ------------------------------------------------------------------------
    let drag = null; // { type: 'pan'|'pin', startX, startY, moved, pin?, el?, tx, ty }

    stage.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || canvas.hidden || e.target.closest('.graph-empty .btn')) return;
        const pinEl = e.target.closest('.map-pin');
        drag = { type: pinEl && !state.addMode ? 'pin' : 'pan', startX: e.clientX, startY: e.clientY, moved: false, tx: state.tx, ty: state.ty };
        if (drag.type === 'pin') {
            drag.el = pinEl;
            drag.pin = state.pins.find((p) => p.id === Number(pinEl.dataset.pinId));
        }
        stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return;
        drag.moved = true;
        if (drag.type === 'pan') {
            state.tx = drag.tx + dx;
            state.ty = drag.ty + dy;
            stage.classList.add('panning');
            apply();
        } else {
            const { x, y } = toImage(e);
            drag.el.style.left = `${x * 100}%`;
            drag.el.style.top = `${y * 100}%`;
            drag.el.classList.add('dragging');
        }
    });

    stage.addEventListener('pointerup', async (e) => {
        const d = drag;
        drag = null;
        stage.classList.remove('panning');
        if (!d) return;
        if (d.type === 'pin') {
            d.el.classList.remove('dragging');
            if (!d.moved) {
                panel.open('map_pins', d.pin.id);
                return;
            }
            const { x, y } = toImage(e);
            try {
                const saved = await resource('map_pins').update(d.pin.id, { x: round(x), y: round(y) });
                Object.assign(d.pin, saved);
            } catch (error) {
                toast(error.message);
                renderPins();
            }
        } else if (!d.moved && state.addMode) {
            setAddMode(false);
            createPin(toImage(e));
        }
    });
    stage.addEventListener('pointercancel', () => { drag = null; renderPins(); });

    stage.addEventListener('dblclick', (e) => {
        if (canvas.hidden || e.target.closest('.map-pin')) return;
        createPin(toImage(e));
    });

    stage.addEventListener('wheel', (e) => {
        if (canvas.hidden) return;
        e.preventDefault();
        const rect = stage.getBoundingClientRect();
        zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    select.addEventListener('change', () => {
        state.mapId = Number(select.value);
        prefs.set('space.map', state.mapId);
        render();
    });
    editBtn.addEventListener('click', () => { if (currentMap()) panel.open('maps', state.mapId); });
    addBtn.addEventListener('click', () => setAddMode(!state.addMode));
    fitBtn.addEventListener('click', () => fit());

    new ResizeObserver(() => {
        if (state.fitted === state.mapId && img.naturalWidth && state.fitted !== null) apply();
        else if (img.complete && img.naturalWidth) fit();
    }).observe(stage);

    // --- Azioni ------------------------------------------------------------------------------
    const round = (v) => Math.round(v * 10000) / 10000;

    function setAddMode(on) {
        state.addMode = on && Boolean(currentMap()?.image);
        hint.hidden = !state.addMode;
        stage.classList.toggle('adding', state.addMode);
        addBtn.classList.toggle('active', state.addMode);
    }

    function createPin({ x, y }) {
        const map = currentMap();
        if (!map?.image) return;
        panel.create('map_pins', { map_id: map.id, x: round(x), y: round(y), place_id: map.place_id });
    }

    function createMap() {
        if (session.activeCase) panel.create('maps');
    }

    async function editMap() {
        await panel.open('maps', state.mapId);
        panel.edit();
    }

    return {
        el,
        createMap,
        /** Aggiorna i dati; se è stata appena creata una planimetria la mostra. */
        setData({ maps, pins }, focusMapId = null) {
            state.maps = maps;
            state.pins = pins;
            if (focusMapId) state.mapId = focusMapId;
            if (!maps.some((m) => m.id === state.mapId)) state.mapId = maps[0]?.id ?? null;
            if (focusMapId || state.mapId !== prefs.get('space.map', null)) prefs.set('space.map', state.mapId);
            render();
        },
        refreshSelection: () => renderPins(),
        toggleAdd: () => setAddMode(!state.addMode),
        cancelAdd: () => {
            if (!state.addMode) return false;
            setAddMode(false);
            return true;
        },
        fit,
        zoom,
    };
}
