USE myration_php;

INSERT IGNORE INTO roles (code, label) VALUES
('admin', 'Administrator'),
('shopkeeper', 'Shopkeeper'),
('user', 'Beneficiary');

INSERT IGNORE INTO ration_categories (code, label) VALUES
('APL', 'Above Poverty Line'),
('BPL', 'Below Poverty Line'),
('AAY', 'Antyodaya Anna Yojana'),
('PHH', 'Priority Household');

INSERT IGNORE INTO ration_items (item_name, unit) VALUES
('Rice', 'kg'),
('Wheat', 'kg'),
('Sugar', 'kg'),
('Kerosene', 'L'),
('Dal', 'kg');

INSERT IGNORE INTO users (role_id, username, password_hash, name, mobile, approval_status)
SELECT id, 'admin1', '$2y$10$ZuQ3rdzq53Z815GI88RgVuXmXitd9rEd5oPwIxJWa8NyNqqU9RDxy', 'Anita Sharma', '9999900000', 'approved'
FROM roles WHERE code = 'admin';

INSERT IGNORE INTO users (role_id, username, password_hash, name, mobile, aadhaar, approval_status)
SELECT id, 'shop1', '$2y$10$qpWE6fBYjkZmkSsTcqd4L.oN6y5PaQ5KuV7nlLSW.v/FbLT6B9lja', 'Ramesh Kumar', '9876543210', '123456789012', 'approved'
FROM roles WHERE code = 'shopkeeper';

INSERT IGNORE INTO users (role_id, username, password_hash, name, mobile, aadhaar, approval_status)
SELECT id, 'user1', '$2y$10$dWIKnA85fWRi5Q4Ic7Vbze.e7j6BCxVmu1I.r5TjEgvnLd2/O3/HW', 'Venkatesh Rao', '9876543211', '987654321098', 'approved'
FROM roles WHERE code = 'user';

INSERT IGNORE INTO shops (owner_user_id, shop_name, license_no, capacity, state, district, taluk, village, pincode, is_open, approval_status)
SELECT u.id, 'Janata Fair Price Shop', 'LIC-2024-001', 500, 'Karnataka', 'Bengaluru Urban', 'Bengaluru North', 'MG Road', '560001', TRUE, 'approved'
FROM users u WHERE u.username = 'shop1';

INSERT IGNORE INTO beneficiaries (user_id, dob, gender, ration_card_no, category_id, family_members, state, district, taluk, village, pincode, assigned_shop_id, verified_by_shopkeeper, verified_by_admin)
SELECT u.id, '1990-05-15', 'Male', 'RC-KA-2024-00145', c.id, 4, 'Karnataka', 'Bengaluru Urban', 'Bengaluru North', 'MG Road', '560001', s.id, TRUE, TRUE
FROM users u
JOIN ration_categories c ON c.code = 'BPL'
JOIN shops s ON s.license_no = 'LIC-2024-001'
WHERE u.username = 'user1';

INSERT INTO category_quotas (category_id, item_id, monthly_quantity, unit_price)
SELECT c.id, i.id, q.quantity, q.price
FROM (
    SELECT 'APL' AS category_code, 'Rice' AS item_name, 5.000 AS quantity, 15.00 AS price UNION ALL
    SELECT 'APL', 'Wheat', 5.000, 10.00 UNION ALL SELECT 'APL', 'Sugar', 1.000, 13.00 UNION ALL SELECT 'APL', 'Kerosene', 3.000, 20.00 UNION ALL
    SELECT 'BPL', 'Rice', 10.000, 3.00 UNION ALL SELECT 'BPL', 'Wheat', 10.000, 2.00 UNION ALL SELECT 'BPL', 'Sugar', 1.000, 13.00 UNION ALL SELECT 'BPL', 'Kerosene', 5.000, 15.00 UNION ALL SELECT 'BPL', 'Dal', 1.000, 15.00 UNION ALL
    SELECT 'AAY', 'Rice', 15.000, 2.00 UNION ALL SELECT 'AAY', 'Wheat', 20.000, 1.00 UNION ALL SELECT 'AAY', 'Sugar', 1.000, 13.00 UNION ALL SELECT 'AAY', 'Kerosene', 5.000, 15.00 UNION ALL SELECT 'AAY', 'Dal', 2.000, 10.00 UNION ALL
    SELECT 'PHH', 'Rice', 5.000, 1.00 UNION ALL SELECT 'PHH', 'Wheat', 5.000, 2.00 UNION ALL SELECT 'PHH', 'Sugar', 1.000, 13.00 UNION ALL SELECT 'PHH', 'Kerosene', 4.000, 15.00
) AS q
JOIN ration_categories c ON c.code = q.category_code
JOIN ration_items i ON i.item_name = q.item_name
ON DUPLICATE KEY UPDATE monthly_quantity = VALUES(monthly_quantity), unit_price = VALUES(unit_price);

INSERT IGNORE INTO shop_stock (shop_id, item_id, month_year, allocated_quantity, distributed_quantity)
SELECT s.id, i.id, DATE_FORMAT(CURRENT_DATE(), '%Y-%m'), stock.allocated, stock.distributed
FROM (
    SELECT 'Rice' AS item_name, 500.000 AS allocated, 320.000 AS distributed UNION ALL
    SELECT 'Wheat', 300.000, 200.000 UNION ALL SELECT 'Sugar', 100.000, 65.000 UNION ALL
    SELECT 'Kerosene', 200.000, 140.000 UNION ALL SELECT 'Dal', 80.000, 30.000
) AS stock
JOIN ration_items i ON i.item_name = stock.item_name
JOIN shops s ON s.license_no = 'LIC-2024-001';
