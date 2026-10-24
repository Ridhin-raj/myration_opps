<?php
declare(strict_types=1);

namespace MyRation\Repositories;

use MyRation\Utils\ApiException;

final class ShopkeeperRepository extends AbstractRepository
{
    public function findById(int $id): ?array
    {
        return $this->one('SELECT id FROM shops WHERE id = ?', [$id]);
    }

    public function shopIdForOwner(int $userId): ?int
    {
        $row = $this->one('SELECT id FROM shops WHERE owner_user_id = ?', [$userId]);
        return isset($row['id']) ? (int) $row['id'] : null;
    }

    public function dashboard(int $userId): ?array
    {
        $shop = $this->one('SELECT id, shop_name, is_open FROM shops WHERE owner_user_id = ?', [$userId]);
        if (!$shop) return null;
        $stats = $this->one(
            "SELECT
                SUM(CASE WHEN u.approval_status = 'pending' AND b.verified_by_shopkeeper = 0 THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN b.verified_by_shopkeeper = 1 THEN 1 ELSE 0 END) AS verified
             FROM beneficiaries b JOIN users u ON u.id = b.user_id WHERE b.assigned_shop_id = ?",
            [(int) $shop['id']]
        );
        $stock = $this->one('SELECT COUNT(*) AS count FROM shop_stock WHERE shop_id = ? AND month_year = ?', [(int) $shop['id'], date('Y-m')]);
        return ['shop' => $shop, 'stats' => ['pending' => (int) ($stats['pending'] ?? 0), 'verified' => (int) ($stats['verified'] ?? 0), 'stockItems' => (int) ($stock['count'] ?? 0)]];
    }

    public function pendingBeneficiaries(int $shopId): array
    {
        return $this->all(
                "SELECT u.id, u.username, u.name, u.mobile, u.aadhaar, u.created_at AS date,
                    b.dob, b.gender, b.ration_card_no, c.code AS cardType, b.family_members AS members,
                    b.state, b.district, b.taluk, b.village, b.pincode, b.ration_card_image,
                    s.id AS assigned_shop_id, s.shop_name AS assigned_shop_name
                 FROM beneficiaries b JOIN users u ON u.id = b.user_id JOIN ration_categories c ON c.id = b.category_id
                 LEFT JOIN shops s ON s.id = b.assigned_shop_id
             WHERE b.assigned_shop_id = ? AND b.verified_by_shopkeeper = 0 AND u.approval_status = 'pending'
             ORDER BY u.created_at",
            [$shopId]
        );
    }

    public function verifiedBeneficiaries(int $shopId): array
    {
        return $this->all(
            "SELECT u.id, u.name, u.mobile, c.code AS cardType, b.family_members AS members, u.approval_status AS status
             FROM beneficiaries b JOIN users u ON u.id = b.user_id JOIN ration_categories c ON c.id = b.category_id
             WHERE b.assigned_shop_id = ? AND b.verified_by_shopkeeper = 1 ORDER BY u.name",
            [$shopId]
        );
    }

    public function verifyBeneficiary(int $shopId, int $userId, string $action): void
    {
        $this->transaction(function () use ($shopId, $userId, $action): void {
            $beneficiary = $this->one(
                'SELECT b.user_id FROM beneficiaries b JOIN users u ON u.id = b.user_id
                 WHERE b.user_id = ? AND b.assigned_shop_id = ? AND u.approval_status = \'pending\' FOR UPDATE',
                [$userId, $shopId]
            );
            if (!$beneficiary) throw new ApiException(404, 'Pending beneficiary is not assigned to your shop.');
            if ($action === 'approve') {
                $this->execute('UPDATE beneficiaries SET verified_by_shopkeeper = 1 WHERE user_id = ?', [$userId]);
                $this->execute("UPDATE users SET approval_status = 'approved' WHERE id = ?", [$userId]);
            } else {
                $this->execute("UPDATE users SET approval_status = 'rejected' WHERE id = ?", [$userId]);
            }
        });
    }

    public function stock(int $shopId): array
    {
        return $this->all(
            'SELECT ss.id, i.item_name AS item, ss.allocated_quantity AS allocated,
                    ss.distributed_quantity AS distributed,
                    GREATEST(0, ss.allocated_quantity - ss.distributed_quantity) AS remaining,
                    i.unit, ss.updated_at AS last_updated
             FROM shop_stock ss JOIN ration_items i ON i.id = ss.item_id
             WHERE ss.shop_id = ? AND ss.month_year = ? ORDER BY i.item_name',
            [$shopId, date('Y-m')]
        );
    }

