<?php
declare(strict_types=1);

namespace MyRation\Interfaces;

interface UserInterface
{
    public function getId(): int;
    public function getRole(): string;
    public function getName(): string;
}
