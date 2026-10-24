<?php
declare(strict_types=1);

namespace MyRation\Utils;

final class HttpResult
{
    public function __construct(public readonly mixed $data, public readonly int $status = 200) {}
}
