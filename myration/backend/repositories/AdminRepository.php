<?php
declare(strict_types=1);

namespace MyRation\Repositories;

use MyRation\Utils\ApiException;

final class AdminRepository extends AbstractRepository
{
    public function findById(int $id): ?array
    {
        return $this->one('SELECT id FROM users WHERE id = ?', [$id]);
    }

    public function dashboard(): array
    {
        $users = $this->one('SELECT COUNT(*) AS count FROM users');
        $pendingShops = $this->one("SELECT COUNT(*) AS count FROM shops WHERE approval_status = 'pending'");
        $complaints = $this->one("SELECT COUNT(*) AS count FROM complaints WHERE status = 'pending'");
        return ['totalUsers' => (int) $users['count'], 'pendingApprovals' => (int) $pendingShops['count'], 'openComplaints' => (int) $complaints['count']];
    }

    public function pending(): array
    {
        $users = [];
        $shops = $this->all(
            "SELECT s.id, u.username, u.name, u.mobile, u.aadhaar, s.shop_name, s.license_no,
                    s.capacity, s.state, s.district, s.taluk, s.village, s.pincode,
                    s.created_at, 'Shopkeeper' AS type
             FROM shops s JOIN users u ON u.id = s.owner_user_id WHERE s.approval_status = 'pending'"
        );
        $result = [];
        foreach ($users as $user) {
            $result[] = ['id' => (int) $user['id'], 'name' => $user['name'], 'type' => 'User',
                'details' => $user['card_type'] . ' Card — ' . $user['family_members'] . ' members',
                'date' => $user['created_at'], 'username' => $user['username'], 'mobile' => $user['mobile'],
                'aadhaar' => $user['aadhaar'], 'dob' => $user['dob'], 'gender' => $user['gender'],
                'ration_card_no' => $user['ration_card_no'], 'card_type' => $user['card_type'],
                'family_members' => $user['family_members'], 'ration_card_image' => $user['ration_card_image'],
                'state' => $user['state'], 'district' => $user['district'], 'taluk' => $user['taluk'],
                'village' => $user['village'], 'pincode' => $user['pincode'],
                'assigned_shop_id' => $user['assigned_shop_id'], 'assigned_shop_name' => $user['assigned_shop_name'],
                'assigned_shop_district' => $user['assigned_shop_district']];
        }
        foreach ($shops as $shop) {
            $result[] = ['id' => (int) $shop['id'], 'name' => $shop['name'], 'type' => 'Shopkeeper',
                'details' => $shop['shop_name'] . ' — License: ' . $shop['license_no'],
                'date' => $shop['created_at'], 'username' => $shop['username'], 'mobile' => $shop['mobile'],
                'aadhaar' => $shop['aadhaar'], 'shop_name' => $shop['shop_name'], 'license_no' => $shop['license_no'],
                'capacity' => $shop['capacity'], 'state' => $shop['state'], 'district' => $shop['district'],
                'taluk' => $shop['taluk'], 'village' => $shop['village'], 'pincode' => $shop['pincode']];
        }
        return $result;
    }

    public function approve(string $type, int $id, string $action): void
    {
        $this->transaction(function () use ($type, $id, $action): void {
            $status = $action === 'approve' ? 'approved' : 'rejected';
            if ($type === 'user') {
                throw new ApiException(422, 'Beneficiaries are verified by their assigned shopkeeper only.');
            }
            if ($type !== 'shopkeeper') throw new ApiException(422, 'Registration type must be user or shopkeeper.');
            $shop = $this->one("SELECT owner_user_id FROM shops WHERE id = ? AND approval_status = 'pending' FOR UPDATE", [$id]);
            if (!$shop) throw new ApiException(404, 'Pending shopkeeper registration was not found.');
            $this->execute('UPDATE shops SET approval_status = ? WHERE id = ?', [$status, $id]);
            $this->execute('UPDATE users SET approval_status = ? WHERE id = ?', [$status, (int) $shop['owner_user_id']]);
        });
    }

