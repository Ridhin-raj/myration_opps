<?php
declare(strict_types=1);

namespace MyRation\Config;

final class Config
{
    private static array $values = [];

    public static function get(string $key, mixed $default = null): mixed
    {
        if (self::$values === []) {
            self::load();
        }
        $value = getenv($key);
        return $value === false ? (self::$values[$key] ?? $default) : $value;
    }

    private static function load(): void
    {
        $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.php.env';
        if (!is_file($path)) {
            return;
        }
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if ($value !== '' && (($value[0] === '"' && str_ends_with($value, '"')) || ($value[0] === "'" && str_ends_with($value, "'")))) {
                $value = substr($value, 1, -1);
            }
            self::$values[$key] = $value;
        }
    }
}
