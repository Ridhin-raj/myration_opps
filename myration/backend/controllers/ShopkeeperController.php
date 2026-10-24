<?php
declare(strict_types=1);

namespace MyRation\Controllers;

use MyRation\Services\ShopkeeperService;
use MyRation\Utils\Request;

final class ShopkeeperController
{
    public function __construct(private readonly ShopkeeperService $shopkeepers) {}

    public function dashboard(Request $request, array $params, array $actor): mixed { return $this->run('dashboard', $request, $actor); }
    public function pending(Request $request, array $params, array $actor): mixed { return $this->run('pending', $request, $actor); }
    public function verified(Request $request, array $params, array $actor): mixed { return $this->run('verified', $request, $actor); }
    public function verify(Request $request, array $params, array $actor): mixed { return $this->run('verify', $request, $actor, ['userId' => $params['id'] ?? 0]); }
    public function stock(Request $request, array $params, array $actor): mixed { return $this->run('stock', $request, $actor); }
    public function addStock(Request $request, array $params, array $actor): mixed { return $this->run('add-stock', $request, $actor, ['stockId' => $params['id'] ?? 0]); }
    public function sellStock(Request $request, array $params, array $actor): mixed { return $this->run('sell-stock', $request, $actor, ['stockId' => $params['id'] ?? 0]); }
    public function legacySellStock(Request $request, array $params, array $actor): mixed { return $this->run('sell-stock', $request, $actor); }
    public function shopStatus(Request $request, array $params, array $actor): mixed { return $this->run('shop-status', $request, $actor); }
    public function beneficiaryQuota(Request $request, array $params, array $actor): mixed { return $this->run('beneficiary-quota', $request, $actor, ['beneficiaryId' => $params['userId'] ?? 0]); }
    public function collectRation(Request $request, array $params, array $actor): mixed { return $this->run('collect-ration', $request, $actor); }
    public function stockHistory(Request $request, array $params, array $actor): mixed { return $this->run('stock-history', $request, $actor); }
    public function assignedStock(Request $request, array $params, array $actor): mixed { return $this->run('assigned-stock', $request, $actor); }
    public function bookings(Request $request, array $params, array $actor): mixed { return $this->run('bookings', $request, $actor); }
    public function updateBooking(Request $request, array $params, array $actor): mixed { return $this->run('update-booking', $request, $actor, ['bookingId' => $params['id'] ?? 0]); }
    public function receiveStock(Request $request, array $params, array $actor): mixed { return $this->run('receive-stock', $request, $actor); }
    public function alerts(Request $request, array $params, array $actor): mixed { return $this->run('alerts', $request, $actor); }
    public function markAlertRead(Request $request, array $params, array $actor): mixed { return $this->run('mark-alert-read', $request, $actor, ['notificationId' => $params['id'] ?? 0]); }
    public function complaints(Request $request, array $params, array $actor): mixed { return $this->run('complaints', $request, $actor); }
    public function respondComplaint(Request $request, array $params, array $actor): mixed { return $this->run('respond-complaint', $request, $actor, ['complaintId' => $params['id'] ?? 0]); }

    private function run(string $operation, Request $request, array $actor, array $extra = []): mixed
    {
        return $this->shopkeepers->execute($operation, $request->body(), ['actor' => $actor, 'query' => $request->query()] + $extra);
    }
}