    public function quotaSettings(): array
    {
        $rows = $this->all(
            'SELECT c.code AS card_type, i.item_name, i.unit, q.monthly_quantity, q.unit_price
             FROM category_quotas q JOIN ration_categories c ON c.id = q.category_id JOIN ration_items i ON i.id = q.item_id
             ORDER BY c.code, i.item_name'
        );
        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row['card_type']][] = [
                'item' => $row['item_name'],
                'qty' => $this->quantityLabel((float) $row['monthly_quantity'], $row['unit']),
                'price' => '₹' . $this->number((float) $row['unit_price']) . '/' . $row['unit'],
            ];
        }
        return $grouped;
    }

    public function saveQuotas(string $cardType, array $items): void
    {
        $this->transaction(function () use ($cardType, $items): void {
            $category = $this->one('SELECT id FROM ration_categories WHERE code = ?', [$cardType]);
            if (!$category) throw new ApiException(422, 'Unknown ration category.');
            foreach ($items as $item) {
                $product = $this->one('SELECT id FROM ration_items WHERE item_name = ? AND is_active = 1', [(string) $item['item']]);
                if (!$product) {
                    $this->execute('INSERT INTO ration_items (item_name, unit) VALUES (?, ?)', [(string) $item['item'], 'kg']);
                    $productId = (int) $this->pdo->lastInsertId();
                } else {
                    $productId = (int) $product['id'];
                }
                $this->execute(
                    'INSERT INTO category_quotas (category_id, item_id, monthly_quantity, unit_price) VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE monthly_quantity = VALUES(monthly_quantity), unit_price = VALUES(unit_price)',
                    [(int) $category['id'], $productId, $item['quantity'], $item['price']]
                );
            }
        });
    }

    public function addItem(string $name, string $unit, float $quantity, float $price, float $initialStock): void
    {
        $this->transaction(function () use ($name, $unit, $quantity, $price, $initialStock): void {
            $this->execute('INSERT INTO ration_items (item_name, unit) VALUES (?, ?)', [$name, $unit]);
            $itemId = (int) $this->pdo->lastInsertId();
            $this->execute(
                'INSERT INTO category_quotas (category_id, item_id, monthly_quantity, unit_price)
                 SELECT id, ?, ?, ? FROM ration_categories',
                [$itemId, $quantity, $price]
            );
            if ($initialStock > 0) {
                $this->execute(
                    'INSERT INTO shop_stock (shop_id, item_id, month_year, allocated_quantity)
                     SELECT id, ?, ?, ? FROM shops WHERE approval_status = \'approved\'',
                    [$itemId, date('Y-m'), $initialStock]
                );
            }
        });
    }

    public function removeQuota(string $cardType, string $itemName): void
    {
        $this->execute(
            'DELETE q FROM category_quotas q JOIN ration_categories c ON c.id = q.category_id
             JOIN ration_items i ON i.id = q.item_id WHERE c.code = ? AND i.item_name = ?',
            [$cardType, $itemName]
        );
    }

    public function complaints(): array
    {
        return $this->all(
            'SELECT c.id, c.complaint_type, c.message, c.status, c.created_at, c.admin_response,
                    u.name AS user_name, s.shop_name, s.shop_name AS shop
             FROM complaints c JOIN users u ON u.id = c.beneficiary_user_id JOIN shops s ON s.id = c.shop_id
             ORDER BY c.created_at DESC'
        );
    }

    public function resolveComplaint(int $id, string $action, string $response, int $adminId, bool $warning): void
    {
        $this->transaction(function () use ($id, $action, $response, $adminId, $warning): void {
            $complaint = $this->one('SELECT shop_id FROM complaints WHERE id = ? FOR UPDATE', [$id]);
            if (!$complaint) throw new ApiException(404, 'Complaint not found.');
            $status = match ($action) {
                'resolve' => 'resolved', 'dismiss' => 'dismissed', 'warn' => 'warning_issued',
                default => throw new ApiException(422, 'Action must be resolve, dismiss, or warn.'),
            };
            $complaint = $this->one('SELECT beneficiary_user_id FROM complaints WHERE id = ? FOR UPDATE', [$id]);
            $this->execute('UPDATE complaints SET status = ?, admin_response = ?, resolved_by_user_id = ? WHERE id = ?', [$status, $response ?: null, $adminId, $id]);
            $statusText = str_replace('_', ' ', $status);
            $message = 'Your complaint #' . $id . ' has been updated: ' . $statusText . '.';
            if ($response !== '') {
                $message .= ' Admin response: ' . $response;
            }
            $this->execute(
                "INSERT INTO notifications (user_id, message, notification_type) VALUES (?, ?, 'info')",
                [(int) $complaint['beneficiary_user_id'], $message]
            );
            if ($warning || $action === 'warn') {
                $owner = $this->one('SELECT owner_user_id FROM shops WHERE id = ?', [(int) $complaint['shop_id']]);
                if ($owner) {
                    $this->execute(
                        "INSERT INTO notifications (user_id, message, notification_type) VALUES (?, ?, 'warning')",
                        [(int) $owner['owner_user_id'], 'Warning: A complaint has been filed against your shop. Please improve service quality.']
                    );
                }
            }
        });
    }

    public function users(?string $role = null): array
    {
        $sql = 'SELECT u.id, u.username, u.name, r.code AS role, u.approval_status AS status, u.created_at, c.code AS cardType
                FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN beneficiaries b ON b.user_id = u.id
                LEFT JOIN ration_categories c ON c.id = b.category_id';
        if ($role !== null) return $this->all($sql . ' WHERE r.code = ? ORDER BY u.created_at DESC', [$role]);
        return $this->all($sql . ' ORDER BY u.created_at DESC');
    }

    public function shops(): array
    {
        return $this->all(
            'SELECT s.id, s.shop_name, s.license_no, s.approval_status AS status, s.created_at, u.name AS owner_name
             FROM shops s JOIN users u ON u.id = s.owner_user_id WHERE s.approval_status = \'approved\' ORDER BY s.shop_name'
        );
    }

    public function assignBeneficiary(int $beneficiaryId, int $shopId): void
    {
        $this->transaction(function () use ($beneficiaryId, $shopId): void {
            if (!$this->one("SELECT id FROM shops WHERE id = ? AND approval_status = 'approved'", [$shopId])) {
                throw new ApiException(404, 'Approved ration shop not found.');
            }
            $beneficiary = $this->one('SELECT user_id FROM beneficiaries WHERE user_id = ? FOR UPDATE', [$beneficiaryId]);
            if (!$beneficiary) throw new ApiException(404, 'Beneficiary not found.');
            $this->execute('UPDATE beneficiaries SET assigned_shop_id = ?, verified_by_shopkeeper = 0, verified_by_admin = 0 WHERE user_id = ?', [$shopId, $beneficiaryId]);
            $this->execute("UPDATE users SET approval_status = 'pending' WHERE id = ?", [$beneficiaryId]);
        });
    }

    public function demandRows(int $shopId, string $currentMonth, string $previousMonth): array
    {
        return $this->all(
            'SELECT c.code AS card_type, i.id AS item_id, i.item_name, i.unit, q.monthly_quantity,
                    q.unit_price, SUM(CASE WHEN u.id IS NOT NULL THEN COALESCE(b.family_members, 1) ELSE 0 END) AS beneficiary_count
             FROM ration_categories c JOIN category_quotas q ON q.category_id = c.id
             JOIN ration_items i ON i.id = q.item_id
             LEFT JOIN beneficiaries b ON b.category_id = c.id AND b.assigned_shop_id = ? AND b.verified_by_shopkeeper = 1
             LEFT JOIN users u ON u.id = b.user_id AND u.approval_status = \'approved\'
             WHERE i.is_active = 1 GROUP BY c.id, c.code, i.id, i.item_name, i.unit, q.monthly_quantity, q.unit_price',
            [$shopId]
        );
    }

    public function stockForDemand(int $shopId, string $currentMonth, string $previousMonth): array
    {
        return $this->all(
            'SELECT i.item_name, ss.month_year, ss.allocated_quantity, ss.distributed_quantity
             FROM shop_stock ss JOIN ration_items i ON i.id = ss.item_id
             WHERE ss.shop_id = ? AND ss.month_year IN (?, ?)',
            [$shopId, $currentMonth, $previousMonth]
        );
    }

    public function allocate(int $shopId, array $items, int $adminId, string $monthYear): void
    {
        $this->transaction(function () use ($shopId, $items, $adminId, $monthYear): void {
            if (!$this->one('SELECT id FROM shops WHERE id = ?', [$shopId])) throw new ApiException(404, 'Shop not found.');
            foreach ($items as $item) {
                $rationItem = $this->one('SELECT id FROM ration_items WHERE item_name = ? AND is_active = 1', [$item['itemName']]);
                if (!$rationItem) throw new ApiException(422, 'Unknown ration item: ' . $item['itemName']);
                $this->execute(
                    "INSERT INTO stock_assignments (shop_id, item_id, quantity, month_year, status, created_by_user_id)
                     VALUES (?, ?, ?, ?, 'pending', ?)",
                    [$shopId, (int) $rationItem['id'], $item['quantity'], $monthYear, $adminId]
                );
            }
        });
    }

    public function stockOverview(): array
    {
        return $this->all(
            'SELECT ss.shop_id, s.shop_name, i.item_name, i.unit, ss.month_year,
                    ss.allocated_quantity, ss.distributed_quantity,
                    (ss.allocated_quantity - ss.distributed_quantity) AS remaining
             FROM shop_stock ss JOIN shops s ON s.id = ss.shop_id JOIN ration_items i ON i.id = ss.item_id
             ORDER BY ss.month_year DESC, s.shop_name, i.item_name'
        );
    }

    public function distributionHistory(int $limit, int $offset): array
    {
        return $this->all(
            'SELECT d.id, d.month_year, d.distributed_at, b.user_id AS beneficiary_id, bu.name AS beneficiary_name,
                    d.shop_id, s.shop_name, issuer.name AS issued_by, i.item_name, di.quantity, i.unit, di.unit_price
             FROM distributions d JOIN beneficiaries b ON b.user_id = d.beneficiary_user_id
             JOIN users bu ON bu.id = b.user_id JOIN shops s ON s.id = d.shop_id JOIN users issuer ON issuer.id = d.issued_by_user_id
             JOIN distribution_items di ON di.distribution_id = d.id JOIN ration_items i ON i.id = di.item_id
             ORDER BY d.distributed_at DESC LIMIT ? OFFSET ?',
            [$limit, $offset]
        );
    }

    public function bookings(): array
    {
        return $this->all(
            'SELECT b.id, b.booking_date, b.time_slot, b.status, u.id AS beneficiary_id, u.name AS beneficiary_name,
                    s.id AS shop_id, s.shop_name FROM bookings b JOIN users u ON u.id = b.beneficiary_user_id
             JOIN shops s ON s.id = b.shop_id ORDER BY b.booking_date DESC, b.time_slot'
        );
    }

    public function notifications(): array
    {
        return $this->all(
            'SELECT n.id, n.user_id, n.shop_id, n.target_role, n.message, n.notification_type, n.read_at, n.created_at,
                    u.name AS recipient_name, s.shop_name FROM notifications n
             LEFT JOIN users u ON u.id = n.user_id LEFT JOIN shops s ON s.id = n.shop_id ORDER BY n.created_at DESC LIMIT 200'
        );
    }

    public function createNotification(array $data): int
    {
        return $this->insert(
            'INSERT INTO notifications (user_id, shop_id, target_role, message, notification_type) VALUES (?, ?, ?, ?, ?)',
            [$data['user_id'] ?? null, $data['shop_id'] ?? null, $data['target_role'] ?? null, $data['message'], $data['notification_type']]
        );
    }

    public function deleteNotification(int $id): void
    {
        if ($this->execute('DELETE FROM notifications WHERE id = ?', [$id]) < 1) {
            throw new ApiException(404, 'Notification not found.');
        }
    }

    public function categories(): array
    {
        return $this->all('SELECT id, code, label FROM ration_categories ORDER BY code');
    }

    public function allItems(): array
    {
        return $this->all('SELECT id, item_name, unit, is_active FROM ration_items ORDER BY item_name');
    }

    public function shopComplaints(int $shopId): array
    {
        return $this->all(
            'SELECT c.id, c.complaint_type, c.message, c.status, c.admin_response, c.shopkeeper_response, c.created_at,
                    u.name AS beneficiary_name FROM complaints c JOIN users u ON u.id = c.beneficiary_user_id
             WHERE c.shop_id = ? ORDER BY c.created_at DESC',
            [$shopId]
        );
    }

    public function shopkeeperComplaintResponse(int $shopId, int $complaintId, int $userId, string $response): void
    {
        $this->transaction(function () use ($shopId, $complaintId, $userId, $response): void {
            $complaint = $this->one('SELECT beneficiary_user_id FROM complaints WHERE id = ? AND shop_id = ? FOR UPDATE', [$complaintId, $shopId]);
            if (!$complaint) throw new ApiException(404, 'Complaint not found for this shop.');
            $this->execute('UPDATE complaints SET shopkeeper_response = ?, shopkeeper_response_by_user_id = ? WHERE id = ? AND shop_id = ?', [$response, $userId, $complaintId, $shopId]);
            $this->execute(
                "INSERT INTO notifications (user_id, message, notification_type) VALUES (?, ?, 'info')",
                [(int) $complaint['beneficiary_user_id'], 'Your complaint #' . $complaintId . ' has a shopkeeper response: ' . $response]
            );
        });
    }

    private function quantityLabel(float $quantity, string $unit): string
    {
        return $this->number($quantity) . ' ' . $unit;
    }

    private function number(float $number): string
    {
        return rtrim(rtrim(number_format($number, 3, '.', ''), '0'), '.');
    }
}
