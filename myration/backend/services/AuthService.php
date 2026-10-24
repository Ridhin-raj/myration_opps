<?php
declare(strict_types=1);

namespace MyRation\Services;

use MyRation\Config\JWT;
use MyRation\Interfaces\ServiceInterface;
use MyRation\Models\UserFactory;
use MyRation\Repositories\UserRepository;
use MyRation\Utils\ApiException;
use MyRation\Utils\HttpResult;
use MyRation\Utils\Request;
use MyRation\Utils\Validator;

final class AuthService implements ServiceInterface
{
    public function __construct(private readonly UserRepository $users, private readonly JWT $jwt) {}

    public function execute(string $operation, array $input = [], array $context = []): mixed
    {
        return match ($operation) {
            'login' => $this->login($input),
            'register-beneficiary' => $this->registerBeneficiary($input, $context['files'] ?? []),
            'register-shopkeeper' => $this->registerShopkeeper($input),
            'username' => $this->checkUsername((string) ($context['username'] ?? '')),
            'aadhaar' => $this->checkAadhaar((string) ($context['aadhaar'] ?? '')),
            'license' => $this->checkLicense((string) ($context['licenseNo'] ?? '')),
            'shops' => $this->users->publicShops(),
            default => throw new ApiException(404, 'Authentication action not found.'),
        };
    }

    public function authenticate(array $claims): array
    {
        $user = $this->users->findById((int) ($claims['id'] ?? 0));
        if (!$user || $user['role'] !== ($claims['role'] ?? null)) {
            throw new ApiException(401, 'Invalid or expired token.');
        }
        if ($user['status'] !== 'approved') {
            throw new ApiException(403, 'Your account is not approved.');
        }
        if ($user['role'] === 'shopkeeper' && $this->users->shopApproval((int) $user['id']) !== 'approved') {
            throw new ApiException(403, 'Your shop registration is not approved.');
        }
        return [
            'id' => (int) $user['id'],
            'role' => $user['role'],
            'name' => $user['name'],
            'shop_id' => $user['role'] === 'shopkeeper' ? $this->users->shopIdForOwner((int) $user['id']) : null,
        ];
    }

    private function login(array $input): array
    {
        Validator::required($input, ['username', 'password']);
        $user = $this->users->findByUsername(trim((string) $input['username']));
        if (!$user || !password_verify((string) $input['password'], $user['password_hash'])) {
            throw new ApiException(401, 'Invalid username or password');
        }
        if ($user['status'] !== 'approved') {
            throw new ApiException(403, $user['status'] === 'rejected' ? 'Your account registration was rejected.' : 'Your account is not yet approved. Please wait for admin approval.');
        }
        if ($user['role'] === 'shopkeeper' && $this->users->shopApproval((int) $user['id']) !== 'approved') {
            throw new ApiException(403, 'Your shop registration is still pending admin approval.');
        }

        $domainUser = UserFactory::fromRow($user);
        $profile = $domainUser->getRole() === 'user' ? $this->users->loginProfile($domainUser->getId()) : null;
        return [
            'message' => 'Login successful',
            'token' => $this->jwt->issue($domainUser->getId(), $domainUser->getRole()),
            'user' => [
                'id' => $domainUser->getId(),
                'username' => $user['username'],
                'role' => $domainUser->getRole(),
                'name' => $domainUser->getName(),
                'cardType' => $profile['card_type'] ?? null,
            ],
        ];
    }

    private function registerBeneficiary(array $input, array $files): HttpResult
    {
        Validator::required($input, ['name', 'mobile', 'aadhaar', 'rationCardNo', 'cardType', 'password', 'username']);
        if (!Validator::phone((string) $input['mobile'])) throw new ApiException(422, 'Mobile number must contain 10 to 15 digits.');
        if (!Validator::aadhaar((string) $input['aadhaar'])) throw new ApiException(422, 'Aadhaar number must contain 12 digits.');
        $this->validateCredentials($input);
        $cardType = Validator::cardType($input['cardType']);
        $selectedShop = $input['selectedShop'] ?? null;
        if ($selectedShop !== null && $selectedShop !== '') {
            if (filter_var($selectedShop, FILTER_VALIDATE_INT) === false || !$this->users->hasApprovedShop((int) $selectedShop)) {
                throw new ApiException(422, 'Selected ration shop is not available.');
            }
            $selectedShop = (int) $selectedShop;
        } else {
            $selectedShop = null;
        }
        if (isset($input['familyMembers']) && (filter_var($input['familyMembers'], FILTER_VALIDATE_INT) === false || (int) $input['familyMembers'] < 1)) {
            throw new ApiException(422, 'Family members must be a positive whole number.');
        }
        if (!empty($input['pincode']) && !preg_match('/^[0-9]{6}$/', (string) $input['pincode'])) {
            throw new ApiException(422, 'Pincode must contain 6 digits.');
        }
        $imagePath = $this->storeRationCardImage($files['rationCardImage'] ?? null);
        $input['selectedShop'] = $selectedShop;
        $input['cardType'] = $cardType;
        $userId = $this->users->createBeneficiary($input, $imagePath);
        return new HttpResult(['message' => 'Registration submitted successfully. Pending shopkeeper verification.', 'userId' => $userId, 'username' => $input['username']], 201);
    }

