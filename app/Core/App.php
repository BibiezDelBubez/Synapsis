<?php
declare(strict_types=1);

namespace App\Core;

use ErrorException;
use Throwable;

/**
 * Kernel dell'applicazione: prepara l'ambiente, applica le migrazioni,
 * instrada la richiesta e converte ogni errore nella risposta adatta (JSON o HTML).
 */
final class App
{
    public function run(): void
    {
        $this->registerErrorHandler();
        $request = Request::capture();

        try {
            if (config('db.auto_migrate', true)) {
                Migrator::migrate();
            }
            $router = new Router();
            require CONFIG_PATH . '/routes.php';
            $response = $router->dispatch($request);
        } catch (Throwable $e) {
            $response = $this->handleException($e, $request);
        }

        $response->send();
    }

    private function registerErrorHandler(): void
    {
        error_reporting(E_ALL);
        ini_set('display_errors', '0');
        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if (!(error_reporting() & $severity)) {
                return false;
            }
            throw new ErrorException($message, 0, $severity, $file, $line);
        });
    }

    private function handleException(Throwable $e, Request $request): Response
    {
        $status = $e instanceof HttpException ? $e->status : 500;
        $debug = (bool) config('app.debug');

        if ($status >= 500) {
            Logger::error($e);
        }

        $message = $status >= 500 && !$debug ? 'Errore interno del server.' : $e->getMessage();
        $details = $e instanceof HttpException ? $e->details : [];
        if ($debug && $status >= 500) {
            $details = [
                'exception' => $e::class,
                'file'      => $e->getFile() . ':' . $e->getLine(),
                'trace'     => array_slice(explode("\n", $e->getTraceAsString()), 0, 10),
            ];
        }

        if ($request->isApi()) {
            return Response::error($status, $message, $details);
        }
        return Response::html(
            View::render('error', ['status' => $status, 'message' => $message, 'details' => $details], null),
            $status
        );
    }
}
