<?php
declare(strict_types=1);

namespace MyRation\Models;

final class Admin extends AbstractUser
{
    public function getRole(): string { return 'admin'; }
}
