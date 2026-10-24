<?php
declare(strict_types=1);

namespace MyRation\Repositories;

final class BeneficiaryRepository extends AbstractRepository
{
    public function findById(int $id): ?array
    {
        return $this->one('SELECT user_id FROM beneficiaries WHERE user_id = ?', [$id]);
    }

    public function profile(int $userId): ?array
    {
        return $this->one(
            'SELECT u.id, u.name, u.mobile, u.aadhaar, u.approval_status AS status, u.username,
                    b.dob, b.gender, b.ration_card_no, c.code AS card_type, b.family_members,
                    b.state, b.district, b.taluk, b.village, b.pincode, b.assigned_shop_id,
                    b.verified_by_shopkeeper, b.verified_by_admin, b.ration_card_image
             FROM users u JOIN beneficiaries b ON b.user_id = u.id
             JOIN ration_categories c ON c.id = b.category_id WHERE u.id = ?',
            [$userId]
        );
    }

    public function updateProfile(int $userId, array $data): void
    {
        $this->transaction(function () use ($userId, $data): void {
            if (array_key_exists('mobile', $data)) $this->execute('UPDATE users SET mobile = ? WHERE id = ?', [$data['mobile'], $userId]);
            $columns = ['dob', 'gender', 'state', 'district', 'taluk', 'village', 'pincode'];
            $sets = [];
            $params = [];
            foreach ($columns as $column) {
                if (array_key_exists($column, $data)) {
                    $sets[] = $column . ' = ?';
                    $params[] = $data[$column];
                }
            }
            if ($sets !== []) {
                $params[] = $userId;
                $this->execute('UPDATE beneficiaries SET ' . implode(', ', $sets) . ' WHERE user_id = ?', $params);
            }
        });
    }

    public function quota(int $userId, string $monthYear): array
    {
        $this->execute(
            'INSERT INTO monthly_entitlements (beneficiary_user_id, item_id, month_year, total_quantity, remaining_quantity)
             SELECT b.user_id, q.item_id, ?, (q.monthly_quantity * COALESCE(b.family_members, 1)), (q.monthly_quantity * COALESCE(b.family_members, 1))
             FROM beneficiaries b JOIN category_quotas q ON q.category_id = b.category_id WHERE b.user_id = ?
             ON DUPLICATE KEY UPDATE
               total_quantity = (q.monthly_quantity * COALESCE(b.family_members, 1)),
               remaining_quantity = LEAST(remaining_quantity, (q.monthly_quantity * COALESCE(b.family_members, 1)))',
            [$monthYear, $userId]
        );
        return $this->all(
            'SELECT i.item_name AS item, e.total_quantity AS total, e.remaining_quantity AS remaining,
                    CONCAT("₹", FORMAT(q.unit_price, 2), "/", i.unit) AS price, i.unit,
                    b.family_members, q.monthly_quantity AS per_person_qty
             FROM monthly_entitlements e JOIN ration_items i ON i.id = e.item_id
             LEFT JOIN beneficiaries b ON b.user_id = e.beneficiary_user_id
             LEFT JOIN category_quotas q ON q.category_id = b.category_id AND q.item_id = e.item_id
             WHERE e.beneficiary_user_id = ? AND e.month_year = ? ORDER BY i.item_name',
            [$userId, $monthYear]
        );
    }

