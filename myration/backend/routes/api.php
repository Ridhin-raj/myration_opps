<?php
declare(strict_types=1);

use MyRation\Controllers\AdminController;
use MyRation\Controllers\AuthController;
use MyRation\Controllers\BeneficiaryController;
use MyRation\Controllers\ShopkeeperController;
use MyRation\Routes\Router;

return static function (Router $router, array $controllers): void {
    /** @var AuthController $auth */
    $auth = $controllers['auth'];
    /** @var BeneficiaryController $beneficiary */
    $beneficiary = $controllers['beneficiary'];
    /** @var ShopkeeperController $shopkeeper */
    $shopkeeper = $controllers['shopkeeper'];
    /** @var AdminController $admin */
    $admin = $controllers['admin'];

    $router->add('GET', '/api/health', static fn () => ['status' => 'ok', 'message' => 'Ration Management API is running']);

    $router->add('POST', '/api/auth/login', [$auth, 'login']);
    $router->add('POST', '/api/auth/register/user', [$auth, 'registerBeneficiary']);
    $router->add('POST', '/api/auth/register/shopkeeper', [$auth, 'registerShopkeeper']);
    $router->add('GET', '/api/auth/check-username/:username', [$auth, 'username']);
    $router->add('GET', '/api/auth/check-aadhaar/:aadhaar', [$auth, 'aadhaar']);
    $router->add('GET', '/api/auth/check-license/:licenseNo', [$auth, 'license']);
    $router->add('GET', '/api/auth/shops', [$auth, 'shops']);

    $router->add('GET', '/api/user/profile', [$beneficiary, 'profile'], ['user']);
    $router->add('PUT', '/api/user/profile', [$beneficiary, 'updateProfile'], ['user']);
    $router->add('GET', '/api/user/quota', [$beneficiary, 'quota'], ['user']);
    $router->add('GET', '/api/user/history', [$beneficiary, 'history'], ['user']);
    $router->add('GET', '/api/user/quota-history', [$beneficiary, 'quotaHistory'], ['user']);
    $router->add('GET', '/api/user/shop', [$beneficiary, 'shop'], ['user']);
    $router->add('GET', '/api/user/shop/:id/stock', [$beneficiary, 'shopStock'], ['user']);
    $router->add('POST', '/api/user/book-slot', [$beneficiary, 'bookSlot'], ['user']);
    $router->add('GET', '/api/user/slots', [$beneficiary, 'slots'], ['user']);
    $router->add('POST', '/api/user/complaint', [$beneficiary, 'complaint'], ['user']);
    $router->add('GET', '/api/user/complaints', [$beneficiary, 'complaints'], ['user']);
    $router->add('GET', '/api/user/alerts', [$beneficiary, 'alerts'], ['user']);
    $router->add('POST', '/api/user/alerts/:id/read', [$beneficiary, 'markAlertRead'], ['user']);

    $router->add('GET', '/api/shopkeeper/dashboard', [$shopkeeper, 'dashboard'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/pending', [$shopkeeper, 'pending'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/verified', [$shopkeeper, 'verified'], ['shopkeeper']);
    $router->add('POST', '/api/shopkeeper/verify/:id', [$shopkeeper, 'verify'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/stock', [$shopkeeper, 'stock'], ['shopkeeper']);
    $router->add('PUT', '/api/shopkeeper/stock/:id', [$shopkeeper, 'addStock'], ['shopkeeper']);
    $router->add('PUT', '/api/shopkeeper/stock/:id/sell', [$shopkeeper, 'sellStock'], ['shopkeeper']);
    $router->add('POST', '/api/shopkeeper/sell-stock', [$shopkeeper, 'legacySellStock'], ['shopkeeper']);
    $router->add('PUT', '/api/shopkeeper/shop-status', [$shopkeeper, 'shopStatus'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/beneficiary-quota/:userId', [$shopkeeper, 'beneficiaryQuota'], ['shopkeeper']);
    $router->add('POST', '/api/shopkeeper/collect-ration', [$shopkeeper, 'collectRation'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/stock-history', [$shopkeeper, 'stockHistory'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/assigned-stock', [$shopkeeper, 'assignedStock'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/bookings', [$shopkeeper, 'bookings'], ['shopkeeper']);
    $router->add('PUT', '/api/shopkeeper/bookings/:id', [$shopkeeper, 'updateBooking'], ['shopkeeper']);
    $router->add('POST', '/api/shopkeeper/receive-stock', [$shopkeeper, 'receiveStock'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/alerts', [$shopkeeper, 'alerts'], ['shopkeeper']);
    $router->add('POST', '/api/shopkeeper/alerts/:id/read', [$shopkeeper, 'markAlertRead'], ['shopkeeper']);
    $router->add('GET', '/api/shopkeeper/complaints', [$shopkeeper, 'complaints'], ['shopkeeper']);
    $router->add('PUT', '/api/shopkeeper/complaints/:id', [$shopkeeper, 'respondComplaint'], ['shopkeeper']);

    $router->add('GET', '/api/admin/dashboard', [$admin, 'dashboard'], ['admin']);
    $router->add('GET', '/api/admin/pending', [$admin, 'pending'], ['admin']);
    $router->add('POST', '/api/admin/approve/:id', [$admin, 'approve'], ['admin']);
    $router->add('GET', '/api/admin/quota', [$admin, 'quota'], ['admin']);
    $router->add('PUT', '/api/admin/quota', [$admin, 'updateQuota'], ['admin']);
    $router->add('POST', '/api/admin/quota/new-item', [$admin, 'newItem'], ['admin']);
    $router->add('DELETE', '/api/admin/quota/:cardType/:itemName', [$admin, 'removeQuota'], ['admin']);
    $router->add('GET', '/api/admin/complaints', [$admin, 'complaints'], ['admin']);
    $router->add('PUT', '/api/admin/complaints/:id', [$admin, 'resolveComplaint'], ['admin']);
    $router->add('GET', '/api/admin/users', [$admin, 'users'], ['admin']);
    $router->add('GET', '/api/admin/beneficiaries', [$admin, 'beneficiaries'], ['admin']);
    $router->add('GET', '/api/admin/shopkeepers', [$admin, 'shopkeepers'], ['admin']);
    $router->add('GET', '/api/admin/shops', [$admin, 'shops'], ['admin']);
    $router->add('PUT', '/api/admin/beneficiaries/:id/shop', [$admin, 'assignBeneficiary'], ['admin']);
    $router->add('GET', '/api/admin/shops/:id/demand', [$admin, 'demand'], ['admin']);
    $router->add('POST', '/api/admin/shops/:id/allocate', [$admin, 'allocate'], ['admin']);
    $router->add('POST', '/api/admin/monthly-reset', [$admin, 'monthlyReset'], ['admin']);
    $router->add('GET', '/api/admin/stock', [$admin, 'stock'], ['admin']);
    $router->add('GET', '/api/admin/distributions', [$admin, 'distributions'], ['admin']);
    $router->add('GET', '/api/admin/bookings', [$admin, 'bookings'], ['admin']);
    $router->add('GET', '/api/admin/notifications', [$admin, 'notifications'], ['admin']);
    $router->add('POST', '/api/admin/notifications', [$admin, 'createNotification'], ['admin']);
    $router->add('DELETE', '/api/admin/notifications/:id', [$admin, 'deleteNotification'], ['admin']);
    $router->add('GET', '/api/admin/categories', [$admin, 'categories'], ['admin']);
    $router->add('GET', '/api/admin/items', [$admin, 'items'], ['admin']);
};
