<?php
declare(strict_types=1);

namespace MyRation\Utils;

final class Validator
{
    public static function required(array $input, array $fields): void
    {
        foreach ($fields as $field) {
            if (!isset($input[$field]) || (is_string($input[$field]) && trim($input[$field]) === '')) {
                throw new ApiException(422, ucfirst(str_replace('_', ' ', $field)) . ' is required.');
            }
        }
    }

    public static function phone(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[0-9]{10,15}$/', $value) === 1;
    }

    public static function aadhaar(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[0-9]{12}$/', $value) === 1;
    }

    public static function positiveNumber(mixed $value, string $field): float
    {
        if (!is_numeric($value) || (float) $value <= 0 || !is_finite((float) $value)) {
            throw new ApiException(422, $field . ' must be a number greater than zero.');
        }
        return (float) $value;
    }

    public static function boundedText(mixed $value, string $field, int $maxLength): string
    {
        if (!is_string($value) || trim($value) === '' || mb_strlen(trim($value)) > $maxLength) {
            throw new ApiException(422, $field . ' is invalid.');
        }
        return trim($value);
    }

    public static function cardType(mixed $value): string
    {
        $cardType = strtoupper((string) $value);
        if (!in_array($cardType, ['APL', 'BPL', 'AAY', 'PHH'], true)) {
            throw new ApiException(422, 'Card type must be APL, BPL, AAY, or PHH.');
        }
        return $cardType;
    }

    public static function date(mixed $value, string $field = 'Date'): string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            throw new ApiException(422, $field . ' must use YYYY-MM-DD format.');
        }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) throw new ApiException(422, $field . ' is not a valid calendar date.');
        return $value;
    }
}
