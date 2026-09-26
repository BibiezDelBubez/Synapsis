<header class="app-topbar">
    <button class="btn btn-sm btn-icon" type="button" data-action="toggle-sidebar" title="Mostra/nascondi menu (Alt+M)">
        <i class="fa-solid fa-bars"></i>
    </button>

    <button class="btn btn-sm topbar-case" type="button" data-action="open-cases" title="Casi (Alt+C)">
        <span class="case-dot" id="active-case-dot"></span>
        <span id="active-case-label" class="text-body-secondary">Nessun caso aperto</span>
        <i class="fa-solid fa-chevron-down small text-body-tertiary"></i>
    </button>

    <div class="ms-auto d-flex align-items-center gap-2">
        <span class="status-dot" id="status-dot" title="Stato del server"></span>
        <button class="btn btn-sm btn-icon" type="button" data-action="toggle-theme" title="Tema chiaro/scuro (Alt+T)">
            <i class="fa-solid fa-circle-half-stroke"></i>
        </button>
    </div>
</header>
