# REST API Documentation

Base URL: `http://localhost:5000/api` (same base URL as the previous Express API). All request and response bodies are JSON except beneficiary registration, which is `multipart/form-data` for the optional ration-card image. Protected routes require `Authorization: Bearer <token>`.

## Authentication and response behavior

Login returns the existing React contract `{message, token, user}`. The JWT is HS256, expires after 24 hours, and contains only `sub` (user ID), `role`, `iat`, and `exp`. The account and shop approval state are reloaded on each protected request, so rejecting an account or shop immediately blocks its token. The React logout flow removes the token and local user from `localStorage`; no logout API call is required by the current frontend.

Existing success shapes remain compatible: bare arrays for list views and the existing object shapes for dashboards, quota, history and login. Errors are JSON `{success:false,message}` with HTTP status codes: 400 malformed request, 401 missing/invalid credentials or token, 403 role/approval denial, 404 missing resource, 409 unique/active-booking conflict, 422 invalid fields or business-rule violation, and 500 unexpected server error. Database details are logged server-side, never returned to the client.

## Public routes

| Method and path | Input | Result |
| --- | --- | --- |
| `GET /health` | None | `{status,message}` |
| `POST /auth/login` | `{username,password}`; email may also be used as username | `{message,token,user:{id,username,role,name,cardType}}` |
| `POST /auth/register/user` | Multipart form fields used by `UserRegister.jsx`, optional JPEG/PNG/WebP `rationCardImage` up to 5 MB | 201 with `{message,userId,username}` |
| `POST /auth/register/shopkeeper` | Existing JSON owner/shop fields | 201 with `{message,userId,username}` |
| `GET /auth/check-username/:username` | None | `{available,message}` |
| `GET /auth/shops` | None | Approved shop array used during registration |

## Beneficiary routes

All require role `user`.

| Method and path | Purpose / result |
| --- | --- |
| `GET /user/profile` | Existing profile shape, including approval and verification status. |
| `PUT /user/profile` | Update mobile and editable address/contact fields; ration-card identity and category are not self-editable. |
| `GET /user/quota` | `{cardType,month,quota:[{item,total,remaining,price,unit}]}`; initializes missing current-month balances. |
| `GET /user/history` | Collection history grouped by month, retaining `month/items/collected`. |
| `GET /user/quota-history?page=1&limit=10` | Paginated distribution history, retaining `{history,pagination}`. |
| `GET /user/shop` | Assigned shop details, including both `shop_name` and `name` for current UI usage. |
| `GET /user/shop/:id/stock` | Assigned shop's current-period stock only. |
| `POST /user/book-slot` | `{date:"YYYY-MM-DD",time}`; one active booking per beneficiary/day. |
| `GET /user/slots` | Beneficiary booking dates, slots and statuses. |
| `POST /user/complaint` | `{type,message,shopId?}`; only the assigned shop can be selected. |
| `GET /user/complaints` | Complaint status and admin/shopkeeper response. |
| `GET /user/alerts` | Individual, assigned-shop, role and global notifications. |
| `POST /user/alerts/:id/read` | Mark an owned or visible notification read. |

## Shopkeeper routes

All require an approved shopkeeper role and an approved shop owned by that account.

