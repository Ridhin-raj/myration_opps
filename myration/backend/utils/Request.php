<?php
declare(strict_types=1);

namespace MyRation\Utils;

final class Request
{
    private function __construct(
        private readonly string $method,
        private readonly string $path,
        private readonly array $body,
        private readonly array $query,
        private readonly array $files,
        private readonly array $headers
    ) {}

    public static function fromGlobals(): self
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                $headers[$name] ??= $value;
            }
        }
        $body = $_POST;
        $contentType = strtolower((string) ($headers['Content-Type'] ?? $headers['content-type'] ?? ''));
        if (str_contains($contentType, 'application/json')) {
            $decoded = json_decode((string) file_get_contents('php://input'), true);
            if (!is_array($decoded) && $decoded !== null) {
                throw new ApiException(400, 'Request body must be a JSON object.');
            }
            $body = is_array($decoded) ? $decoded : [];
        }
        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/',
            $body,
            $_GET,
            $_FILES,
            $headers
        );
    }

    public function method(): string { return $this->method; }
    public function path(): string { return $this->path; }
    public function body(): array { return $this->body; }
    public function query(): array { return $this->query; }
    public function files(): array { return $this->files; }
    public function header(string $name): ?string
    {
        foreach ($this->headers as $key => $value) {
            if (strcasecmp((string) $key, $name) === 0) return (string) $value;
        }
        return null;
    }
}
