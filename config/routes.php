<?php
/**
 * Tabella delle rotte.
 * - Le rotte /api/* restituiscono sempre JSON.
 * - Le rotte specifiche vanno PRIMA di quelle generiche /api/{entity}.
 * - Qualsiasi altra GET non registrata ricade sulla SPA (HomeController@index).
 *
 * @var \App\Core\Router $router
 */

use App\Controllers\Api\ArchiveController;
use App\Controllers\Api\ResourceController;
use App\Controllers\Api\SearchController;
use App\Controllers\Api\SessionController;
use App\Controllers\Api\SystemController;
use App\Controllers\Api\UploadController;
use App\Controllers\HomeController;

// --- API di sistema ----------------------------------------------------------
$router->get('/api/health', [SystemController::class, 'health']);
$router->get('/api/modules', [SystemController::class, 'modules']);
$router->get('/api/schema', [SystemController::class, 'schemas']);
$router->get('/api/search', [SearchController::class, 'index']);

// --- Sessione di lavoro (caso aperto) ---------------------------------------
$router->get('/api/session', [SessionController::class, 'show']);
$router->put('/api/session/case', [SessionController::class, 'setCase']);

// --- Caricamento immagini (campi di tipo image) --------------------------
$router->post('/api/uploads', [UploadController::class, 'store']);
$router->post('/api/uploads/cleanup', [ArchiveController::class, 'cleanupUploads']);

// --- Dossier e backup ----------------------------------------------------------
$router->get('/api/dossier', [ArchiveController::class, 'dossier']);
$router->get('/api/backup/case', [ArchiveController::class, 'exportCase']);
$router->post('/api/backup/case', [ArchiveController::class, 'importCase']);
$router->get('/api/backup/database', [ArchiveController::class, 'exportDatabase']);

// --- API generiche per tutte le entità di config/entities/ ------------------
$router->get('/api/{entity}', [ResourceController::class, 'index']);
$router->post('/api/{entity}', [ResourceController::class, 'store']);
$router->get('/api/{entity}/{id}', [ResourceController::class, 'show']);
$router->put('/api/{entity}/{id}', [ResourceController::class, 'update']);
$router->patch('/api/{entity}/{id}', [ResourceController::class, 'update']);
$router->delete('/api/{entity}/{id}', [ResourceController::class, 'destroy']);

// --- SPA ---------------------------------------------------------------------
$router->get('/', [HomeController::class, 'index']);
$router->fallback([HomeController::class, 'index']);
