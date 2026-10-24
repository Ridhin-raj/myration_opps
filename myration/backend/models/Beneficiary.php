<?php
declare(strict_types=1);

namespace MyRation\Models;

final class Beneficiary extends AbstractUser
{
    public function getRole(): string { return 'user'; }
}
