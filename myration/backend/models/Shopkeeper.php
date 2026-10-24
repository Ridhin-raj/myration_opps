<?php
declare(strict_types=1);

namespace MyRation\Models;

final class Shopkeeper extends AbstractUser
{
    public function getRole(): string { return 'shopkeeper'; }
}