    public function addStock(int $shopId, int $stockId, float $quantity, int $actorId): void
    {
        $this->transaction(function () use ($shopId, $stockId, $quantity, $actorId): void {
            $stock = $this->one(
                'SELECT ss.id, ss.item_id, i.item_name FROM shop_stock ss JOIN ration_items i ON i.id = ss.item_id
                 WHERE ss.id = ? AND ss.shop_id = ? AND ss.month_year = ? FOR UPDATE',
                [$stockId, $shopId, date('Y-m')]
            );
            if (!$stock) throw new ApiException(404, 'Stock item not found for this shop.');
            $this->execute('UPDATE shop_stock SET allocated_quantity = allocated_quantity + ? WHERE id = ?', [$quantity, $stockId]);
            $this->movement($shopId, (int) $stock['item_id'], $actorId, 'added', $quantity);
            $this->execute(
                "INSERT INTO notifications (shop_id, message, notification_type) VALUES (?, ?, 'success')",
                [$shopId, 'New stock of ' . $stock['item_name'] . ' arrived at your shop!']
            );
        });
    }

    public function sellStock(int $shopId, int $stockId, float $quantity, int $actorId): void
    {
        $this->transaction(function () use ($shopId, $stockId, $quantity, $actorId): void {
            $stock = $this->one(
                'SELECT id, item_id, allocated_quantity, distributed_quantity FROM shop_stock
                 WHERE id = ? AND shop_id = ? AND month_year = ? FOR UPDATE',
                [$stockId, $shopId, date('Y-m')]
            );
            if (!$stock) throw new ApiException(404, 'Stock item not found for this shop.');
            $available = (float) $stock['allocated_quantity'] - (float) $stock['distributed_quantity'];
            if ($quantity > $available) throw new ApiException(422, 'Cannot distribute more than available stock.');
            $this->execute('UPDATE shop_stock SET distributed_quantity = distributed_quantity + ? WHERE id = ?', [$quantity, $stockId]);
            $this->movement($shopId, (int) $stock['item_id'], $actorId, 'distributed', $quantity);
        });
    }

    public function setOpen(int $userId, bool $isOpen): void
    {
        if (!$this->one('SELECT id FROM shops WHERE owner_user_id = ?', [$userId])) throw new ApiException(404, 'Shop not found.');
        $this->execute('UPDATE shops SET is_open = ? WHERE owner_user_id = ?', [$isOpen, $userId]);
    }

    public function beneficiaryQuota(int $shopId, int $beneficiaryId, string $monthYear): array
    {
        $profile = $this->one(
            'SELECT b.user_id FROM beneficiaries b JOIN users u ON u.id = b.user_id
             WHERE b.user_id = ? AND b.assigned_shop_id = ? AND b.verified_by_shopkeeper = 1
               AND u.approval_status = \'approved\'',
            [$beneficiaryId, $shopId]
        );
        if (!$profile) throw new ApiException(403, 'Beneficiary is not verified and assigned to your shop.');
        $this->execute(
            'INSERT INTO monthly_entitlements (beneficiary_user_id, item_id, month_year, total_quantity, remaining_quantity)
             SELECT b.user_id, q.item_id, ?, (q.monthly_quantity * COALESCE(b.family_members, 1)), (q.monthly_quantity * COALESCE(b.family_members, 1))
             FROM beneficiaries b JOIN category_quotas q ON q.category_id = b.category_id WHERE b.user_id = ?
             ON DUPLICATE KEY UPDATE
               total_quantity = (q.monthly_quantity * COALESCE(b.family_members, 1)),
               remaining_quantity = LEAST(remaining_quantity, (q.monthly_quantity * COALESCE(b.family_members, 1)))',
            [$monthYear, $beneficiaryId]
        );
        return $this->all(
            'SELECT i.item_name, e.total_quantity AS total_quota, e.remaining_quantity AS remaining_quota,
                    i.unit, q.unit_price AS price, b.family_members, q.monthly_quantity AS per_person_qty
             FROM monthly_entitlements e JOIN ration_items i ON i.id = e.item_id
             JOIN beneficiaries b ON b.user_id = e.beneficiary_user_id
             LEFT JOIN category_quotas q ON q.category_id = b.category_id AND q.item_id = e.item_id
             WHERE e.beneficiary_user_id = ? AND e.month_year = ? ORDER BY i.item_name',
            [$beneficiaryId, $monthYear]
        );
    }

