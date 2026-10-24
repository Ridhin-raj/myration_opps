<?php
declare(strict_types=1);

namespace MyRation\Middleware;

use MyRation\Utils\ApiException;

final class RoleMiddleware
{
    public function authorize(array $actor, array $roles): void
    {
        if (!in_array($actor['role'] ?? null, $roles, true)) {
            throw new ApiException(403, 'Access denied for this role.');
        }
    }
}
