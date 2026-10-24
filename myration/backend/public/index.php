<?php
declare(strict_types=1);

use MyRation\Config\Database;
use MyRation\Config\JWT;
use MyRation\Controllers\AdminController;
use MyRation\Controllers\AuthController;
use MyRation\Controllers\BeneficiaryController;
use MyRation\Controllers\ShopkeeperController;
use MyRation\Middleware\AuthMiddleware;
use MyRation\Middleware\RoleMiddleware;
use MyRation\Repositories\AdminRepository;
use MyRation\Repositories\BeneficiaryRepository;
use MyRation\Repositories\ShopkeeperRepository;
use MyRation\Repositories\UserRepository;
use MyRation\Routes\Router;
use MyRation\Services\AdminService;
use MyRation\Services\AuthService;
use MyRation\Services\BeneficiaryService;
use MyRation\Services\ShopkeeperService;
use MyRation\Utils\ExceptionHandler;
use MyRation\Utils\Request;
use MyRation\Utils\Response;

require dirname(__DIR__) . '/bootstrap.php';

if (PHP_SAPI === 'cli-server') {
    $requestedFile = __DIR__ . (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
    if (is_file($requestedFile)) return false;
}

$allowedOrigins = explode(',', (string) MyRation\Config\Config::get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5180,http://localhost:3000'));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, array_map('trim', $allowedOrigins), true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $request = Request::fromGlobals();
    if ($request->method() === 'GET' && $request->path() === '/api/health') {
        Response::json(['status' => 'ok', 'message' => 'Ration Management API is running']);
    }
    $pdo = Database::connection();
    $users = new UserRepository($pdo);
    $beneficiaries = new BeneficiaryRepository($pdo);
    $shopkeeperRepository = new ShopkeeperRepository($pdo);
    $adminRepository = new AdminRepository($pdo);
    $jwt = new JWT();

    $authService = new AuthService($users, $jwt);
    $beneficiaryService = new BeneficiaryService($beneficiaries);
    $shopkeeperService = new ShopkeeperService($shopkeeperRepository, $beneficiaries, $adminRepository);
    $adminService = new AdminService($adminRepository);

    $controllers = [
        'auth' => new AuthController($authService),
        'beneficiary' => new BeneficiaryController($beneficiaryService),
        'shopkeeper' => new ShopkeeperController($shopkeeperService),
        'admin' => new AdminController($adminService),
    ];
    $router = new Router(new AuthMiddleware($jwt, $authService), new RoleMiddleware());
    $registerRoutes = require dirname(__DIR__) . '/routes/api.php';
    $registerRoutes($router, $controllers);
    $router->dispatch($request);
} catch (Throwable $error) {
    ExceptionHandler::handle($error);
}