    private function registerShopkeeper(array $input): HttpResult
    {
        Validator::required($input, ['ownerName', 'mobile', 'shopName', 'licenseNo', 'password', 'username']);
        if (!Validator::phone((string) $input['mobile'])) throw new ApiException(422, 'Mobile number must contain 10 to 15 digits.');
        if (!empty($input['aadhaar']) && !Validator::aadhaar((string) $input['aadhaar'])) throw new ApiException(422, 'Aadhaar number must contain 12 digits.');
        $this->validateCredentials($input);
        if (isset($input['capacity']) && (!is_numeric($input['capacity']) || (int) $input['capacity'] < 1)) {
            throw new ApiException(422, 'Shop capacity must be a positive whole number.');
        }
        $userId = $this->users->createShopkeeper($input);
        return new HttpResult(['message' => 'Shop registration submitted. Pending admin approval.', 'userId' => $userId, 'username' => $input['username']], 201);
    }

    private function validateCredentials(array $input): void
    {
        $username = (string) $input['username'];
        if (!preg_match('/^[A-Za-z0-9_.-]{3,50}$/', $username)) {
            throw new ApiException(422, 'Username must be 3 to 50 letters, numbers, dots, underscores, or hyphens.');
        }
        if (strlen((string) $input['password']) < 6 || strlen((string) $input['password']) > 72) {
            throw new ApiException(422, 'Password must be between 6 and 72 characters.');
        }
        if ($this->users->usernameExists($username)) {
            throw new ApiException(409, 'Username already taken. Please choose another one.');
        }
    }

    private function checkUsername(string $username): array
    {
        $username = trim($username);
        if (!preg_match('/^[A-Za-z0-9_.-]{3,50}$/', $username)) {
            return ['available' => false, 'message' => 'Enter a valid username (3-50 letters, numbers, dots, underscores, or hyphens).'];
        }
        $available = !$this->users->usernameExists($username);
        return ['available' => $available, 'message' => $available ? 'Username is available' : 'Username is already taken'];
    }

    private function checkAadhaar(string $aadhaar): array
    {
        if (!Validator::aadhaar($aadhaar)) return ['available' => false, 'message' => 'Aadhaar number must contain 12 digits.'];
        $available = !$this->users->aadhaarExists($aadhaar);
        return ['available' => $available, 'message' => $available ? 'Aadhaar number is available' : 'Aadhaar number is already registered'];
    }

    private function checkLicense(string $licenseNo): array
    {
        $licenseNo = trim($licenseNo);
        if ($licenseNo === '' || mb_strlen($licenseNo) > 60) return ['available' => false, 'message' => 'Enter a valid license number.'];
        $available = !$this->users->licenseExists($licenseNo);
        return ['available' => $available, 'message' => $available ? 'License number is available' : 'License number is already registered'];
    }

    private function storeRationCardImage(?array $file): ?string
    {
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || (int) $file['size'] > 5 * 1024 * 1024) {
            throw new ApiException(422, 'Ration card image must be smaller than 5 MB.');
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime])) throw new ApiException(422, 'Ration card image must be JPEG, PNG, or WebP.');
        $directory = dirname(__DIR__) . '/public/uploads';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException('Upload directory could not be created.');
        }
        $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
        if (!move_uploaded_file((string) $file['tmp_name'], $directory . '/' . $filename)) {
            throw new ApiException(422, 'Ration card image could not be saved.');
        }
        return $filename;
    }
}
