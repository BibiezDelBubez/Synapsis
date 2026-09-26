<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Router minimale con parametri nominati: '/api/cases/{id}'.
 * I parametri numerici ({id}) accettano solo cifre, gli altri qualsiasi segmento.
 * Gli handler sono [ClasseController::class, 'metodo'] e ricevono (Request, ...parametri).
 */
final class Router
{
    /** @var array<int, array{method: string, pattern: string, regex: string, handler: array{0: class-string, 1: string}}> */
    private array $routes = [];

    /** @var array{0: class-string, 1: string}|null */
    private ?array $fallback = null;

    public function get(string $pattern, array $handler): self    { return $this->add('GET', $pattern, $handler); }
    public function post(string $pattern, array $handler): self   { return $this->add('POST', $pattern, $handler); }
    public function put(string $pattern, array $handler): self    { return $this->add('PUT', $pattern, $handler); }
    public function patch(string $pattern, array $handler): self  { return $this->add('PATCH', $pattern, $handler); }
    public function delete(string $pattern, array $handler): self { return $this->add('DELETE', $pattern, $handler); }

    /** Handler per le GET non API non trovate (la SPA). */
    public function fallback(array $handler): self
    {
        $this->fallback = $handler;
        return $this;
    }

    public function add(string $method, string $pattern, array $handler): self
    {
        $this->routes[] = [
            'method'  => strtoupper($method),
            'pattern' => $pattern,
            'regex'   => $this->compile($pattern),
            'handler' => $handler,
        ];
        return $this;
    }

    public function dispatch(Request $request): Response
    {
        $method = $request->method === 'HEAD' ? 'GET' : $request->method;
        $allowed = [];

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $request->path, $matches)) {
                continue;
            }
            if ($route['method'] !== $method) {
                $allowed[] = $route['method'];
                continue;
            }
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            return $this->invoke($route['handler'], $request, $params);
        }

        if ($allowed !== []) {
            throw new HttpException(405, 'Metodo non consentito. Usa: ' . implode(', ', array_unique($allowed)));
        }
        if ($this->fallback !== null && $method === 'GET' && !$request->isApi()) {
            return $this->invoke($this->fallback, $request, []);
        }
        throw new HttpException(404, 'Risorsa non trovata: ' . $request->path);
    }

    private function compile(string $pattern): string
    {
        $regex = preg_replace_callback('/\{(\w+)\}/', static function (array $m): string {
            $rule = $m[1] === 'id' || str_ends_with($m[1], '_id') ? '\d+' : '[^/]+';
            return '(?P<' . $m[1] . '>' . $rule . ')';
        }, rtrim($pattern, '/') ?: '/');
        return '#^' . $regex . '$#u';
    }

    /** @param array{0: class-string, 1: string} $handler */
    private function invoke(array $handler, Request $request, array $params): Response
    {
        [$class, $action] = $handler;
        $controller = new $class($request);
        $params = array_map(static fn ($v) => ctype_digit($v) ? (int) $v : $v, $params);
        $result = $controller->{$action}(...$params);

        return $result instanceof Response ? $result : Response::json($result);
    }
}
