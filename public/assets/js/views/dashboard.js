/**
 * Vista Dashboard: caso aperto, contatori dell'archivio, stato del sistema.
 */
import { api, url } from '../core/api.js';
import { escapeHtml, h, icon, on } from '../core/dom.js';
import { getSchema } from '../core/resource.js';
import { router } from '../core/router.js';
import { session } from '../core/session.js';

export async function mount(container) {
    const caseCard = h('div', { class: 'card' });
    const counters = h('div', { class: 'row g-3' });
    const health = h('table', { class: 'table table-sm table-kv mb-0' }, h('tbody'));

    container.append(
        h('section', { class: 'page-header' },
            h('h1', { class: 'h4 mb-1' }, icon('fa-gauge-high', 'me-2 text-primary'), 'Dashboard')),
        h('div', { class: 'row g-3' },
            h('div', { class: 'col-12' }, caseCard),
            h('div', { class: 'col-12' }, counters),
            h('div', { class: 'col-12 col-xl-6' },
                h('div', { class: 'card' },
                    h('div', { class: 'card-header d-flex align-items-center' },
                        icon('fa-heart-pulse', 'me-2'), 'Stato del sistema',
                        h('button', { type: 'button', class: 'btn btn-sm btn-icon ms-auto', title: 'Aggiorna', onclick: () => loadHealth(health) },
                            icon('fa-rotate'))),
                    h('div', { class: 'card-body p-0' }, health)))));

    const refresh = () => {
        renderCase(caseCard, session.activeCase);
        renderCounters(counters);
    };
    refresh();
    loadHealth(health);

    // Le sottoscrizioni vengono rimosse quando si lascia la vista
    const controller = new AbortController();
    on('case:changed', refresh, { signal: controller.signal });
    on('data:changed', refresh, { signal: controller.signal });
    return () => controller.abort();
}

async function renderCase(card, current) {
    if (!current) {
        card.replaceChildren(h('div', { class: 'card-body d-flex align-items-center gap-3 flex-wrap' },
            icon('fa-folder-open', 'fa-2x text-body-tertiary'),
            h('div', { class: 'me-auto' },
                h('div', { class: 'fw-semibold' }, 'Nessun caso aperto'),
                h('div', { class: 'small text-body-secondary' }, 'Ogni romanzo è un caso: personaggi, luoghi e asset appartengono al caso aperto.')),
            h('button', { type: 'button', class: 'btn btn-primary', dataset: { action: 'open-cases' } },
                icon('fa-folder-plus', 'me-1'), 'Apri o crea un caso', h('kbd', { class: 'ms-2' }, 'Alt+C'))));
        return;
    }
    const schema = await getSchema('cases');
    card.replaceChildren(h('div', { class: 'card-body case-card', style: `--case-color:${current.color ?? 'var(--bs-primary)'}` },
        h('div', { class: 'd-flex align-items-start gap-3' },
            h('div', { class: 'me-auto' },
                h('div', { class: 'small text-body-secondary text-uppercase fw-semibold' }, 'Caso aperto'),
                h('h2', { class: 'h5 mb-0' }, current.title),
                current.subtitle ? h('div', { class: 'text-body-secondary' }, current.subtitle) : null),
            h('span', { class: 'badge text-bg-secondary' }, schema.fields.status.options[current.status] ?? current.status),
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', dataset: { action: 'open-cases' } },
                icon('fa-right-left', 'me-1'), 'Cambia')),
        current.synopsis ? h('p', { class: 'mt-3 mb-0 case-synopsis' }, current.synopsis) : null));
}

/** Un contatore per ogni modulo-archivio (entity-table) del registro moduli. */
async function renderCounters(row) {
    const archives = router.modules.filter((m) => m.view === 'entity-table');
    const { items } = await api.get('search');
    const counts = items.reduce((acc, item) => ({ ...acc, [item.entity]: (acc[item.entity] ?? 0) + 1 }), {});

    row.replaceChildren(...archives.map((m) => h('div', { class: 'col-6 col-lg-3' },
        h('a', { class: 'card counter-card text-decoration-none', href: url(m.path), dataset: { link: '' } },
            h('div', { class: 'card-body d-flex align-items-center gap-3' },
                icon(m.icon, 'fa-lg text-primary'),
                h('div', {},
                    h('div', { class: 'counter-value' }, session.activeCase ? String(counts[m.entity] ?? 0) : '—'),
                    h('div', { class: 'small text-body-secondary' }, m.label)))))));
}

const yes = (flag) => (flag
    ? '<i class="fa-solid fa-circle-check text-success"></i>'
    : '<i class="fa-solid fa-circle-xmark text-danger"></i>');

async function loadHealth(table) {
    const rows = (list) => {
        table.tBodies[0].innerHTML = list
            .map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${value}</td></tr>`)
            .join('');
    };
    try {
        const info = await api.get('health');
        rows([
            ['Applicazione', `${escapeHtml(info.app.name)} v${escapeHtml(info.app.version)}${info.app.debug ? ' <span class="badge text-bg-warning">debug</span>' : ''}`],
            ['PHP', `${escapeHtml(info.php.version)} · pdo_sqlite ${yes(info.php.extensions.pdo_sqlite)} · mbstring ${yes(info.php.extensions.mbstring)}`],
            ['Database', `${escapeHtml(info.database.driver)} ${escapeHtml(info.database.version)}${info.database.file ? ` · <code>${escapeHtml(info.database.file)}</code> (${info.database.size_kb} KB)` : ''}`],
            ['Casi', escapeHtml(info.database.cases)],
            ['Migrazioni', info.migrations.applied.map((m) => escapeHtml(m.filename)).join(', ') || '—'],
            ['In attesa', info.migrations.pending.length ? escapeHtml(info.migrations.pending.join(', ')) : yes(true)],
        ]);
    } catch (error) {
        rows([['Errore', `<span class="text-danger">${escapeHtml(error.message)}</span>`]]);
    }
}
