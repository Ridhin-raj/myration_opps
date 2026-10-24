<?php
declare(strict_types=1);

namespace MyRation\Utils;

use PDOException;
use Throwable;

final class ExceptionHandler
{
    public static function handle(Throwable $error): never
    {
        if ($error instanceof ApiException) {
            Response::error($error->getMessage(), $error->status);
        }
        if ($error instanceof PDOException && $error->getCode() === '23000') {
            Response::error('A record with one of these details already exists.', 409);
        }
        error_log((string) $error);
        Response::error('An unexpected server error occurred.', 500);
    }
}
