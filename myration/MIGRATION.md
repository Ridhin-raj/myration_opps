# MyRation Backend Migration

## A. Current project analysis

The repository contains a React 18/Vite client and a Node.js/Express API backed by MySQL. React routes are declared in `frontend/src/App.jsx`; page-level workflows are in `frontend/src/pages`; every network request is centralized in `frontend/src/data/api.js`. The API helper stores a JWT in `localStorage`, sends it as `Authorization: Bearer ...`, sends JSON except beneficiary registration (multipart FormData), expects JSON, and surfaces the response `message` when a request fails.

The Express server mounts public `/api/auth`, then JWT- and role-protected `/api/user`, `/api/shopkeeper`, and `/api/admin`. Auth uses bcrypt, JWT HS256 with a 24-hour expiry, and checks user and shop approval on login. SQL is currently in route handlers using the mysql2 pool; there are no distinct controllers, services, or repositories. `backend/schema.sql` is older/incomplete: the runtime setup additionally creates `user_balances`, `quota_history`, `stock_history`, and `assigned_stock`, and monthly stock needs `month_year`. The demo seed in `schema.sql` includes hand-written hashes that should not be relied on; `setup.js` hashes its seed credentials at setup time.

### Existing React pages and browser routes

| Browser path | Page | Purpose |
| --- | --- | --- |
| `/` | `Home.jsx` | Entry and links to login/registration |
| `/login` | `Login.jsx` | Role-aware username/password login |
| `/register/user` | `UserRegister.jsx` | Beneficiary registration including ration-card image and shop choice |
| `/register/shopkeeper` | `ShopkeeperRegister.jsx` | Shopkeeper and shop registration |
| `/dashboard/user` | `UserDashboard.jsx` | Beneficiary profile, quota, shop stock, history, bookings, complaints and alerts |
| `/dashboard/shopkeeper` | `ShopkeeperDashboard.jsx` | Beneficiary verification, distribution, stock, shipments, shop status |
| `/dashboard/admin` | `AdminDashboard.jsx` | Approvals, users, shops, quotas, demand/allocation and complaints |

The UI is not being redesigned or rewritten. The only anticipated frontend edit is environment-based API URL documentation/configuration; the current helper already has `VITE_API_URL` and defaults to `http://localhost:5000/api`.

## B. Existing functionality and route-to-data flow

| Existing capability | Existing route flow | Current data |
| --- | --- | --- |
| Login and role/approval checks | `POST /auth/login` -> Express auth handler -> users, shops, user_profiles | `users`, `shops`, `user_profiles`; bcrypt + JWT |
| Beneficiary registration, card image, public shop list, username check | `POST /auth/register/user`, `GET /auth/shops`, `GET /auth/check-username/:username` | users, user_profiles, shops, uploads directory |
| Shopkeeper registration | `POST /auth/register/shopkeeper` | users, shops |
| Beneficiary profile, monthly quota, history, shop and stock | `GET /user/profile`, `/quota`, `/history`, `/quota-history`, `/shop`, `/shop/:id/stock` | user_profiles, quota, user_balances, ration_history, quota_history, shops, stock |
| Beneficiary bookings, complaint filing and alerts | `POST /user/book-slot`, `GET /user/slots`, `POST /user/complaint`, `GET /user/alerts` | slot_bookings, complaints, alerts |
| Shopkeeper overview and beneficiary verification | `GET /shopkeeper/dashboard`, `/pending`, `/verified`; `POST /shopkeeper/verify/:id` | shops, users, user_profiles, stock |
| Shopkeeper stock, manual stock sales, shop opening, ration collection | `GET /shopkeeper/stock`; `PUT /shopkeeper/stock/:id`, `/stock/:id/sell`, `/shop-status`; legacy `POST /sell-stock`; `GET /beneficiary-quota/:userId`; `POST /collect-ration` | stock, user_balances, quota_history, stock_history, ration_history, alerts |
| Shopkeeper shipment management and inventory audit | `GET /shopkeeper/stock-history`, `/assigned-stock`; `POST /shopkeeper/receive-stock` | stock_history, assigned_stock, stock |
| Admin dashboard, approvals, user/shop list, quota configuration | `GET /admin/dashboard`, `/pending`, `/users`, `/shops`, `/quota`; `POST /admin/approve/:id`; `PUT /admin/quota`; `POST /admin/quota/new-item`; `DELETE /admin/quota/:cardType/:itemName` | users, shops, user_profiles, quota, stock |
| Admin complaint review and demand-based supply | `GET /admin/complaints`; `PUT /admin/complaints/:id`; `GET /admin/shops/:id/demand`; `POST /admin/shops/:id/allocate`; `POST /admin/monthly-reset` | complaints, alerts, shops, user_profiles, quota, stock, assigned_stock |

All current API paths and methods are preserved. Existing response shapes are also retained where consumed by React: most list endpoints return arrays, login returns `{message, token, user}`, and the quota/history/dashboard endpoints retain their existing object shapes. Errors remain JSON with a `message`, which the existing client reads.

## C. Complete existing API list

### Public/authentication

| Method | Path | Current request/response contract |
| --- | --- | --- |
| POST | `/api/auth/login` | `{username,password}` -> `{message,token,user}` |
| POST | `/api/auth/register/user` | multipart form fields plus optional `rationCardImage` -> message and user ID |
| POST | `/api/auth/register/shopkeeper` | JSON shop and owner fields -> message |
| GET | `/api/auth/check-username/:username` | -> `{available,message}` |
| GET | `/api/auth/shops` | -> approved shop array |
| GET | `/api/health` | -> API status |

### Beneficiary (`role=user`)

