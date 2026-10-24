<?php
declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'MyRation\\';
    if (!str_starts_with($class, $prefix)) return;
    $relative = substr($class, strlen($prefix));
    $parts = explode('\\', $relative);
    $file = array_pop($parts);
    $path = __DIR__;
    foreach ($parts as $part) $path .= DIRECTORY_SEPARATOR . strtolower($part);
    $path .= DIRECTORY_SEPARATOR . $file . '.php';
    if (is_file($path)) require $path;
});

set_exception_handler([MyRation\Utils\ExceptionHandler::class, 'handle']);
