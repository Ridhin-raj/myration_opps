<?php
declare(strict_types=1);

namespace MyRation\Repositories;

final class UserRepository extends AbstractRepository
{
    public function findById(int $id): ?array
    {
        return $this->one(
            'SELECT u.id, u.username, u.password_hash, u.name, u.mobile, u.aadhaar, u.approval_status AS status, r.code AS role
             FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?',
            [$id]
        );
    }

    public function findByUsername(string $username): ?array
    {
        return $this->one(
            'SELECT u.id, u.username, u.password_hash, u.name, u.mobile, u.aadhaar, u.approval_status AS status, r.code AS role
             FROM users u JOIN roles r ON r.id = u.role_id WHERE u.username = ? OR u.email = ?',
            [$username, $username]
        );
    }

    public function usernameExists(string $username): bool
    {
        return $this->one('SELECT id FROM users WHERE username = ?', [$username]) !== null;
    }

    public function aadhaarExists(string $aadhaar): bool
    {
        return $this->one('SELECT id FROM users WHERE aadhaar = ?', [$aadhaar]) !== null;
    }

    public function licenseExists(string $licenseNo): bool
    {
        return $this->one('SELECT id FROM shops WHERE license_no = ?', [$licenseNo]) !== null;
    }

    public function publicShops(): array
    {
        return $this->all(
            "SELECT id, shop_name AS name, village AS address, district, taluk
             FROM shops WHERE approval_status = 'approved' ORDER BY shop_name"
        );
    }

    public function hasApprovedShop(int $shopId): bool
    {
        return $this->one("SELECT id FROM shops WHERE id = ? AND approval_status = 'approved'", [$shopId]) !== null;
    }

    public function createBeneficiary(array $data, ?string $imagePath): int
    {
        return $this->transaction(function () use ($data, $imagePath): int {
            $userId = $this->insert(
                "INSERT INTO users (role_id, username, password_hash, name, mobile, aadhaar, approval_status)
                 SELECT id, ?, ?, ?, ?, ?, 'pending' FROM roles WHERE code = 'user'",
                [$data['username'], password_hash($data['password'], PASSWORD_DEFAULT), $data['name'], $data['mobile'], $data['aadhaar']]
            );
            $this->insert(
                'INSERT INTO beneficiaries (user_id, dob, gender, ration_card_no, category_id, family_members, ration_card_image,
                    state, district, taluk, village, pincode, assigned_shop_id)
                 SELECT ?, ?, ?, ?, id, ?, ?, ?, ?, ?, ?, ?, ? FROM ration_categories WHERE code = ?',
                [$userId, ($data['dob'] ?? '') ?: null, ($data['gender'] ?? '') ?: null, $data['rationCardNo'], (int) (($data['familyMembers'] ?? 1) ?: 1),
                    $imagePath, ($data['state'] ?? '') ?: null, ($data['district'] ?? '') ?: null, ($data['taluk'] ?? '') ?: null, ($data['village'] ?? '') ?: null,
                    ($data['pincode'] ?? '') ?: null, ($data['selectedShop'] ?? null) ?: null, $data['cardType']]
            );
            return $userId;
        });
    }

    public function createShopkeeper(array $data): int
    {
        return $this->transaction(function () use ($data): int {
            $userId = $this->insert(
                "INSERT INTO users (role_id, username, password_hash, name, mobile, aadhaar, approval_status)
                 SELECT id, ?, ?, ?, ?, ?, 'pending' FROM roles WHERE code = 'shopkeeper'",
                [$data['username'], password_hash($data['password'], PASSWORD_DEFAULT), $data['ownerName'], $data['mobile'], ($data['aadhaar'] ?? '') ?: null]
            );
            $this->insert(
                "INSERT INTO shops (owner_user_id, shop_name, license_no, capacity, state, district, taluk, village, pincode, approval_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
                [$userId, $data['shopName'], $data['licenseNo'], (int) (($data['capacity'] ?? 500) ?: 500), ($data['state'] ?? '') ?: null,
                    ($data['district'] ?? '') ?: null, ($data['taluk'] ?? '') ?: null, ($data['village'] ?? '') ?: null, ($data['pincode'] ?? '') ?: null]
            );
            return $userId;
        });
    }

    public function shopApproval(int $userId): ?string
    {
        $row = $this->one('SELECT approval_status FROM shops WHERE owner_user_id = ?', [$userId]);
        return $row['approval_status'] ?? null;
    }

    public function shopIdForOwner(int $userId): ?int
    {
        $row = $this->one('SELECT id FROM shops WHERE owner_user_id = ?', [$userId]);
        return isset($row['id']) ? (int) $row['id'] : null;
    }

    public function loginProfile(int $userId): ?array
    {
        return $this->one(
            'SELECT c.code AS card_type FROM beneficiaries b JOIN ration_categories c ON c.id = b.category_id WHERE b.user_id = ?',
            [$userId]
        );
    }
}
