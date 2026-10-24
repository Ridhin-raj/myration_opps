<?php
declare(strict_types=1);

namespace MyRation\Config;

use MyRation\Utils\ApiException;

final class JWT
{
    public function issue(int $userId, string $role): string
    {
        $now = time();
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload = ['sub' => $userId, 'role' => $role, 'iat' => $now, 'exp' => $now + 86400];
        $unsigned = $this->encode($header) . '.' . $this->encode($payload);
        return $unsigned . '.' . $this->base64Url(hash_hmac('sha256', $unsigned, $this->secret(), true));
    }

    public function verify(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new ApiException(401, 'Invalid or expired token.');
        }
        [$headerPart, $payloadPart, $signature] = $parts;
        $header = json_decode($this->decode($headerPart), true);
        $payload = json_decode($this->decode($payloadPart), true);
        if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256' || !is_array($payload)) {
            throw new ApiException(401, 'Invalid or expired token.');
        }
        $expected = $this->base64Url(hash_hmac('sha256', $headerPart . '.' . $payloadPart, $this->secret(), true));
        if (!hash_equals($expected, $signature) || (int) ($payload['exp'] ?? 0) <= time() || empty($payload['sub']) || empty($payload['role'])) {
            throw new ApiException(401, 'Invalid or expired token.');
        }
        return ['id' => (int) $payload['sub'], 'role' => (string) $payload['role']];
    }

    private function secret(): string
    {
        $secret = (string) Config::get('JWT_SECRET', '');
        if (strlen($secret) < 32) {
            throw new \RuntimeException('Set JWT_SECRET to a random value of at least 32 characters.');
        }
        return $secret;
    }

    private function encode(array $value): string
    {
        return $this->base64Url((string) json_encode($value, JSON_UNESCAPED_SLASHES));
    }

    private function decode(string $value): string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw new ApiException(401, 'Invalid or expired token.');
        }
        return $decoded;
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
