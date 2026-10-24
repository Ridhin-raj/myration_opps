<?php
declare(strict_types=1);

namespace MyRation\Config;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = (string) Config::get('DB_HOST', '127.0.0.1');
        $port = (string) Config::get('DB_PORT', '3306');
        $name = (string) Config::get('DB_NAME', 'myration_php');
        $user = (string) Config::get('DB_USER', 'root');
        $password = (string) Config::get('DB_PASSWORD', '');
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        try {
            self::$connection = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $error) {
            error_log('MySQL connection failed: ' . $error->getMessage());
            throw new \RuntimeException('Database connection is unavailable.', 0, $error);
        }

        return self::$connection;
    }
}