`GET /api/user/profile`, `GET /api/user/quota`, `GET /api/user/history`, `GET /api/user/quota-history?page=&limit=`, `GET /api/user/shop`, `GET /api/user/shop/:id/stock`, `POST /api/user/book-slot` with `{date,time}`, `GET /api/user/slots`, `POST /api/user/complaint` with `{type,message,shopId?}`, and `GET /api/user/alerts`.

### Shopkeeper (`role=shopkeeper`)

`GET /api/shopkeeper/dashboard`, `/pending`, `/verified`, `/stock`, `/stock-history`, `/assigned-stock`; `POST /api/shopkeeper/verify/:id` with `{action}`; `PUT /api/shopkeeper/stock/:id` with `{quantity}`; `PUT /api/shopkeeper/stock/:id/sell` with `{quantity}`; legacy `POST /api/shopkeeper/sell-stock` with `{stockId,quantity}`; `PUT /api/shopkeeper/shop-status` with `{is_open}`; `GET /api/shopkeeper/beneficiary-quota/:userId`; `POST /api/shopkeeper/collect-ration` with `{userId,itemName,amount}`; and `POST /api/shopkeeper/receive-stock` with `{assignmentId}`.

### Admin (`role=admin`)

`GET /api/admin/dashboard`, `/pending`, `/quota`, `/complaints`, `/users`, `/shops`; `POST /api/admin/approve/:id` with `{type,action}`; `PUT /api/admin/quota` with `{card_type,items}`; `POST /api/admin/quota/new-item`; `DELETE /api/admin/quota/:cardType/:itemName`; `PUT /api/admin/complaints/:id` with `{action,warning?}`; `GET /api/admin/shops/:id/demand`; `POST /api/admin/shops/:id/allocate` with `{items}`; and `POST /api/admin/monthly-reset`.

## D. Existing database analysis

`backend/schema.sql` defines `users`, `shops`, `user_profiles`, `stock`, `quota`, `ration_history`, `slot_bookings`, `complaints`, and `alerts`. `backend/setup.js` adds the runtime tables `user_balances`, `quota_history`, `stock_history`, and `assigned_stock`, and its stock definition has a monthly uniqueness key. User identity, login role and approval state share one table; card category/quota rules are text-valued (quantity and price include units/currency); stock/quota identify products by name; history repeats item labels; and setup inserts shop/profile seeds by assumed numeric IDs. Several important constraints are absent (unique ration-card/license values, one profile per user, one owner/shop, booking collision constraints, positive quantities, required foreign keys and suitable indexes). The new schema normalizes roles, categories, items, units, quotas, inventory, shipment allocation, distribution headers/lines, monthly balances, booking slots, complaints, notifications, and audit records; durable records use IDs and numeric quantities/prices with explicit units.

## E. Proposed PHP OOP architecture

A PHP 8+ front controller serves `/api/*` and delegates route matching to `routes/api.php`. Controllers handle HTTP input/output only; services validate and apply business rules; repositories own prepared PDO queries; `config/Database.php` owns the shared PDO connection. `AuthMiddleware` validates HS256 JWTs and `RoleMiddleware` enforces role and approval state. `Response`, `Validator`, and a centralized exception handler standardize JSON and status codes. Models represent domain concepts and use an abstract person/user base plus role-specific classes where behavior differs. Interfaces are used for repository/service contracts and injected into concrete services/controllers to demonstrate useful abstraction and polymorphism without a framework.

Ration collection is one database transaction: lock and verify an approved beneficiary assigned to the shop; create or lock the active monthly quota balance; verify remaining entitlement and stock; write distribution and item rows; decrement quota and increment distributed stock; write audit/history rows; commit, or roll back on any failure.

## F. Old-to-new API mapping

All paths in section C map one-to-one to the PHP front controller. Resource boundaries map to PHP controller/service/repository groups: `/auth/*` -> AuthController/AuthService/UserRepository; `/user/*` -> BeneficiaryController/BeneficiaryService and booking/complaint/notification services; `/shopkeeper/*` -> ShopkeeperController/ShopkeeperService, StockService and DistributionService; `/admin/*` -> AdminController/AdminService, quota/stock/complaint services. Method, path, JSON field names, multipart registration behavior, bearer-token use, and frontend-facing response shapes stay compatible. The only operational change is that PHP replaces the Express process at the API base URL; configure `VITE_API_URL` to the PHP host's `/api` URL when it differs from the default.

The existing UI has no calls for profile editing, a beneficiary complaint-status list, or notification read-state updates; these are additional secured PHP capabilities rather than replacements for an existing call. React changes are not needed for those endpoints.

## G. Migration plan

1. Record and preserve existing route and payload contracts (this analysis).
2. Install the normalized MySQL schema and deterministic demo seed SQL.
3. Add PHP config, database, utilities, domain interfaces/models, repositories, services, middleware, controllers, and route dispatcher.
4. Implement JWT/password auth and multipart upload compatibility.
5. Port public/auth, beneficiary, shopkeeper, admin, stock, quota, distribution, booking, complaint, shipment, and notification workflows.
6. Keep the React pages and API methods unchanged; document `VITE_API_URL` for the PHP server.
7. Run PHP syntax checks and the existing Vite production build; perform database-backed HTTP checks where MySQL is available.
8. Document setup, schema/relationships, OOP design, API contracts, and migration operations.

## H. Migration caveats and verification boundary

The original schema and `setup.js` disagree, and some old paths operate on tables created only by setup. A clean install must use the new `backend/database/database.sql` and `seed.sql`; old data needs an explicit export/import migration and should not be pointed at the redesigned schema unchanged. The old backend currently has no endpoint to mark beneficiary complaints read or edit profiles, and `POST /shopkeeper/sell-stock` does not authorize that the requested stock belongs to the caller. The PHP implementation validates shop ownership consistently. A database-backed integration check requires a configured MySQL server and the documented environment variables.
