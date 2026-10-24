<?php
declare(strict_types=1);

namespace MyRation\Middleware;

use MyRation\Config\JWT;
use MyRation\Services\AuthService;
use MyRation\Utils\ApiException;
use MyRation\Utils\Request;

final class AuthMiddleware
{
    public function __construct(private readonly JWT $jwt, private readonly AuthService $authService) {}

    public function authenticate(Request $request): array
    {
        $header = $request->header('Authorization') ?? '';
        if (!preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
            throw new ApiException(401, 'Access denied. No token provided.');
        }
        $claims = $this->jwt->verify($matches[1]);
        return $this->authService->authenticate($claims);
    }
}
