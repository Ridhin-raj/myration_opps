<?php
declare(strict_types=1);

namespace MyRation\Controllers;

use MyRation\Services\AdminService;
use MyRation\Utils\Request;

final class AdminController
{
    public function __construct(private readonly AdminService $admin) {}

    public function dashboard(Request $request): mixed { return $this->run('dashboard', $request); }
    public function pending(Request $request): mixed { return $this->run('pending', $request); }
    public function approve(Request $request, array $params, array $actor): mixed { return $this->run('approve', $request, $actor, ['id' => $params['id'] ?? 0]); }
    public function quota(Request $request): mixed { return $this->run('quota', $request); }
    public function updateQuota(Request $request): mixed { return $this->run('update-quota', $request); }
    public function newItem(Request $request): mixed { return $this->run('new-item', $request); }
    public function removeQuota(Request $request, array $params): mixed { return $this->run('remove-quota', $request, [], $params); }
    public function complaints(Request $request): mixed { return $this->run('complaints', $request); }
    public function resolveComplaint(Request $request, array $params, array $actor): mixed { return $this->run('resolve-complaint', $request, $actor, ['id' => $params['id'] ?? 0]); }
    public function users(Request $request): mixed { return $this->run('users', $request); }
    public function beneficiaries(Request $request): mixed { return $this->run('users', $request, [], ['role' => 'user']); }
    public function shopkeepers(Request $request): mixed { return $this->run('users', $request, [], ['role' => 'shopkeeper']); }
    public function shops(Request $request): mixed { return $this->run('shops', $request); }
    public function assignBeneficiary(Request $request, array $params): mixed { return $this->run('assign-beneficiary', $request, [], ['beneficiaryId' => $params['id'] ?? 0]); }
    public function demand(Request $request, array $params): mixed { return $this->run('demand', $request, [], ['shopId' => $params['id'] ?? 0]); }
    public function allocate(Request $request, array $params, array $actor): mixed { return $this->run('allocate', $request, $actor, ['shopId' => $params['id'] ?? 0]); }
    public function monthlyReset(Request $request): mixed { return $this->run('monthly-reset', $request); }
    public function stock(Request $request): mixed { return $this->run('stock', $request); }
    public function distributions(Request $request): mixed { return $this->run('distributions', $request); }
    public function bookings(Request $request): mixed { return $this->run('bookings', $request); }
    public function notifications(Request $request): mixed { return $this->run('notifications', $request); }
    public function createNotification(Request $request): mixed { return $this->run('create-notification', $request); }
    public function deleteNotification(Request $request, array $params): mixed { return $this->run('delete-notification', $request, [], ['notificationId' => $params['id'] ?? 0]); }
    public function categories(Request $request): mixed { return $this->run('categories', $request); }
    public function items(Request $request): mixed { return $this->run('items', $request); }

    private function run(string $operation, Request $request, array $actor = [], array $extra = []): mixed
    {
        return $this->admin->execute($operation, $request->body(), ['actor' => $actor, 'query' => $request->query()] + $extra);
    }
}
