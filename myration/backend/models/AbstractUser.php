<?php
declare(strict_types=1);

namespace MyRation\Models;

use MyRation\Interfaces\UserInterface;

abstract class AbstractUser implements UserInterface
{
    public function __construct(private readonly int $id, private readonly string $name) {}
    final public function getId(): int { return $this->id; }
    final public function getName(): string { return $this->name; }
    abstract public function getRole(): string;
}