    public function collectRation(int $shopId, int $actorId, int $beneficiaryId, string $itemName, float $quantity, string $monthYear): float
    {
        return $this->transaction(function () use ($shopId, $actorId, $beneficiaryId, $itemName, $quantity, $monthYear): float {
            $beneficiary = $this->one(
                'SELECT b.user_id, c.id AS category_id FROM beneficiaries b
                 JOIN users u ON u.id = b.user_id JOIN ration_categories c ON c.id = b.category_id
                 WHERE b.user_id = ? AND b.assigned_shop_id = ? AND b.verified_by_shopkeeper = 1
                   AND u.approval_status = \'approved\' FOR UPDATE',
                [$beneficiaryId, $shopId]
            );
            if (!$beneficiary) throw new ApiException(403, 'Beneficiary eligibility could not be verified for this shop.');
            $item = $this->one(
                'SELECT i.id, q.unit_price FROM ration_items i JOIN category_quotas q ON q.item_id = i.id
                 WHERE i.item_name = ? AND q.category_id = ? AND i.is_active = 1',
                [$itemName, (int) $beneficiary['category_id']]
            );
            if (!$item) throw new ApiException(404, 'Ration item or category quota was not found.');

            $this->execute(
                'INSERT INTO monthly_entitlements (beneficiary_user_id, item_id, month_year, total_quantity, remaining_quantity)
                 SELECT b.user_id, q.item_id, ?, (q.monthly_quantity * COALESCE(b.family_members, 1)), (q.monthly_quantity * COALESCE(b.family_members, 1))
                 FROM beneficiaries b JOIN category_quotas q ON q.category_id = b.category_id
                 WHERE b.user_id = ? AND q.category_id = ? AND q.item_id = ?
                 ON DUPLICATE KEY UPDATE
                   total_quantity = (q.monthly_quantity * COALESCE(b.family_members, 1)),
                   remaining_quantity = LEAST(remaining_quantity, (q.monthly_quantity * COALESCE(b.family_members, 1)))',
                [$monthYear, $beneficiaryId, (int) $beneficiary['category_id'], (int) $item['id']]
            );
            $entitlement = $this->one(
                'SELECT id, total_quantity, remaining_quantity FROM monthly_entitlements
                 WHERE beneficiary_user_id = ? AND item_id = ? AND month_year = ? FOR UPDATE',
                [$beneficiaryId, (int) $item['id'], $monthYear]
            );
            if (!$entitlement) throw new ApiException(404, 'Monthly quota is not configured.');
            if ($quantity > (float) $entitlement['remaining_quantity']) throw new ApiException(422, 'Insufficient quota. Available: ' . $entitlement['remaining_quantity']);

            $stock = $this->one(
                'SELECT id, allocated_quantity, distributed_quantity FROM shop_stock
                 WHERE shop_id = ? AND item_id = ? AND month_year = ? FOR UPDATE',
                [$shopId, (int) $item['id'], $monthYear]
            );
            if (!$stock) throw new ApiException(422, 'Item not available in shop stock.');
            $available = (float) $stock['allocated_quantity'] - (float) $stock['distributed_quantity'];
            if ($quantity > $available) throw new ApiException(422, 'Insufficient shop stock.');

            $remaining = (float) $entitlement['remaining_quantity'] - $quantity;
            $this->execute('UPDATE monthly_entitlements SET remaining_quantity = ? WHERE id = ?', [$remaining, (int) $entitlement['id']]);
            $this->execute('UPDATE shop_stock SET distributed_quantity = distributed_quantity + ? WHERE id = ?', [$quantity, (int) $stock['id']]);
            $distributionId = $this->insert(
                'INSERT INTO distributions (beneficiary_user_id, shop_id, issued_by_user_id, month_year) VALUES (?, ?, ?, ?)',
                [$beneficiaryId, $shopId, $actorId, $monthYear]
            );
            $this->insert(
                'INSERT INTO distribution_items (distribution_id, item_id, quantity, unit_price, quota_total, remaining_after) VALUES (?, ?, ?, ?, ?, ?)',
                [$distributionId, (int) $item['id'], $quantity, (float) $item['unit_price'], (float) $entitlement['total_quantity'], $remaining]
            );
            $this->movement($shopId, (int) $item['id'], $beneficiaryId, 'distributed', $quantity);
            return $remaining;
        });
    }

