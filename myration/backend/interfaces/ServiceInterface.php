<?php
declare(strict_types=1);

namespace MyRation\Interfaces;

interface ServiceInterface
{
    public function execute(string $operation, array $input = [], array $context = []): mixed;
}