| Method and path | Purpose / input |
| --- | --- |
| `GET /shopkeeper/dashboard` | Shop and `{pending,verified,stockItems}` statistics. |
| `GET /shopkeeper/pending`, `GET /shopkeeper/verified` | Beneficiaries assigned to this shop. |
| `POST /shopkeeper/verify/:id` | `{action:"approve"|"reject"}`; approval forwards to admin. |
| `GET /shopkeeper/stock` | Current monthly inventory in existing `{id,item,allocated,distributed,unit,last_updated}` form. |
| `PUT /shopkeeper/stock/:id` | `{quantity}` adds inventory, movement audit and shop notification. |
| `PUT /shopkeeper/stock/:id/sell` | `{quantity}` records an unassigned/manual stock distribution and audit. |
| `POST /shopkeeper/sell-stock` | Legacy `{stockId,quantity}` equivalent; ownership is verified. |
| `PUT /shopkeeper/shop-status` | `{is_open:boolean}`. |
| `GET /shopkeeper/beneficiary-quota/:userId` | Verified assigned beneficiary's current monthly item balances. |
| `POST /shopkeeper/collect-ration` | `{userId,itemName,amount}`; atomically verifies eligibility, quota and stock and writes distribution/audit rows. |
| `GET /shopkeeper/stock-history` | Recent movement log in existing `action_type`, `item_name`, `quantity`, `user_name`, `timestamp` shape. |
| `GET /shopkeeper/assigned-stock` | Current-month pending shipments. |
| `POST /shopkeeper/receive-stock` | `{assignmentId}`; atomically receives shipment into stock. |
| `GET /shopkeeper/bookings` | Bookings assigned to the shop. |
| `PUT /shopkeeper/bookings/:id` | `{status:"completed"|"cancelled"}`. |
| `GET /shopkeeper/complaints` | Complaints filed against this shop. |
| `PUT /shopkeeper/complaints/:id` | `{response}`; sends a shopkeeper reply without changing admin status. |
| `GET /shopkeeper/alerts` | Shopkeeper and shop notifications. |
| `POST /shopkeeper/alerts/:id/read` | Mark a visible notification read. |

## Admin routes

All require role `admin`.

| Method and path | Purpose / input |
| --- | --- |
| `GET /admin/dashboard` | `{totalUsers,pendingApprovals,openComplaints}`. |
| `GET /admin/pending` | Existing combined user/shop approval rows. |
| `POST /admin/approve/:id` | `{type:"user"|"shopkeeper",action:"approve"|"reject"}`. Shopkeeper IDs are shop IDs as in the existing UI. |
| `GET /admin/users`, `GET /admin/beneficiaries`, `GET /admin/shopkeepers` | System user lists. |
| `GET /admin/shops` | Approved shops and owner details. |
| `PUT /admin/beneficiaries/:id/shop` | `{shopId}` assigns an approved shop and restarts verification. |
| `GET /admin/categories`, `GET /admin/items` | Category and product lookups. |
| `GET /admin/quota` | Existing category-keyed quota map with display labels. |
| `PUT /admin/quota` | `{card_type,items:[{item,qty,price}]}`; values accept numeric labels such as `10 kg` and `₹3/kg`. |
| `POST /admin/quota/new-item` | `{itemName,quantity,price,unit,initialStock?}` creates item and category rules. |
| `DELETE /admin/quota/:cardType/:itemName` | Removes that category's quota rule. |
| `GET /admin/stock` | System-wide current and historical stock rows. |
| `GET /admin/distributions?page=1&limit=100` | Distribution audit rows. |
| `GET /admin/bookings` | All bookings and shop/beneficiary details. |
| `GET /admin/shops/:id/demand` | Existing demand, category breakdown, previous surplus and suggested shipment fields. |
| `POST /admin/shops/:id/allocate` | `{items:[{itemName,quantity}]}` creates pending monthly shipments. |
| `POST /admin/monthly-reset` | Reports the active month; monthly rows are keyed by period, so history is retained. |
| `GET /admin/complaints` | Complaint list. |
| `PUT /admin/complaints/:id` | `{action:"resolve"|"dismiss"|"warn",warning?,response?}` updates status and optionally notifies the shopkeeper. |
| `GET /admin/notifications` | Published notifications. |
| `POST /admin/notifications` | `{message,notification_type?,target_role?,user_id?,shop_id?}` publishes scoped or global notice. |
| `DELETE /admin/notifications/:id` | Removes a managed notification. |

## Compatibility notes

Every old Express path and HTTP method used by the React API helper is retained. No React page or API call needed to be rewritten. `frontend/src/data/api.js` still defaults to `http://localhost:5000/api`; set `VITE_API_URL` only when PHP runs elsewhere. New profile editing, complaints/status, notification-read, shop booking management, admin assignment and system monitoring routes extend the API without changing the existing screen contract.