    public function stockHistory(int $shopId): array
    {
        return $this->all(
            "SELECT sm.id, i.item_name, i.unit, UPPER(sm.movement_type) AS action_type, sm.quantity,
                    u.name AS user_name, sm.created_at AS timestamp
             FROM stock_movements sm JOIN ration_items i ON i.id = sm.item_id
             LEFT JOIN users u ON u.id = sm.user_id WHERE sm.shop_id = ?
             ORDER BY sm.created_at DESC, sm.id DESC LIMIT 50",
            [$shopId]
        );
    }

    public function assignedStock(int $shopId, string $monthYear): array
    {
        return $this->all(
            "SELECT a.id, i.item_name, a.quantity, UPPER(a.status) AS status, a.month_year, a.created_at
             FROM stock_assignments a JOIN ration_items i ON i.id = a.item_id
             WHERE a.shop_id = ? AND a.month_year = ? AND a.status = 'pending' ORDER BY a.created_at DESC",
            [$shopId, $monthYear]
        );
    }

    public function bookings(int $shopId): array
    {
        return $this->all(
            'SELECT b.id, b.booking_date, b.time_slot, b.status, u.id AS beneficiary_id, u.name AS beneficiary_name
             FROM bookings b JOIN users u ON u.id = b.beneficiary_user_id WHERE b.shop_id = ?
             ORDER BY b.booking_date DESC, b.time_slot',
            [$shopId]
        );
    }

    public function updateBooking(int $shopId, int $bookingId, string $status): void
    {
        $booking = $this->one("SELECT id FROM bookings WHERE id = ? AND shop_id = ? AND status = 'booked'", [$bookingId, $shopId]);
        if (!$booking) throw new ApiException(404, 'Active booking not found for this shop.');
        $this->execute('UPDATE bookings SET status = ? WHERE id = ?', [$status, $bookingId]);
    }

    public function receiveStock(int $shopId, int $actorId, int $assignmentId): array
    {
        return $this->transaction(function () use ($shopId, $actorId, $assignmentId): array {
            $assignment = $this->one(
                "SELECT a.id, a.item_id, a.quantity, a.month_year, i.item_name, i.unit
                 FROM stock_assignments a JOIN ration_items i ON i.id = a.item_id
                 WHERE a.id = ? AND a.shop_id = ? AND a.status = 'pending' FOR UPDATE",
                [$assignmentId, $shopId]
            );
            if (!$assignment) throw new ApiException(404, 'Pending stock assignment not found.');
            $this->execute("UPDATE stock_assignments SET status = 'received', received_by_user_id = ?, received_at = CURRENT_TIMESTAMP WHERE id = ?", [$actorId, $assignmentId]);
            $this->execute(
                'INSERT INTO shop_stock (shop_id, item_id, month_year, allocated_quantity, distributed_quantity)
                 VALUES (?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE allocated_quantity = allocated_quantity + VALUES(allocated_quantity)',
                [$shopId, (int) $assignment['item_id'], $assignment['month_year'], (float) $assignment['quantity']]
            );
            $this->movement($shopId, (int) $assignment['item_id'], $actorId, 'added', (float) $assignment['quantity']);
            $inventory = $this->one(
                'SELECT ss.id, i.item_name AS item, ss.allocated_quantity AS allocated,
                        ss.distributed_quantity AS distributed,
                        GREATEST(ss.allocated_quantity - ss.distributed_quantity, 0) AS remaining
                 FROM shop_stock ss JOIN ration_items i ON i.id = ss.item_id
                 WHERE ss.shop_id = ? AND ss.item_id = ? AND ss.month_year = ?',
                [$shopId, (int) $assignment['item_id'], $assignment['month_year']]
            );
            return $inventory ?: [];
        });
    }

    private function movement(int $shopId, int $itemId, ?int $userId, string $type, float $quantity): void
    {
        $this->insert(
            'INSERT INTO stock_movements (shop_id, item_id, user_id, movement_type, quantity) VALUES (?, ?, ?, ?, ?)',
            [$shopId, $itemId, $userId, $type, $quantity]
        );
    }
}
