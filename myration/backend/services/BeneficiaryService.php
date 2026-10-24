<?php
declare(strict_types=1);

namespace MyRation\Services;

use MyRation\Interfaces\ServiceInterface;
use MyRation\Repositories\BeneficiaryRepository;
use MyRation\Utils\ApiException;
use MyRation\Utils\Validator;

final class BeneficiaryService implements ServiceInterface
{
    public function __construct(private readonly BeneficiaryRepository $beneficiaries) {}

    public function execute(string $operation, array $input = [], array $context = []): mixed
    {
        $userId = (int) ($context['actor']['id'] ?? 0);
        return match ($operation) {
            'profile' => $this->profile($userId),
            'update-profile' => $this->updateProfile($userId, $input),
            'quota' => $this->quota($userId),
            'history' => $this->beneficiaries->collectionHistory($userId),
            'quota-history' => $this->beneficiaries->quotaHistory($userId, $this->limit($context['query']['limit'] ?? 10), $this->offset($context['query']['page'] ?? 1, $context['query']['limit'] ?? 10)),
            'shop' => $this->shop($userId),
            'shop-stock' => $this->shopStock($userId, (int) ($context['shopId'] ?? 0)),
            'book-slot' => $this->bookSlot($userId, $input),
            'slots' => $this->beneficiaries->bookings($userId),
            'complaint' => $this->complaint($userId, $input),
            'complaints' => $this->beneficiaries->complaints($userId),
            'alerts' => $this->alerts($context['actor'] ?? []),
            'mark-alert-read' => $this->markAlertRead($context['actor'] ?? [], (int) ($context['notificationId'] ?? 0)),
            default => throw new ApiException(404, 'Beneficiary action not found.'),
        };
    }

    private function profile(int $userId): array
    {
        $profile = $this->beneficiaries->profile($userId);
        if (!$profile) throw new ApiException(404, 'Profile not found.');
        return $profile;
    }

    private function updateProfile(int $userId, array $input): array
    {
        $allowed = ['mobile', 'dob', 'gender', 'state', 'district', 'taluk', 'village', 'pincode'];
        $data = array_intersect_key($input, array_flip($allowed));
        if ($data === []) throw new ApiException(422, 'No editable profile fields were supplied.');
        if (isset($data['mobile']) && !Validator::phone((string) $data['mobile'])) throw new ApiException(422, 'Mobile number must contain 10 to 15 digits.');
        if (isset($data['gender']) && !in_array($data['gender'], ['Male', 'Female', 'Other'], true)) throw new ApiException(422, 'Gender is invalid.');
        if (isset($data['dob']) && $data['dob'] !== '') $data['dob'] = Validator::date($data['dob'], 'Date of birth');
        if (isset($data['pincode']) && $data['pincode'] !== '' && !preg_match('/^[0-9]{6}$/', (string) $data['pincode'])) throw new ApiException(422, 'Pincode must contain 6 digits.');
        foreach (['state', 'district', 'taluk', 'village'] as $field) {
            if (isset($data[$field])) $data[$field] = $data[$field] === '' ? null : Validator::boundedText($data[$field], ucfirst($field), 100);
        }
        if (isset($data['dob']) && $data['dob'] === '') $data['dob'] = null;
        if (isset($data['gender']) && $data['gender'] === '') $data['gender'] = null;
        if (isset($data['pincode']) && $data['pincode'] === '') $data['pincode'] = null;
        $this->beneficiaries->updateProfile($userId, $data);
        return ['message' => 'Profile updated successfully.', 'profile' => $this->profile($userId)];
    }

    private function quota(int $userId): array
    {
        $profile = $this->beneficiaries->profile($userId);
        if (!$profile) throw new ApiException(404, 'Beneficiary profile not found.');
        $month = date('Y-m');
        return ['cardType' => $profile['card_type'], 'month' => date('F Y'), 'quota' => $this->beneficiaries->quota($userId, $month)];
    }

    private function shop(int $userId): array
    {
        $shop = $this->beneficiaries->assignedShop($userId);
        if (!$shop) throw new ApiException(404, 'No shop assigned yet.');
        return $shop;
    }

    private function shopStock(int $userId, int $shopId): array
    {
        if ($shopId < 1 || $this->beneficiaries->assignedShopId($userId) !== $shopId) {
            throw new ApiException(403, 'You can only view stock of your assigned shop.');
        }
        return $this->beneficiaries->shopStock($shopId);
    }

    private function bookSlot(int $userId, array $input): array
    {
        Validator::required($input, ['date', 'time']);
        $date = Validator::date($input['date'], 'Booking date');
        if ($date < date('Y-m-d')) throw new ApiException(422, 'Cannot book a slot for a past date.');
        $time = Validator::boundedText($input['time'], 'Booking slot', 40);
        $shopId = $this->beneficiaries->assignedShopId($userId);
        if (!$shopId) throw new ApiException(422, 'No shop assigned to you.');
        $this->beneficiaries->createBooking($userId, $shopId, $date, $time);
        return ['message' => 'Slot booked successfully', 'date' => $date, 'time' => $time];
    }

    private function complaint(int $userId, array $input): array
    {
        Validator::required($input, ['type', 'message']);
        $assignedShop = $this->beneficiaries->assignedShopId($userId);
        $requestedShop = isset($input['shopId']) ? (int) $input['shopId'] : $assignedShop;
        if (!$assignedShop || $requestedShop !== $assignedShop) throw new ApiException(403, 'You can only file a complaint against your assigned shop.');
        $type = Validator::boundedText($input['type'], 'Complaint type', 80);
        $message = Validator::boundedText($input['message'], 'Complaint message', 4000);
        $id = $this->beneficiaries->submitComplaint($userId, $requestedShop, $type, $message);
        return ['message' => 'Complaint submitted successfully', 'id' => $id];
    }

    private function alerts(array $actor): array
    {
        $shopId = $actor['role'] === 'shopkeeper' ? ($actor['shop_id'] ?? null) : $this->beneficiaries->assignedShopId((int) $actor['id']);
        return $this->beneficiaries->notifications((int) $actor['id'], $shopId ? (int) $shopId : null, (string) $actor['role']);
    }

    private function markAlertRead(array $actor, int $notificationId): array
    {
        if ($notificationId < 1) throw new ApiException(422, 'Notification ID is invalid.');
        $shopId = $actor['role'] === 'shopkeeper' ? ($actor['shop_id'] ?? null) : $this->beneficiaries->assignedShopId((int) $actor['id']);
        if (!$this->beneficiaries->markNotificationRead((int) $actor['id'], $notificationId, $shopId ? (int) $shopId : null, (string) $actor['role'])) {
            throw new ApiException(404, 'Notification not found.');
        }
        return ['message' => 'Notification marked as read.'];
    }

    private function limit(mixed $value): int
    {
        return max(1, min(100, (int) $value));
    }

    private function offset(mixed $page, mixed $limit): int
    {
        $page = max(1, (int) $page);
        return ($page - 1) * $this->limit($limit);
    }
}
