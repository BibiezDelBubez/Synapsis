<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Richiesta HTTP normalizzata.
 * Calcola il "base path" in modo che l'app funzioni sia su un virtual host
 * (http://sinapsi.test/) sia in una sottocartella (http://localhost/Synapsis/).
 */
final class Request
{
    private static ?string $basePath = null;

    /** @var array<string, mixed>|null */
    private ?array $jsonBody = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
        /** @var array<string, mixed> */
        public readonly array $query,
    ) {
    }

    public static function capture(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        // Permette PUT/PATCH/DELETE da form HTML tramite campo _method
        if ($method === 'POST' && isset($_POST['_method'])) {
            $method = strtoupper((string) $_POST['_method']);
        }

        $uriPath = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
        $base = self::basePath();
        if ($base !== '' && str_starts_with($uriPath, $base)) {
            $uriPath = substr($uriPath, strlen($base));
        }
        $path = '/' . trim($uriPath, '/');

        return new self($method, $path, $_GET);
    }

    /** Prefisso URL dell'app senza slash finale ('' se l'app è alla radice del dominio). */
    public static function basePath(): string
    {
        if (self::$basePath === null) {
            $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
            $dir = rtrim(dirname($script), '/');
            // Se la radice del sito è la cartella del progetto, il .htaccess
            // principale inoltra a /public: l'URL pubblico non contiene "/public".
            if (str_ends_with($dir, '/public')) {
                $dir = substr($dir, 0, -strlen('/public'));
            }
            self::$basePath = $dir === '.' ? '' : $dir;
        }
        return self::$basePath;
    }

    public function isApi(): bool
    {
        return $this->path === '/api' || str_starts_with($this->path, '/api/');
    }

    /** Corpo JSON decodificato (per POST/PUT/PATCH dalle chiamate fetch). */
    public function json(): array
    {
        if ($this->jsonBody === null) {
            $raw = file_get_contents('php://input') ?: '';
            $decoded = $raw === '' ? [] : json_decode($raw, true);
            if (!is_array($decoded)) {
                throw new HttpException(400, 'Corpo JSON non valido.');
            }
            $this->jsonBody = $decoded;
        }
        return $this->jsonBody;
    }

    /** Legge un valore da JSON, POST o query string (in quest'ordine). */
    public function input(string $key, mixed $default = null): mixed
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains($contentType, 'application/json')) {
            $body = $this->json();
            if (array_key_exists($key, $body)) {
                return $body[$key];
            }
        }
        return $_POST[$key] ?? $this->query[$key] ?? $default;
    }
}
