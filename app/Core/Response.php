<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Risposta HTTP immutabile. I controller la restituiscono, App la invia.
 */
final class Response
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly string $body,
        public readonly int $status = 200,
        public readonly array $headers = [],
    ) {
    }

    public static function json(mixed $data, int $status = 200): self
    {
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;
        if (config('app.debug')) {
            $flags |= JSON_PRETTY_PRINT;
        }
        return new self(json_encode($data, $flags), $status, [
            'Content-Type' => 'application/json; charset=utf-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    public static function html(string $html, int $status = 200): self
    {
        return new self($html, $status, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    /** Formato unico degli errori API: { "error": { "status", "message", "details" } } */
    public static function error(int $status, string $message, array $details = []): self
    {
        return self::json(['error' => [
            'status'  => $status,
            'message' => $message,
            'details' => (object) $details,
        ]], $status);
    }

    public function send(): void
    {
        if (!headers_sent()) {
            http_response_code($this->status);
            header('X-Content-Type-Options: nosniff');
            foreach ($this->headers as $name => $value) {
                header($name . ': ' . $value);
            }
        }
        echo $this->body;
    }
}