    public function quotaHistory(int $userId, int $limit, int $offset): array
    {
        $rows = $this->all(
            'SELECT di.item_id, i.item_name, di.quantity AS amount, di.remaining_after AS remaining_quota,
                    di.quota_total AS total_quota, d.distributed_at AS timestamp, d.shop_id, s.shop_name,
                    CONCAT("₹", FORMAT(di.unit_price, 2)) AS price
             FROM distribution_items di JOIN distributions d ON d.id = di.distribution_id
             JOIN ration_items i ON i.id = di.item_id JOIN shops s ON s.id = d.shop_id
             WHERE d.beneficiary_user_id = ? ORDER BY d.distributed_at DESC, di.id DESC LIMIT ? OFFSET ?',
            [$userId, $limit, $offset]
        );
        $count = $this->one('SELECT COUNT(*) AS total FROM distributions WHERE beneficiary_user_id = ?', [$userId]);
        $total = (int) ($count['total'] ?? 0);
        return ['history' => $rows, 'pagination' => ['total' => $total, 'page' => (int) floor($offset / max(1, $limit)) + 1, 'limit' => $limit, 'pages' => (int) ceil($total / max(1, $limit))]];
    }

    public function collectionHistory(int $userId): array
    {
        $rows = $this->all(
            'SELECT d.month_year, i.item_name, di.quantity, i.unit, di.unit_price, d.distributed_at
             FROM distributions d JOIN distribution_items di ON di.distribution_id = d.id
             JOIN ration_items i ON i.id = di.item_id WHERE d.beneficiary_user_id = ?
             ORDER BY d.distributed_at DESC, di.id DESC',
            [$userId]
        );
        $grouped = [];
        foreach ($rows as $row) {
            $key = $row['month_year'];
            if (!isset($grouped[$key])) {
                $date = \DateTimeImmutable::createFromFormat('!Y-m', $key);
                $grouped[$key] = ['month' => $date ? $date->format('F Y') : $key, 'items' => [], 'collected' => true];
            }
            $grouped[$key]['items'][] = [
                'item' => $row['item_name'],
                'qty' => rtrim(rtrim(number_format((float) $row['quantity'], 3, '.', ''), '0'), '.') . ' ' . $row['unit'],
                'price' => '₹' . number_format((float) $row['unit_price'], 2),
            ];
        }
        return array_values($grouped);
    }

    public function assignedShop(int $userId): ?array
    {
        return $this->one(
            'SELECT s.id, s.shop_name, s.shop_name AS name, s.license_no, s.village, s.district, s.taluk, s.state,
                    s.is_open, u.name AS owner_name
             FROM beneficiaries b JOIN shops s ON s.id = b.assigned_shop_id JOIN users u ON u.id = s.owner_user_id
             WHERE b.user_id = ?',
            [$userId]
        );
    }

    public function assignedShopId(int $userId): ?int
    {
        $row = $this->one('SELECT assigned_shop_id FROM beneficiaries WHERE user_id = ?', [$userId]);
        return isset($row['assigned_shop_id']) ? (int) $row['assigned_shop_id'] : null;
    }

    public function shopStock(int $shopId): array
    {
        return $this->all(
            'SELECT i.item_name AS item, ss.allocated_quantity AS allocated, ss.distributed_quantity AS distributed,
                    GREATEST(ss.allocated_quantity - ss.distributed_quantity, 0) AS remaining, i.unit
             FROM shop_stock ss JOIN ration_items i ON i.id = ss.item_id
             WHERE ss.shop_id = ? AND ss.month_year = ? ORDER BY i.item_name',
            [$shopId, date('Y-m')]
        );
    }

    public function createBooking(int $userId, int $shopId, string $date, string $time): int
    {
        return $this->insert(
            "INSERT INTO bookings (beneficiary_user_id, shop_id, booking_date, time_slot, status) VALUES (?, ?, ?, ?, 'booked')",
            [$userId, $shopId, $date, $time]
        );
    }

    public function bookings(int $userId): array
    {
        return $this->all(
            'SELECT booking_date, time_slot, status FROM bookings WHERE beneficiary_user_id = ? ORDER BY booking_date DESC, created_at DESC',
            [$userId]
        );
    }

    public function submitComplaint(int $userId, int $shopId, string $type, string $message): int
    {
        return $this->insert(
            "INSERT INTO complaints (beneficiary_user_id, shop_id, complaint_type, message) VALUES (?, ?, ?, ?)",
            [$userId, $shopId, $type, $message]
        );
    }

