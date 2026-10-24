<?php
declare(strict_types=1);

namespace MyRation\Utils;

final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    public static function error(string $message, int $status): never
    {
        self::json(['success' => false, 'message' => $message], $status);
    }
}
