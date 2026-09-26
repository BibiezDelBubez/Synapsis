<?php
/**
 * Menu laterale generato dal registro config/modules.php, raggruppato per 'group'.
 * I link con data-link vengono gestiti dal router della SPA (niente ricaricamento).
 * @var array  $modules
 * @var string $active
 */
$groups = [];
foreach ($modules as $module) {
    $groups[$module['group']][] = $module;
}
$shortcut = 0;
?>
<aside class="app-sidebar" id="app-sidebar">
    <div class="sidebar-brand">
        <i class="fa-solid fa-circle-nodes"></i>
        <span><?= e(config('app.name')) ?></span>
        <small class="text-body-tertiary ms-auto">v<?= e(config('app.version')) ?></small>
    </div>

    <button class="sidebar-search" type="button" data-action="open-palette" title="Cerca o crea (Ctrl+K)">
        <i class="fa-solid fa-magnifying-glass fa-fw"></i>
        <span>Cerca o crea…</span>
        <kbd>Ctrl K</kbd>
    </button>

    <nav class="sidebar-nav">
        <?php foreach ($groups as $group => $items): ?>
            <div class="sidebar-group"><?= e($group) ?></div>
            <?php foreach ($items as $item): ?>
                <?php if ($item['enabled']): $shortcut++; ?>
                    <a class="sidebar-link<?= $item['id'] === $active ? ' active' : '' ?>"
                       href="<?= e(url($item['path'])) ?>" data-link data-module="<?= e($item['id']) ?>"
                       <?php if ($shortcut <= 9): ?>title="Alt+<?= $shortcut ?>"<?php endif; ?>>
                        <i class="fa-solid <?= e($item['icon']) ?> fa-fw"></i>
                        <span><?= e($item['label']) ?></span>
                    </a>
                <?php else: ?>
                    <a class="sidebar-link disabled" href="#" aria-disabled="true" data-module="<?= e($item['id']) ?>"
                       title="Disponibile dallo step <?= (int) $item['step'] ?>">
                        <i class="fa-solid <?= e($item['icon']) ?> fa-fw"></i>
                        <span><?= e($item['label']) ?></span>
                        <span class="badge-step">S<?= (int) $item['step'] ?></span>
                    </a>
                <?php endif; ?>
            <?php endforeach; ?>
        <?php endforeach; ?>
    </nav>

    <button class="sidebar-help" type="button" data-action="open-help" title="Scorciatoie (?)">
        <i class="fa-regular fa-keyboard fa-fw"></i><span>Scorciatoie</span><kbd>?</kbd>
    </button>
</aside>
