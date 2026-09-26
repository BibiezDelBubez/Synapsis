<?php
/**
 * Guscio HTML dell'applicazione (SPA).
 * @var string $content  HTML della vista interna
 * @var string $title
 * @var array  $modules
 * @var string $active
 */
?>
<!doctype html>
<html lang="<?= e(config('app.locale', 'it')) ?>" data-bs-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="base-url" content="<?= e(url('/')) ?>">
    <title><?= e($title ?? config('app.name')) ?></title>
    <script>
        // Applica il tema salvato prima del rendering, per evitare lampi di bianco
        try { document.documentElement.dataset.bsTheme = localStorage.getItem('sinapsi.theme') || 'dark'; } catch (e) {}
    </script>
    <link rel="icon" href="<?= e(asset('assets/img/favicon.svg')) ?>" type="image/svg+xml">
    <link rel="stylesheet" href="<?= e(asset('vendor/bootstrap/css/bootstrap.min.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset('vendor/fontawesome/css/all.min.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset('assets/css/app.css')) ?>">
</head>
<body>
<div class="app-shell">
    <?= \App\Core\View::partial('sidebar', ['modules' => $modules ?? [], 'active' => $active ?? '']) ?>

    <div class="app-main">
        <?= \App\Core\View::partial('topbar') ?>
        <main class="app-content" id="app-content" tabindex="-1">
            <?= $content ?>
        </main>
    </div>

    <aside class="app-panel" id="app-panel" aria-label="Dettaglio" tabindex="-1"></aside>
</div>

<script type="application/json" id="app-modules"><?= json_encode($modules ?? [], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<script src="<?= e(asset('vendor/bootstrap/js/bootstrap.bundle.min.js')) ?>"></script>
<script type="module" src="<?= e(asset('assets/js/app.js')) ?>"></script>
</body>
</html>
