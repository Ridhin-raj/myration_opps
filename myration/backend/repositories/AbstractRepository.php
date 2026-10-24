<?php
declare(strict_types=1);

namespace MyRation\Repositories;

use PDO;
use MyRation\Interfaces\RepositoryInterface;

abstract class AbstractRepository implements RepositoryInterface
{
    public function __construct(protected readonly PDO $pdo) {}

    protected function all(string $sql, array $params = []): array
    {
        $statement = $this->prepare($sql, $params);
        return $statement->fetchAll();
    }

    protected function one(string $sql, array $params = []): ?array
    {
        $statement = $this->prepare($sql, $params);
        $row = $statement->fetch();
        return $row === false ? null : $row;
    }

    protected function execute(string $sql, array $params = []): int
    {
        return $this->prepare($sql, $params)->rowCount();
    }

    protected function insert(string $sql, array $params = []): int
    {
        $this->prepare($sql, $params);
        return (int) $this->pdo->lastInsertId();
    }

    protected function transaction(callable $operation): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $operation();
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }

    private function prepare(string $sql, array $params): \PDOStatement
    {
        $statement = $this->pdo->prepare($sql);
        foreach (array_values($params) as $index => $value) {
            $type = match (true) {
                is_int($value) => PDO::PARAM_INT,
                is_bool($value) => PDO::PARAM_BOOL,
                $value === null => PDO::PARAM_NULL,
                default => PDO::PARAM_STR,
            };
            $statement->bindValue($index + 1, $value, $type);
        }
        $statement->execute();
        return $statement;
    }
}
