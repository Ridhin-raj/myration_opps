CREATE DATABASE IF NOT EXISTS myration_php CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myration_php;

CREATE TABLE IF NOT EXISTS roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    label VARCHAR(40) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ration_categories (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    label VARCHAR(60) NOT NULL,
    CHECK (code IN ('APL', 'BPL', 'AAY', 'PHH'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id TINYINT UNSIGNED NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(254) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    mobile VARCHAR(15) NULL,
    aadhaar CHAR(12) NULL UNIQUE,
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_users_role_status (role_id, approval_status),
    INDEX idx_users_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shops (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    shop_name VARCHAR(120) NOT NULL,
    license_no VARCHAR(60) NOT NULL UNIQUE,
    capacity INT UNSIGNED NOT NULL DEFAULT 500,
    state VARCHAR(60) NULL,
    district VARCHAR(80) NULL,
    taluk VARCHAR(80) NULL,
    village VARCHAR(100) NULL,
    pincode CHAR(6) NULL,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_shops_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (capacity > 0),
    INDEX idx_shops_status (approval_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS beneficiaries (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    dob DATE NULL,
    gender ENUM('Male', 'Female', 'Other') NULL,
    ration_card_no VARCHAR(50) NOT NULL UNIQUE,
    category_id TINYINT UNSIGNED NOT NULL,
    family_members SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    ration_card_image VARCHAR(255) NULL,
    state VARCHAR(60) NULL,
    district VARCHAR(80) NULL,
    taluk VARCHAR(80) NULL,
    village VARCHAR(100) NULL,
    pincode CHAR(6) NULL,
    assigned_shop_id BIGINT UNSIGNED NULL,
    verified_by_shopkeeper BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_beneficiaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_beneficiaries_category FOREIGN KEY (category_id) REFERENCES ration_categories(id),
    CONSTRAINT fk_beneficiaries_shop FOREIGN KEY (assigned_shop_id) REFERENCES shops(id) ON DELETE SET NULL,
    CHECK (family_members > 0),
    INDEX idx_beneficiaries_shop_verification (assigned_shop_id, verified_by_shopkeeper, verified_by_admin)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ration_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(80) NOT NULL UNIQUE,
    unit VARCHAR(12) NOT NULL DEFAULT 'kg',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS category_quotas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id TINYINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    monthly_quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotas_category FOREIGN KEY (category_id) REFERENCES ration_categories(id),
    CONSTRAINT fk_quotas_item FOREIGN KEY (item_id) REFERENCES ration_items(id),
    UNIQUE KEY uq_category_quota_item (category_id, item_id),
    CHECK (monthly_quantity >= 0),
    CHECK (unit_price >= 0),
    INDEX idx_quotas_item (item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shop_stock (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    month_year CHAR(7) NOT NULL,
    allocated_quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
    distributed_quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_item FOREIGN KEY (item_id) REFERENCES ration_items(id),
    UNIQUE KEY uq_shop_stock_period (shop_id, item_id, month_year),
    CHECK (allocated_quantity >= 0),
    CHECK (distributed_quantity >= 0 AND distributed_quantity <= allocated_quantity),
    INDEX idx_stock_period (month_year, shop_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_entitlements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    beneficiary_user_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    month_year CHAR(7) NOT NULL,
    total_quantity DECIMAL(10, 3) NOT NULL,
    remaining_quantity DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_entitlements_beneficiary FOREIGN KEY (beneficiary_user_id) REFERENCES beneficiaries(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_entitlements_item FOREIGN KEY (item_id) REFERENCES ration_items(id),
    UNIQUE KEY uq_beneficiary_entitlement_period (beneficiary_user_id, item_id, month_year),
    CHECK (total_quantity >= 0),
    CHECK (remaining_quantity >= 0 AND remaining_quantity <= total_quantity),
    INDEX idx_entitlements_period (month_year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS distributions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    beneficiary_user_id BIGINT UNSIGNED NOT NULL,
    shop_id BIGINT UNSIGNED NOT NULL,
    issued_by_user_id BIGINT UNSIGNED NOT NULL,
    month_year CHAR(7) NOT NULL,
    distributed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_distributions_beneficiary FOREIGN KEY (beneficiary_user_id) REFERENCES beneficiaries(user_id),
    CONSTRAINT fk_distributions_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
    CONSTRAINT fk_distributions_issuer FOREIGN KEY (issued_by_user_id) REFERENCES users(id),
    INDEX idx_distributions_beneficiary_time (beneficiary_user_id, distributed_at),
    INDEX idx_distributions_shop_time (shop_id, distributed_at),
    INDEX idx_distributions_period (month_year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS distribution_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    distribution_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quota_total DECIMAL(10, 3) NOT NULL,
    remaining_after DECIMAL(10, 3) NOT NULL,
    CONSTRAINT fk_distribution_items_distribution FOREIGN KEY (distribution_id) REFERENCES distributions(id) ON DELETE CASCADE,
    CONSTRAINT fk_distribution_items_item FOREIGN KEY (item_id) REFERENCES ration_items(id),
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (quota_total >= 0 AND remaining_after >= 0 AND remaining_after <= quota_total),
    INDEX idx_distribution_items_item (item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    beneficiary_user_id BIGINT UNSIGNED NOT NULL,
    shop_id BIGINT UNSIGNED NOT NULL,
    booking_date DATE NOT NULL,
    time_slot VARCHAR(40) NOT NULL,
    status ENUM('booked', 'completed', 'cancelled') NOT NULL DEFAULT 'booked',
    active_booking_date DATE GENERATED ALWAYS AS (CASE WHEN status = 'booked' THEN booking_date ELSE NULL END) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_beneficiary FOREIGN KEY (beneficiary_user_id) REFERENCES beneficiaries(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
    UNIQUE KEY uq_active_beneficiary_day (beneficiary_user_id, active_booking_date),
    INDEX idx_bookings_shop_date (shop_id, booking_date, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    beneficiary_user_id BIGINT UNSIGNED NOT NULL,
    shop_id BIGINT UNSIGNED NOT NULL,
    complaint_type VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'resolved', 'warning_issued', 'dismissed') NOT NULL DEFAULT 'pending',
    admin_response TEXT NULL,
    shopkeeper_response TEXT NULL,
    resolved_by_user_id BIGINT UNSIGNED NULL,
    shopkeeper_response_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaints_beneficiary FOREIGN KEY (beneficiary_user_id) REFERENCES beneficiaries(user_id),
    CONSTRAINT fk_complaints_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
    CONSTRAINT fk_complaints_resolver FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_complaints_shopkeeper_responder FOREIGN KEY (shopkeeper_response_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_complaints_status_time (status, created_at),
    INDEX idx_complaints_beneficiary (beneficiary_user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    shop_id BIGINT UNSIGNED NULL,
    target_role VARCHAR(20) NULL,
    message VARCHAR(500) NOT NULL,
    notification_type ENUM('info', 'success', 'warning') NOT NULL DEFAULT 'info',
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_read (user_id, read_at, created_at),
    INDEX idx_notifications_shop_time (shop_id, created_at),
    INDEX idx_notifications_role_time (target_role, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL,
    month_year CHAR(7) NOT NULL,
    status ENUM('pending', 'received', 'cancelled') NOT NULL DEFAULT 'pending',
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMP NULL,
    CONSTRAINT fk_assignments_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_item FOREIGN KEY (item_id) REFERENCES ration_items(id),
    CONSTRAINT fk_assignments_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_assignments_receiver FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (quantity > 0),
    INDEX idx_assignments_shop_period (shop_id, month_year, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    movement_type ENUM('added', 'distributed', 'adjusted') NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movements_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_movements_item FOREIGN KEY (item_id) REFERENCES ration_items(id),
    CONSTRAINT fk_movements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (quantity > 0),
    INDEX idx_movements_shop_time (shop_id, created_at)
) ENGINE=InnoDB;
