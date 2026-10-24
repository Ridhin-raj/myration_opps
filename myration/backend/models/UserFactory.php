<?php
declare(strict_types=1);

namespace MyRation\Models;

use MyRation\Interfaces\UserInterface;
use MyRation\Utils\ApiException;

final class UserFactory
{
    public static function fromRow(array $row): UserInterface
    {
        $id = (int) $row['id'];
        $name = (string) $row['name'];
        return match ((string) $row['role']) {
            'admin' => new Admin($id, $name),
            'shopkeeper' => new Shopkeeper($id, $name),
            'user' => new Beneficiary($id, $name),
            default => throw new ApiException(403, 'This account has an unsupported role.'),
        };
    }
}
