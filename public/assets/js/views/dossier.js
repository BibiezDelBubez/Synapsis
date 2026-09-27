/**
 * Vista "Dossier del caso".
 *
 * - Dossier: scegli le sezioni, guarda l'anteprima, scarica il Markdown (.md) o stampa / salva in PDF
 *   (finestra di stampa del browser: "Salva come PDF"). Il testo è generato dal server a partire dagli schemi.
 * - Backup: esporta il caso (JSON con dati e immagini), ripristinalo come nuovo caso, scarica l'intero
 *   database SQLite, elimina le immagini non più usate.
 *
 * Tastiera: Ctrl+P stampa / PDF (nella scheda Dossier).
 */
import { api, url } from '../core/api.js';
import { emit, h, icon, on } from '../core/dom.js';
import { hotkeys } from '../core/hotkeys.js';
import { prefs } from '../core/prefs.js';
import { getSchemas } from '../core/resource.js';
import { session } from '../core/session.js';
import { toast } from '../core/toast.js';
import { viewTabs } from '../core/tabs.js';
import { marked } from '../../../vendor/marked/marked.esm.js';

export async function mount(container, { module }) {
    const schemas = await getSchemas();
    const state = { sections: null, selected: new Set(prefs.getJSON('dossier.sections', [])), markdown: '' };

    // --- Dossier -----------------------------------------------------------------------------------------
    const checks = h('div', { class: 'dossier-sections' });
    const preview = h('article', { class: 'dossier-preview' });
    const downloadBtn = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', onclick: () => downloadMarkdown() }, icon('fa-file-lines', 'me-1'), 'Scarica .md');
    const printBtn = h('button', { type: 'button', class: 'btn btn-sm btn-primary', title: 'Ctrl+P', onclick: () => print() }, icon('fa-print', 'me-1'), 'Stampa / PDF');
    const dossierView = h('div', { class: 'graph-body dossier-view' },
        h('aside', { class: 'dossier-side' },
            h('div', { class: 'small fw-semibold mb-2' }, 'Sezioni'),
            checks,
            h('div', { class: 'd-flex gap-2 mt-2' },
                h('button', { type: 'button', class: 'btn btn-link btn-sm p-0', onclick: () => selectAll(true) }, 'tutte'),
                h('button', { type: 'button', class: 'btn btn-link btn-sm p-0', onclick: () => selectAll(false) }, 'nessuna')),
            h('div', { class: 'd-grid gap-2 mt-3' }, printBtn, downloadBtn),
            h('p', { class: 'small text-body-tertiary mt-3 mb-0' }, 'Per il PDF scegli «Salva come PDF» nella finestra di stampa.')),
        h('div', { class: 'dossier-scroll' }, preview));

    // --- Backup ------------------------------------------------------------------------------------------
    const restoreInput = h('input', { type: 'file', class: 'form-control form-control-sm', accept: '.json,application/json' });
    const restoreResult = h('div', { class: 'small mt-2' });
    const card = (iconName, title, text, ...actions) => h('section', { class: 'backup-card' },
        h('div', { class: 'd-flex gap-3' }, icon(`${iconName} backup-icon`),
            h('div', { class: 'flex-grow-1' }, h('h2', { class: 'h6 mb-1' }, title), h('p', { class: 'small text-body-secondary mb-2' }, text), ...actions)));
    const backupView = h('div', { class: 'graph-body backup-view' },
        card('fa-box-archive', 'Esporta il caso aperto', 'Un file .json con tutti i dati del caso e le immagini caricate. Conservalo fuori da OneDrive per avere una copia sicura.',
            h('a', { class: 'btn btn-sm btn-primary case-only', href: url('api/backup/case'), download: '' }, icon('fa-download', 'me-1'), 'Scarica backup del caso')),
        card('fa-clock-rotate-left', 'Ripristina un caso', 'Carica un backup .json: diventa un NUOVO caso, quello attuale non viene toccato.',
            h('div', { class: 'd-flex gap-2' }, restoreInput,
                h('button', { type: 'button', class: 'btn btn-sm btn-outline-primary text-nowrap', onclick: () => restore() }, icon('fa-upload', 'me-1'), 'Ripristina')),
            restoreResult),
        card('fa-database', 'Database completo', 'Copia dell\'intero database SQLite (tutti i casi). Per ripristinarla sostituisci database/sinapsi.sqlite a Sinapsi chiuso. Le immagini restano in public/uploads.',
            h('a', { class: 'btn btn-sm btn-outline-secondary', href: url('api/backup/database'), download: '' }, icon('fa-download', 'me-1'), 'Scarica database')),
        card('fa-broom', 'Pulizia immagini', 'Elimina dal disco le immagini del caso aperto che nessuna planimetria usa più (caricate e poi sostituite o annullate).',
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary case-only', onclick: () => cleanup() }, icon('fa-broom', 'me-1'), 'Elimina immagini inutilizzate')));

    const tabs = viewTabs([
        { id: 'dossier', label: 'Dossier', icon: 'fa-file-lines', persistent: true, render: (el) => el.append(dossierView) },
        { id: 'backup', label: 'Backup', icon: 'fa-box-archive', persistent: true, render: (el) => el.append(backupView) },
    ], { prefKey: 'dossier.view' });

    container.append(h('div', { class: 'graph-view' },
        h('section', { class: 'page-header d-flex align-items-center gap-2 flex-wrap' },
            h('h1', { class: 'h4 mb-0 me-auto' }, icon(module.icon, 'me-2 text-primary'), module.label),
            tabs.header),
        tabs.body));

    // --- Dossier: dati e azioni ---------------------------------------------------------------------------
    function renderChecks() {
        checks.replaceChildren(...state.sections.map((name) => {
            const input = h('input', { type: 'checkbox', class: 'form-check-input', checked: state.selected.has(name), onchange: () => toggle(name, input.checked) });
            return h('label', { class: 'form-check small' }, input, h('span', { class: 'form-check-label' }, schemas[name]?.label_plural ?? name));
        }));
    }

    function toggle(name, on) {
        if (on) state.selected.add(name);
        else state.selected.delete(name);
        prefs.setJSON('dossier.sections', [...state.selected]);
        load();
    }

    function selectAll(on) {
        state.selected = new Set(on ? state.sections : []);
        prefs.setJSON('dossier.sections', [...state.selected]);
        renderChecks();
        load();
    }

    let request = 0;
    async function load() {
        const enabled = Boolean(session.activeCase);
        [downloadBtn, printBtn, ...backupView.querySelectorAll('.case-only')].forEach((el) => el.classList.toggle('disabled', !enabled));
        if (!enabled) {
            preview.replaceChildren(h('div', { class: 'text-center py-5' },
                h('button', { type: 'button', class: 'btn btn-sm btn-primary', dataset: { action: 'open-cases' } }, 'Apri un caso')));
            return;
        }
        const id = ++request;
        const selected = state.sections ? [...state.selected].filter((s) => state.sections.includes(s)) : [];
        const data = await api.get(`dossier?sections=${encodeURIComponent(selected.join(','))}`);
        if (id !== request) return;
        if (!state.sections) {
            state.sections = data.sections;
            if (!state.selected.size) state.selected = new Set(data.sections);
            renderChecks();
            if (selected.length !== state.selected.size) return load();
        }
        state.markdown = data.markdown;
        preview.innerHTML = marked.parse(state.markdown);
        // Ancore dell'indice: stesso slug calcolato dal server
        preview.querySelectorAll('h2').forEach((el) => { el.id = slug(el.textContent); });
    }

    const slug = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

    // I link dell'indice scorrono l'anteprima senza cambiare l'indirizzo della pagina
    preview.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        e.preventDefault();
        preview.querySelector(`[id="${CSS.escape(decodeURIComponent(a.getAttribute('href').slice(1)))}"]`)?.scrollIntoView({ behavior: 'smooth' });
    });

    function fileName(ext) {
        const title = (session.activeCase?.title ?? 'caso').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
        return `dossier-${title || 'caso'}.${ext}`;
    }

    function downloadMarkdown() {
        if (!session.activeCase || !state.markdown) return;
        const blob = new Blob([state.markdown], { type: 'text/markdown;charset=utf-8' });
        const a = h('a', { href: URL.createObjectURL(blob), download: fileName('md') });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function print() {
        if (!session.activeCase || !state.markdown) return;
        document.body.classList.add('printing-dossier');
        const previousTitle = document.title;
        document.title = fileName('pdf').replace(/\.pdf$/, '');
        const done = () => {
            document.body.classList.remove('printing-dossier');
            document.title = previousTitle;
            window.removeEventListener('afterprint', done);
        };
        window.addEventListener('afterprint', done);
        window.print();
    }

    // --- Backup: azioni ----------------------------------------------------------------------------------
    async function restore() {
        const file = restoreInput.files[0];
        if (!file) {
            restoreResult.replaceChildren(h('span', { class: 'text-warning' }, 'Scegli prima un file di backup .json.'));
            return;
        }
        restoreResult.replaceChildren(h('span', { class: 'text-body-secondary' }, icon('fa-spinner fa-spin', 'me-1'), 'Ripristino in corso…'));
        try {
            const body = new FormData();
            body.append('file', file);
            const response = await fetch(url('api/backup/case'), { method: 'POST', headers: { Accept: 'application/json' }, body });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error?.message ?? `Errore HTTP ${response.status}`);
            restoreInput.value = '';
            emit('data:changed', { entity: 'cases', action: 'create', record: { id: data.id } });
            restoreResult.replaceChildren(h('span', { class: 'text-success' }, icon('fa-check', 'me-1'),
                `Creato il caso «${data.title}» con ${data.records} elementi. `),
            h('button', { type: 'button', class: 'btn btn-link btn-sm p-0 align-baseline', onclick: () => session.openCase(data.id) }, 'Aprilo'));
        } catch (error) {
            restoreResult.replaceChildren(h('span', { class: 'text-danger' }, icon('fa-triangle-exclamation', 'me-1'), error.message));
        }
    }

    async function cleanup() {
        if (!session.activeCase) return;
        try {
            const { removed } = await api.post('uploads/cleanup', {});
            toast(removed ? `Eliminate ${removed} immagini inutilizzate.` : 'Nessuna immagine inutilizzata.', 'success', 2500);
        } catch (error) {
            toast(error.message);
        }
    }

    // --- Ciclo di vita ------------------------------------------------------------------------------------------
    let timer = null;
    const reload = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 200);
    };
    const printKey = () => { if (tabs.current === 'dossier') print(); };
    hotkeys.register('ctrl+p', printKey, 'Dossier: stampa / salva in PDF');

    const controller = new AbortController();
    const { signal } = controller;
    on('data:changed', () => reload(), { signal });
    on('case:changed', () => load(), { signal });

    await tabs.start();
    await load();

    return () => {
        controller.abort();
        clearTimeout(timer);
        tabs.destroy();
        hotkeys.unregister('ctrl+p', printKey);
    };
}
