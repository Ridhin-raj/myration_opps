<?php
declare(strict_types=1);

namespace MyRation\Services;

use DateTimeImmutable;
use MyRation\Interfaces\ServiceInterface;
use MyRation\Repositories\AdminRepository;
use MyRation\Utils\ApiException;
use MyRation\Utils\Validator;

final class AdminService implements ServiceInterface
{
    public function __construct(private readonly AdminRepository $admin) {}

    public function execute(string $operation, array $input = [], array $context = []): mixed
    {
        return match ($operation) {
            'dashboard' => $this->admin->dashboard(),
            'pending' => $this->admin->pending(),
            'approve' => $this->approve($input, $context),
            'quota' => $this->admin->quotaSettings(),
            'update-quota' => $this->updateQuota($input),
            'new-item' => $this->newItem($input),
            'remove-quota' => $this->removeQuota($context),
            'complaints' => $this->admin->complaints(),
            'resolve-complaint' => $this->resolveComplaint($input, $context),
            'users' => $this->admin->users(isset($context['role']) ? (string) $context['role'] : null),
            'shops' => $this->admin->shops(),
            'assign-beneficiary' => $this->assignBeneficiary($input, $context),
            'demand' => $this->demand((int) ($context['shopId'] ?? 0)),
            'allocate' => $this->allocate($input, $context),
            'monthly-reset' => ['message' => 'Monthly cycle for ' . date('F Y') . ' is now active.'],
            'stock' => $this->admin->stockOverview(),
            'distributions' => $this->admin->distributionHistory($this->limit($context['query']['limit'] ?? 100), $this->offset($context['query']['page'] ?? 1, $context['query']['limit'] ?? 100)),
            'bookings' => $this->admin->bookings(),
            'notifications' => $this->admin->notifications(),
            'create-notification' => $this->createNotification($input),
            'delete-notification' => $this->deleteNotification((int) ($context['notificationId'] ?? 0)),
            'categories' => $this->admin->categories(),
            'items' => $this->admin->allItems(),
            default => throw new ApiException(404, 'Admin action not found.'),
        };
    }

    private function approve(array $input, array $context): array
    {
        Validator::required($input, ['type', 'action']);
        if (!in_array($input['action'], ['approve', 'reject'], true)) throw new ApiException(422, 'Action must be approve or reject.');
        $id = (int) ($context['id'] ?? 0);
        if ($id < 1) throw new ApiException(422, 'Registration ID is invalid.');
        $type = strtolower((string) $input['type']);
        $this->admin->approve($type, $id, $input['action']);
        return ['message' => 'Registration ' . $input['action'] . 'd successfully'];
    }

    private function updateQuota(array $input): array
    {
        Validator::required($input, ['card_type', 'items']);
        $cardType = Validator::cardType($input['card_type']);
        if (!is_array($input['items']) || $input['items'] === []) throw new ApiException(422, 'At least one quota item is required.');
        $items = [];
        foreach ($input['items'] as $item) {
            if (!is_array($item)) throw new ApiException(422, 'Quota item is invalid.');
            Validator::required($item, ['item', 'qty', 'price']);
            $items[] = [
                'item' => Validator::boundedText($item['item'], 'Item name', 80),
                'quantity' => $this->numberFromLabel($item['qty'], 'Quota quantity'),
                'price' => $this->priceFromLabel($item['price']),
            ];
        }
        $this->admin->saveQuotas($cardType, $items);
        return ['message' => 'Quota for ' . $cardType . ' updated successfully'];
    }

    private function newItem(array $input): array
    {
        Validator::required($input, ['itemName', 'quantity', 'price']);
        $name = Validator::boundedText($input['itemName'], 'Item name', 80);
        $unit = trim((string) ($input['unit'] ?? 'kg'));
        if (!preg_match('/^[A-Za-z]{1,12}$/', $unit)) throw new ApiException(422, 'Item unit is invalid.');
        $quantity = $this->numberFromLabel($input['quantity'], 'Monthly quota');
        $price = $this->priceFromLabel($input['price']);
        $initialStock = isset($input['initialStock']) && $input['initialStock'] !== '' ? $this->nonNegativeNumber($input['initialStock'], 'Initial stock') : 0.0;
        $this->admin->addItem($name, $unit, $quantity, $price, $initialStock);
        return ['message' => "Item '{$name}' successfully added."];
    }

    private function removeQuota(array $context): array
    {
        $cardType = Validator::cardType($context['cardType'] ?? '');
        $itemName = Validator::boundedText((string) ($context['itemName'] ?? ''), 'Item name', 80);
        $this->admin->removeQuota($cardType, $itemName);
        return ['message' => "Item '{$itemName}' removed from {$cardType} quota."];
    }

    private function assignBeneficiary(array $input, array $context): array
    {
        if (filter_var($input['shopId'] ?? null, FILTER_VALIDATE_INT) === false || (int) $input['shopId'] < 1) {
            throw new ApiException(422, 'An approved shop ID is required.');
        }
        $beneficiaryId = (int) ($context['beneficiaryId'] ?? 0);
        if ($beneficiaryId < 1) throw new ApiException(422, 'Beneficiary ID is invalid.');
        $this->admin->assignBeneficiary($beneficiaryId, (int) $input['shopId']);
        return ['message' => 'Beneficiary assigned to shop and sent for verification.'];
    }

