<?php
declare(strict_types=1);

namespace MyRation\Services;

use MyRation\Interfaces\ServiceInterface;
use MyRation\Repositories\BeneficiaryRepository;
use MyRation\Repositories\AdminRepository;
use MyRation\Repositories\ShopkeeperRepository;
use MyRation\Utils\ApiException;
use MyRation\Utils\Validator;

final class ShopkeeperService implements ServiceInterface
{
    public function __construct(
        private readonly ShopkeeperRepository $shops,
        private readonly BeneficiaryRepository $beneficiaries,
        private readonly AdminRepository $admin
    ) {}

    public function execute(string $operation, array $input = [], array $context = []): mixed
    {
        $actor = $context['actor'] ?? [];
        $userId = (int) ($actor['id'] ?? 0);
        $shopId = $this->shops->shopIdForOwner($userId);
        if ($operation === 'dashboard') {
            $result = $this->shops->dashboard($userId);
            if (!$result) throw new ApiException(404, 'No shop found for this shopkeeper.');
            return $result;
        }
        if (!$shopId) throw new ApiException(404, 'No shop found for this shopkeeper.');

        return match ($operation) {
            'pending' => $this->shops->pendingBeneficiaries($shopId),
            'verified' => $this->shops->verifiedBeneficiaries($shopId),
            'verify' => $this->verify($shopId, $input, (int) ($context['userId'] ?? 0)),
            'stock' => $this->shops->stock($shopId),
            'add-stock' => $this->addStock($shopId, $userId, $input, (int) ($context['stockId'] ?? 0)),
            'sell-stock' => $this->sellStock($shopId, $userId, $input, (int) ($context['stockId'] ?? $input['stockId'] ?? 0)),
            'shop-status' => $this->shopStatus($userId, $input),
            'beneficiary-quota' => $this->shops->beneficiaryQuota($shopId, (int) ($context['beneficiaryId'] ?? 0), date('Y-m')),
            'collect-ration' => $this->collect($shopId, $userId, $input),
            'stock-history' => $this->shops->stockHistory($shopId),
            'assigned-stock' => $this->shops->assignedStock($shopId, date('Y-m')),
            'bookings' => $this->shops->bookings($shopId),
            'update-booking' => $this->updateBooking($shopId, $input, (int) ($context['bookingId'] ?? 0)),
            'receive-stock' => $this->receiveStock($shopId, $userId, $input),
            'alerts' => $this->beneficiaries->notifications($userId, $shopId, 'shopkeeper'),
            'mark-alert-read' => $this->markAlertRead($userId, $shopId, (int) ($context['notificationId'] ?? 0)),
            'complaints' => $this->admin->shopComplaints($shopId),
            'respond-complaint' => $this->respondComplaint($shopId, $userId, $input, (int) ($context['complaintId'] ?? 0)),
            default => throw new ApiException(404, 'Shopkeeper action not found.'),
        };
    }

    private function verify(int $shopId, array $input, int $beneficiaryId): array
    {
        $action = $input['action'] ?? '';
        if (!in_array($action, ['approve', 'reject'], true)) throw new ApiException(422, 'Action must be approve or reject.');
        if ($beneficiaryId < 1) throw new ApiException(422, 'Beneficiary ID is invalid.');
        $this->shops->verifyBeneficiary($shopId, $beneficiaryId, $action);
        return ['message' => $action === 'approve' ? 'Beneficiary verified successfully.' : 'Beneficiary registration rejected.'];
    }

    private function addStock(int $shopId, int $actorId, array $input, int $stockId): array
    {
        $quantity = Validator::positiveNumber($input['quantity'] ?? null, 'Quantity');
        if ($stockId < 1) throw new ApiException(422, 'Stock item ID is invalid.');
        $this->shops->addStock($shopId, $stockId, $quantity, $actorId);
        return ['message' => 'Stock arrival recorded successfully'];
    }

    private function sellStock(int $shopId, int $actorId, array $input, int $stockId): array
    {
        $quantity = Validator::positiveNumber($input['quantity'] ?? null, 'Quantity');
        if ($stockId < 1) throw new ApiException(422, 'Stock item ID is invalid.');
        $this->shops->sellStock($shopId, $stockId, $quantity, $actorId);
        return ['message' => 'Sale recorded successfully'];
    }

    private function shopStatus(int $userId, array $input): array
    {
        if (!array_key_exists('is_open', $input)) throw new ApiException(422, 'Shop status is required.');
        $value = filter_var($input['is_open'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($value === null) throw new ApiException(422, 'Shop status must be true or false.');
        $this->shops->setOpen($userId, $value);
        return ['message' => 'Shop is now ' . ($value ? 'open' : 'closed')];
    }

    private function collect(int $shopId, int $actorId, array $input): array
    {
        Validator::required($input, ['userId', 'itemName', 'amount']);
        if (filter_var($input['userId'], FILTER_VALIDATE_INT) === false || (int) $input['userId'] < 1) throw new ApiException(422, 'Beneficiary ID is invalid.');
        $itemName = Validator::boundedText($input['itemName'], 'Item name', 80);
        $amount = Validator::positiveNumber($input['amount'], 'Amount');
        $remaining = $this->shops->collectRation($shopId, $actorId, (int) $input['userId'], $itemName, $amount, date('Y-m'));
        return ['message' => 'Ration collected successfully', 'remainingQuota' => $remaining];
    }

    private function receiveStock(int $shopId, int $actorId, array $input): array
    {
        if (filter_var($input['assignmentId'] ?? null, FILTER_VALIDATE_INT) === false || (int) $input['assignmentId'] < 1) {
            throw new ApiException(422, 'Assignment ID is required.');
        }
        $inventory = $this->shops->receiveStock($shopId, $actorId, (int) $input['assignmentId']);
        return ['message' => 'Stock received successfully.', 'inventory' => $inventory];
    }

    private function markAlertRead(int $userId, int $shopId, int $notificationId): array
    {
        if (!$this->beneficiaries->markNotificationRead($userId, $notificationId, $shopId, 'shopkeeper')) throw new ApiException(404, 'Notification not found.');
        return ['message' => 'Notification marked as read.'];
    }

    private function respondComplaint(int $shopId, int $userId, array $input, int $complaintId): array
    {
        Validator::required($input, ['response']);
        if ($complaintId < 1) throw new ApiException(422, 'Complaint ID is invalid.');
        $response = Validator::boundedText($input['response'], 'Response', 4000);
        $this->admin->shopkeeperComplaintResponse($shopId, $complaintId, $userId, $response);
        return ['message' => 'Complaint response sent.'];
    }

    private function updateBooking(int $shopId, array $input, int $bookingId): array
    {
        $status = $input['status'] ?? '';
        if (!in_array($status, ['completed', 'cancelled'], true)) throw new ApiException(422, 'Booking status must be completed or cancelled.');
        if ($bookingId < 1) throw new ApiException(422, 'Booking ID is invalid.');
        $this->shops->updateBooking($shopId, $bookingId, $status);
        return ['message' => 'Booking updated successfully.'];
    }
}
