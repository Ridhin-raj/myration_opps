<?php
declare(strict_types=1);

namespace MyRation\Interfaces;

interface RepositoryInterface
{
    public function findById(int $id): ?array;
}