    public function complaints(int $userId): array
    {
        return $this->all(
            'SELECT c.id, c.complaint_type, c.message, c.status, c.admin_response, c.shopkeeper_response, c.created_at,
                    s.shop_name FROM complaints c JOIN shops s ON s.id = c.shop_id
             WHERE c.beneficiary_user_id = ? ORDER BY c.created_at DESC',
            [$userId]
        );
    }

    public function notifications(int $userId, ?int $shopId, string $role): array
    {
        $dbNotifications = $this->all(
            'SELECT n.id, n.message, n.notification_type AS alert_type, (n.read_at IS NOT NULL) AS is_read, n.created_at
             FROM notifications n
             WHERE n.user_id = ? OR (n.user_id IS NULL AND n.shop_id IS NULL AND n.target_role IS NULL)
                OR (n.user_id IS NULL AND n.target_role = ?)
                OR (n.user_id IS NULL AND n.shop_id = ?) ORDER BY n.created_at DESC LIMIT 50',
            [$userId, $role, $shopId]
        );

        $stockAlerts = [];
        if ($role === 'user' && $shopId) {
            $stockAlerts = $this->getStockAlertsForShop($shopId);
        }

        return array_merge($stockAlerts, $dbNotifications);
    }

    private function getStockAlertsForShop(int $shopId): array
    {
        $currentMonth = date('Y-m');
        $stocks = $this->all(
            'SELECT i.item_name, i.unit, ss.allocated_quantity, ss.distributed_quantity, ss.updated_at
             FROM shop_stock ss
             JOIN ration_items i ON i.id = ss.item_id
             WHERE ss.shop_id = ? AND ss.month_year = ?',
            [$shopId, $currentMonth]
        );

        $alerts = [];
        foreach ($stocks as $stk) {
            $allocated = (float) $stk['allocated_quantity'];
            $distributed = (float) $stk['distributed_quantity'];
            $remaining = max(0, $allocated - $distributed);
            $itemName = $stk['item_name'];
            $unit = $stk['unit'] ?? 'kg';

            if ($allocated > 0) {
                // Stock arrival notification
                $alerts[] = [
                    'id' => 'stock_arrival_' . md5($itemName),
                    'message' => "New stock of {$itemName} is available at your assigned ration shop.",
                    'alert_type' => 'info',
                    'is_read' => false,
                    'created_at' => $stk['updated_at'] ?? date('Y-m-d H:i:s'),
                ];

                // Limited stock warning if remaining stock is low (e.g. <= 50 or <= 25% of allocated)
                if ($remaining > 0 && ($remaining <= 50 || ($remaining / $allocated) <= 0.25)) {
                    $alerts[] = [
                        'id' => 'stock_low_' . md5($itemName),
                        'message' => "Limited stock alert for {$itemName} at your assigned ration shop. Please collect your ration soon.",
                        'alert_type' => 'warning',
                        'is_read' => false,
                        'created_at' => date('Y-m-d H:i:s'),
                    ];
                } elseif ($remaining == 0 && $distributed > 0) {
                    $alerts[] = [
                        'id' => 'stock_out_' . md5($itemName),
                        'message' => "{$itemName} is currently out of stock at your assigned ration shop.",
                        'alert_type' => 'danger',
                        'is_read' => false,
                        'created_at' => date('Y-m-d H:i:s'),
                    ];
                }
            }
        }
        return $alerts;
    }

    public function markNotificationRead(int $userId, int $notificationId, ?int $shopId, string $role): bool
    {
        return $this->execute(
            'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND
             (user_id = ? OR (user_id IS NULL AND shop_id = ?) OR
              (user_id IS NULL AND shop_id IS NULL AND (target_role IS NULL OR target_role = ?)))',
            [$notificationId, $userId, $shopId, $role]
        ) > 0;
    }
}
