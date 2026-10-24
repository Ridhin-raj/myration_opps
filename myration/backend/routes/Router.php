<?php
declare(strict_types=1);

namespace MyRation\Routes;

use MyRation\Middleware\AuthMiddleware;
use MyRation\Middleware\RoleMiddleware;
use MyRation\Utils\ExceptionHandler;
use MyRation\Utils\HttpResult;
use MyRation\Utils\Request;
use MyRation\Utils\Response;
use Throwable;

final class Router
{
    private array $routes = [];

    public function __construct(
        private readonly AuthMiddleware $auth,
        private readonly RoleMiddleware $roles
    ) {}

    public function add(string $method, string $path, callable $handler, array $roles = []): void
    {
        $names = [];
        $segments = explode('/', trim($path, '/'));
        $regexSegments = array_map(static function (string $segment) use (&$names): string {
            if (preg_match('/^:([A-Za-z][A-Za-z0-9_]*)$/', $segment, $match)) {
                $names[] = $match[1];
                return '([^/]+)';
            }
            return preg_quote($segment, '#');
        }, $segments);
        $this->routes[] = [strtoupper($method), '#^/' . implode('/', $regexSegments) . '/?$#', $names, $handler, $roles];
    }

    public function dispatch(Request $request): never
    {
        $pathMatched = false;
        foreach ($this->routes as [$method, $pattern, $names, $handler, $allowedRoles]) {
            if (!preg_match($pattern, $request->path(), $matches)) continue;
            $pathMatched = true;
            if ($method !== $request->method()) continue;

            try {
                $params = [];
                foreach ($names as $index => $name) $params[$name] = rawurldecode($matches[$index + 1]);
                $actor = [];
                if ($allowedRoles !== []) {
                    $actor = $this->auth->authenticate($request);
                    $this->roles->authorize($actor, $allowedRoles);
                }
                $result = $handler($request, $params, $actor);
                if ($result instanceof HttpResult) Response::json($result->data, $result->status);
                Response::json($result);
            } catch (Throwable $error) {
                ExceptionHandler::handle($error);
            }
        }
        if ($pathMatched) Response::error('Method not allowed.', 405);
        Response::error('Endpoint not found.', 404);
    }
}
