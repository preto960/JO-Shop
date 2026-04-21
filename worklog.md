# JO-Shop / JO-backend-shop — Worklog

---
Task ID: 1-12
Agent: Super Z (main)
Task: Implementar delivery, direcciones, editar usuarios en backend + app, y fix de bugs

Work Log:
- Analizado el código completo del backend (schema, routes, seed, middleware, services)
- Analizado el código completo de la app (screens, api service, navigation, auth context)

## Backend Changes

### 1. schema.prisma
- Added `birthdate` field (String, VarChar(10)) to User model
- Added `Address` model with: id, userId, label, address, city, notes, lat, lng, isDefault
- Added `deliveryId` (nullable FK to User) to Order model with relation "DeliveryPerson"
- Added indexes on addresses(userId) and orders(deliveryId)

### 2. src/routes/addresses.js (NEW)
- GET /addresses — List user's saved addresses (ordered by isDefault desc)
- POST /addresses — Create address (auto-default if first, manages default flag)
- PUT /addresses/:id — Update address
- PUT /addresses/:id/default — Set as default address
- DELETE /addresses/:id — Delete address (auto-reassigns default if needed)

### 3. src/routes/admin.js
- Added PUT /auth/users/:id — Admin can edit user name, phone, birthdate, active status

### 4. src/routes/orders.js (UPDATED)
- GET /orders — Now delivery role can see ALL orders (not filtered by userId)
- GET /orders/:id — Delivery assigned to order can also view details
- POST /orders — Now accepts optional `addressId` to link to saved address
- PUT /orders/:id/status — Delivery can change to 'shipped'/'delivered', auto-assigns self
- PUT /orders/:id/assign (NEW) — Admin assigns delivery user, auto-confirms order
- DELETE /orders — Simplified auth logic (admin or orders.delete permission)

### 5. prisma/seed.js (UPDATED)
- Added `delivery` module permissions: view_menu, read, accept, confirm
- Created `delivery` role with appropriate permissions
- Created `delivery@joshop.com / Delivery123` user with delivery role
- Added 2 sample addresses for client user (Casa + Oficina)
- Updated credential summary with all 4 users

### 6. src/index.js
- Registered `/addresses` route
- Added address endpoints to API documentation

### 7. src/routes/auth.js
- Already had birthdate support (was updated previously)
- Confirmed register, login, profile, me all include birthdate

## App Changes

### 8. Fix: AdminUsersScreen double-click edit bug
- Root cause: `openEdit()` called `closeDetail()` which set `selectedUser=null`
- renderEditModal checked `if (!selectedUser) return null` — modal opened empty
- Fix: Don't call closeDetail(), just hide detail modal and keep selectedUser intact
- Added `name` field to editForm (admin can edit user names)

### 9. src/services/api.js
- Added: fetchAddresses, createAddress, updateAddress, setDefaultAddress, deleteAddress
- Added: updateUser (for admin user editing)

### 10. CartScreen.js (REWRITTEN)
- Added address selector: toggle between saved addresses and new address
- Saved addresses: radio selection with default badge
- New address form with label, address, city, notes
- Google Places autocomplete integration (API key from ENV)
- Address verified indicator (green check when lat/lng obtained)
- Saves new address before confirming order
- Sends addressId in order payload

### 11. ProfileScreen.js (REWRITTEN)
- Added "Mis direcciones" section for customer/delivery users
- Shows list of saved addresses with icons, labels, default badge
- Add/Edit/Delete addresses via modal
- Set default address action
- Google Places search in address modal
- Clean empty state with CTA to add first address

### 12. DeliveryOrdersScreen.js
- Backend updated to allow delivery role to see all orders (no app change needed)
- Orders endpoint now returns all orders for delivery role

### 13. src/config/env.js
- Added GOOGLE_PLACES_API_KEY with user's API key
- Added demo credentials for editor and delivery users

Stage Summary:
- All backend changes ready: schema, addresses CRUD, delivery support, seed, admin user edit
- All app changes ready: bug fixes, address system in cart and profile, API service updates
- User needs to run: `npx prisma db push` and `npx prisma db seed` on their local machine
- Files modified: 8 backend files, 6 app files
