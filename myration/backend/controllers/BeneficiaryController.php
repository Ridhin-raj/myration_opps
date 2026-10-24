<?php
declare(strict_types=1);

namespace MyRation\Controllers;

use MyRation\Services\BeneficiaryService;
use MyRation\Utils\Request;

final class BeneficiaryController
{
    public function __construct(private readonly BeneficiaryService $beneficiaries) {}

    public function profile(Request $request, array $params, array $actor): mixed { return $this->run('profile', $request, $actor); }
    public function updateProfile(Request $request, array $params, array $actor): mixed { return $this->run('update-profile', $request, $actor); }
    public function quota(Request $request, array $params, array $actor): mixed { return $this->run('quota', $request, $actor); }
    public function history(Request $request, array $params, array $actor): mixed { return $this->run('history', $request, $actor); }
    public function quotaHistory(Request $request, array $params, array $actor): mixed { return $this->run('quota-history', $request, $actor); }
    public function shop(Request $request, array $params, array $actor): mixed { return $this->run('shop', $request, $actor); }
    public function shopStock(Request $request, array $params, array $actor): mixed { return $this->run('shop-stock', $request, $actor, ['shopId' => $params['id'] ?? 0]); }
    public function bookSlot(Request $request, array $params, array $actor): mixed { return $this->run('book-slot', $request, $actor); }
    public function slots(Request $request, array $params, array $actor): mixed { return $this->run('slots', $request, $actor); }
    public function complaint(Request $request, array $params, array $actor): mixed { return $this->run('complaint', $request, $actor); }
    public function complaints(Request $request, array $params, array $actor): mixed { return $this->run('complaints', $request, $actor); }
    public function alerts(Request $request, array $params, array $actor): mixed { return $this->run('alerts', $request, $actor); }
    public function markAlertRead(Request $request, array $params, array $actor): mixed { return $this->run('mark-alert-read', $request, $actor, ['notificationId' => $params['id'] ?? 0]); }

    private function run(string $operation, Request $request, array $actor, array $extra = []): mixed
    {
        return $this->beneficiaries->execute($operation, $request->body(), ['actor' => $actor, 'query' => $request->query()] + $extra);
    }
}
