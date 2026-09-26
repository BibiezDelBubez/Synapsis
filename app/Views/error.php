<?php
/**
 * Pagina d'errore autonoma (senza layout, così funziona anche se il layout è rotto).
 * @var int    $status
 * @var string $message
 * @var array  $details
 */
?>
<!doctype html>
<html lang="it" data-bs-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Errore <?= (int) $status ?> · <?= e(config('app.name')) ?></title>
    <link rel="stylesheet" href="<?= e(asset('vendor/bootstrap/css/bootstrap.min.css')) ?>">
</head>
<body class="bg-body-tertiary">
<main class="container py-5" style="max-width: 760px">
    <h1 class="display-6 mb-2">Errore <?= (int) $status ?></h1>
    <p class="lead"><?= e($message) ?></p>
    <?php if ($details): ?>
        <pre class="bg-body p-3 rounded small border"><?= e(json_encode($details, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) ?></pre>
    <?php endif; ?>
    <a class="btn btn-primary" href="<?= e(url('/')) ?>">Torna alla dashboard</a>
</main>
</body>
</html>
