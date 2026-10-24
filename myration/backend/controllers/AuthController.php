<?php
declare(strict_types=1);

namespace MyRation\Controllers;

use MyRation\Services\AuthService;
use MyRation\Utils\Request;

final class AuthController
{
    public function __construct(private readonly AuthService $auth) {}

    public function login(Request $request): mixed { return $this->auth->execute('login', $request->body()); }
    public function registerBeneficiary(Request $request): mixed { return $this->auth->execute('register-beneficiary', $request->body(), ['files' => $request->files()]); }
    public function registerShopkeeper(Request $request): mixed { return $this->auth->execute('register-shopkeeper', $request->body()); }
    public function username(Request $request, array $params): mixed { return $this->auth->execute('username', [], ['username' => $params['username'] ?? '']); }
    public function aadhaar(Request $request, array $params): mixed { return $this->auth->execute('aadhaar', [], ['aadhaar' => $params['aadhaar'] ?? '']); }
    public function license(Request $request, array $params): mixed { return $this->auth->execute('license', [], ['licenseNo' => $params['licenseNo'] ?? '']); }
    public function shops(Request $request): mixed { return $this->auth->execute('shops'); }
}
