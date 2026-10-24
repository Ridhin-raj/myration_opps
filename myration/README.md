# MyRation: Smart Ration Shop Management System

MyRation keeps the existing React 18/Vite frontend and replaces the Express backend with a pure PHP 8+ OOP REST API. PHP uses PDO prepared statements, JWT authentication and MySQL. The three roles are admin, shopkeeper and beneficiary.

## Requirements

- PHP 8.0+ with `pdo_mysql`, `openssl`, `fileinfo` and `mbstring` enabled
- MySQL 8.0.16+ (the schema uses enforced `CHECK` constraints and generated columns)
- Node.js 18+ and npm for the existing React/Vite frontend

## Setup

1. Start MySQL (for example, from XAMPP).
2. From the project root, create the PHP-specific configuration file:

   ```powershell
   Copy-Item backend/.env.example backend/.php.env
   ```

   Edit `backend/.php.env` with your MySQL connection values. Set `DB_NAME=myration_php` and replace `JWT_SECRET` with a random secret of at least 32 characters. PHP reads `.php.env`, so a legacy Node `.env` is left untouched.
3. Install the new schema and demo data:

   ```powershell
   php backend/database/install.php
   ```

   The installer refuses to use a database that already contains tables. It does not delete or modify the former Express database. The SQL is also available separately as `backend/database/database.sql` and `backend/database/seed.sql`.
4. Start the PHP API from the project root:

   ```powershell
   php -d upload_max_filesize=6M -d post_max_size=7M -S localhost:5000 -t backend/public backend/public/index.php
   ```
5. In another terminal, start React:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The frontend already targets `http://localhost:5000/api`, so no React page or endpoint change is required. For another API host, set `VITE_API_URL` in the frontend environment (include `/api`). Uploaded ration-card images are served from `backend/public/uploads`.

## Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin1` | `admin123` |
| Shopkeeper | `shop1` | `shop123` |
| Beneficiary | `user1` | `user123` |

Demo credentials are for local demonstration only. Change them before deployment.

## Architecture

```text
React / Vite
  -> JSON or multipart REST requests with Bearer JWT
PHP front controller and routes
  -> middleware -> controllers -> domain services -> PDO repositories
MySQL
```

SQL is isolated in repositories, input/business rules live in services, and controllers handle only HTTP requests. Ration collection and shipment receipt use transactions. Details and diagrams are in [OOP_DESIGN.md](OOP_DESIGN.md) and [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

## Documentation

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md): methods, paths, payloads, responses and authorization
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md): normalized schema, relationships and distribution transaction
- [OOP_DESIGN.md](OOP_DESIGN.md): PHP layers and OOP concepts
- [MIGRATION.md](MIGRATION.md): actual existing feature/API/schema analysis and old-to-new mapping

## Validation

Run syntax checks for all PHP files:

```powershell
Get-ChildItem backend -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName }
```

Build the unchanged React frontend:

```powershell
cd frontend
npm run build
```
