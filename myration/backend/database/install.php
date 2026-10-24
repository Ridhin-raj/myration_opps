<?php
declare(strict_types=1);

use MyRation\Config\Config;

require dirname(__DIR__) . '/bootstrap.php';

try {
    $host = (string) Config::get('DB_HOST', '127.0.0.1');
    $port = (string) Config::get('DB_PORT', '3306');
    $databaseName = (string) Config::get('DB_NAME', 'myration_php');
    $user = (string) Config::get('DB_USER', 'root');
    $password = (string) Config::get('DB_PASSWORD', '');
    if (!preg_match('/^[A-Za-z0-9_]+$/', $databaseName)) throw new RuntimeException('DB_NAME contains unsupported characters.');

    $pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $check = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?');
    $check->execute([$databaseName]);
    if ((int) $check->fetchColumn() > 0) {
        throw new RuntimeException("Database {$databaseName} already contains tables. Choose an empty database; no existing data was changed.");
    }

    foreach (['database.sql', 'seed.sql'] as $filename) {
        $sql = file_get_contents(__DIR__ . DIRECTORY_SEPARATOR . $filename);
        if ($sql === false) throw new RuntimeException("Could not read {$filename}.");
        $sql = preg_replace('/\bmyration_php\b/', $databaseName, $sql);
        foreach (explode(';', $sql) as $statement) {
            if (trim($statement) !== '') $pdo->exec($statement);
        }
        echo "Applied {$filename}.", PHP_EOL;
    }
    echo "Database {$databaseName} is ready. Demo users: admin1, shop1, user1.", PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Setup failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
