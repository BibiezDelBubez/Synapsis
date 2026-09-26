<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Controller base: tutti i controller lo estendono per avere
 * accesso alla richiesta e ai metodi di risposta uniformi.
 */
abstract class Controller
{
    public function __construct(protected readonly Request $request)
    {
    }

    protected function json(mixed $data, int $status = 200): Response
    {
        return Response::json($data, $status);
    }

    protected function view(string $template, array $data = [], ?string $layout = 'layout'): Response
    {
        return Response::html(View::render($template, $data, $layout));
    }

    protected function abort(int $status, string $message, array $details = []): never
    {
        throw new HttpException($status, $message, $details);
    }
}