    private function resolveComplaint(array $input, array $context): array
    {
        Validator::required($input, ['action']);
        $id = (int) ($context['id'] ?? 0);
        if ($id < 1) throw new ApiException(422, 'Complaint ID is invalid.');
        $response = isset($input['response']) ? Validator::boundedText($input['response'], 'Response', 4000) : '';
        $warning = filter_var($input['warning'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $this->admin->resolveComplaint($id, (string) $input['action'], $response, (int) ($context['actor']['id'] ?? 0), $warning);
        return ['message' => 'Complaint updated successfully.'];
    }

    private function demand(int $shopId): array
    {
        if ($shopId < 1) throw new ApiException(422, 'Shop ID is invalid.');
        $now = new DateTimeImmutable('first day of this month');
        $current = $now->format('Y-m');
        $previous = $now->modify('-1 month')->format('Y-m');
        $rules = $this->admin->demandRows($shopId, $current, $previous);
        $stocks = $this->admin->stockForDemand($shopId, $current, $previous);
        $demand = [];
        foreach ($rules as $rule) {
            $name = $rule['item_name'];
            $count = (int) $rule['beneficiary_count'];
            $amount = (float) $rule['monthly_quantity'] * $count;
            $demand[$name] ??= ['item' => $name, 'totalDemand' => 0.0, 'details' => []];
            $demand[$name]['totalDemand'] += $amount;
            $demand[$name]['details'][] = ['cardType' => $rule['card_type'], 'userCount' => $count, 'quotaPerUser' => (float) $rule['monthly_quantity'], 'subTotal' => $amount];
        }
        $result = [];
        foreach ($demand as $name => $row) {
            $currentStock = null;
            $previousStock = null;
            foreach ($stocks as $stock) {
                if ($stock['item_name'] !== $name) continue;
                if ($stock['month_year'] === $current) $currentStock = $stock;
                if ($stock['month_year'] === $previous) $previousStock = $stock;
            }
            $surplus = $previousStock ? max(0, (float) $previousStock['allocated_quantity'] - (float) $previousStock['distributed_quantity']) : 0.0;
            $row['currentMonthAllocated'] = $currentStock ? (float) $currentStock['allocated_quantity'] : 0.0;
            $row['previousMonthSurplus'] = $surplus;
            $row['suggestedShipment'] = max(0, (float) $row['totalDemand'] - $surplus);
            $result[] = $row;
        }
        return $result;
    }

    private function allocate(array $input, array $context): array
    {
        if (!isset($input['items']) || !is_array($input['items']) || $input['items'] === []) throw new ApiException(422, 'At least one stock item is required.');
        $items = [];
        foreach ($input['items'] as $item) {
            if (!is_array($item)) throw new ApiException(422, 'Stock item is invalid.');
            Validator::required($item, ['itemName', 'quantity']);
            $items[] = ['itemName' => Validator::boundedText($item['itemName'], 'Item name', 80), 'quantity' => Validator::positiveNumber($item['quantity'], 'Quantity')];
        }
        $shopId = (int) ($context['shopId'] ?? 0);
        if ($shopId < 1) throw new ApiException(422, 'Shop ID is invalid.');
        $this->admin->allocate($shopId, $items, (int) ($context['actor']['id'] ?? 0), date('Y-m'));
        return ['message' => 'Stock assignment created for current month.'];
    }

    private function createNotification(array $input): array
    {
        Validator::required($input, ['message']);
        $message = Validator::boundedText($input['message'], 'Message', 500);
        $type = $input['notification_type'] ?? 'info';
        if (!in_array($type, ['info', 'success', 'warning'], true)) throw new ApiException(422, 'Notification type is invalid.');
        $data = ['message' => $message, 'notification_type' => $type];
        if (isset($input['target_role']) && $input['target_role'] !== '') {
            if (!in_array($input['target_role'], ['admin', 'shopkeeper', 'user'], true)) throw new ApiException(422, 'Target role is invalid.');
            $data['target_role'] = $input['target_role'];
        }
        if (isset($input['user_id']) && $input['user_id'] !== '') $data['user_id'] = (int) $input['user_id'];
        if (isset($input['shop_id']) && $input['shop_id'] !== '') $data['shop_id'] = (int) $input['shop_id'];
        $id = $this->admin->createNotification($data);
        return ['message' => 'Notification published successfully.', 'id' => $id];
    }

    private function deleteNotification(int $notificationId): array
    {
        if ($notificationId < 1) throw new ApiException(422, 'Notification ID is invalid.');
        $this->admin->deleteNotification($notificationId);
        return ['message' => 'Notification removed successfully.'];
    }

    private function numberFromLabel(mixed $value, string $field): float
    {
        if (!is_string($value) && !is_numeric($value)) throw new ApiException(422, $field . ' is invalid.');
        if (!preg_match('/^\s*(\d+(?:\.\d+)?)\s*[A-Za-z]*\s*$/', (string) $value, $match)) throw new ApiException(422, $field . ' must be a numeric quantity.');
        return (float) $match[1];
    }

    private function priceFromLabel(mixed $value): float
    {
        if (!preg_match('/^\s*(?:₹|Rs\.?\s*)?(\d+(?:\.\d{1,2})?)(?:\s*\/\s*[A-Za-z]+)?\s*$/u', (string) $value, $match)) {
            throw new ApiException(422, 'Price must be a non-negative amount.');
        }
        return (float) $match[1];
    }

    private function nonNegativeNumber(mixed $value, string $field): float
    {
        if (!is_numeric($value) || (float) $value < 0) throw new ApiException(422, $field . ' must be zero or more.');
        return (float) $value;
    }

    private function limit(mixed $value): int { return max(1, min(200, (int) $value)); }
    private function offset(mixed $page, mixed $limit): int { return (max(1, (int) $page) - 1) * $this->limit($limit); }
}
