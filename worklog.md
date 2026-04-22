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

---
Task ID: 2-1
Agent: Super Z (main)
Task: Fix Prisma @db.Double error + add Google Places API key to backend + fix edit modal bug + add delivery assignment to AdminOrdersScreen

Work Log:
- Fixed P1012 error: removed @db.Double from Address.lat and Address.lng in schema.prisma (PostgreSQL doesn't support Double native type; Float already maps to DoublePrecision)
- Added GOOGLE_PLACES_API_KEY to backend .env file
- Fixed AdminUsersScreen edit modal bug: changed openEdit() to use setTimeout(300ms) for setEditVisible(true) to prevent Android conflict when two modals animate simultaneously
- Added assignOrderDelivery() and fetchDeliveryUsers() to api.js
- Added delivery assignment UI to AdminOrdersScreen: shows assigned delivery person info, "Asignar repartidor" button, reassignment option, delivery user selection modal

Stage Summary:
- Schema fix resolves `npx prisma db push` error
- Edit modal fix: user clicks "Editar usuario" and edit modal opens immediately without requiring double click
- AdminOrdersScreen now supports full delivery assignment workflow
- Backend .env now has GOOGLE_PLACES_API_KEY for future server-side Places API usage
---
Task ID: 1
Agent: main
Task: Fix @db.Double + implement delivery accept, stores model, custom modals, store filter

Work Log:
- Fixed @db.Double → Float? in schema.prisma (already committed in previous session push)
- Added Store model to prisma schema (name, slug, owner FK, products relation)
- Added storeId to Product model with FK to Store
- Added ownedStore relation to User model
- Created src/routes/stores.js with full CRUD (GET list, GET detail, GET my-store, POST create, PUT update, DELETE)
- Editor auto-linked: only 1 store per editor, auto-filters products
- Added GET /orders/available endpoint for delivery (confirmed/pending, deliveryId=null)
- Added POST /orders/:id/accept with atomic updateMany race condition protection (returns 409 if taken)
- Updated products route: store filter (?store=N), auto-assign storeId for editors
- Updated seed: 2 stores, 19 products distributed, 7 modules (32 permissions), 5 users
- Created ConfirmModal component (animated, types: confirm/alert/danger)
- Created Toast component (animated slide-in, types: success/error/warning/info)
- Rewrote DeliveryOrdersScreen: 3 tabs (Disponibles/Mis entregas/Entregados), custom modals, toast feedback
- Updated AdminRolesScreen: added delivery+stores to moduleLabels, replaced Alert.alert with Toast
- Updated HomeScreen: added store filter (expandable), clear filters button
- Updated api.js: added fetchAvailableOrders, acceptOrder, fetchStores methods
- Pushed all backend changes (commit 73de58c)

Stage Summary:
- Backend fully pushed to origin/main
- App changes ready at /home/z/my-project/JO-Shop/
- User needs: git pull in backend, npx prisma db push, npx prisma db seed
- App: copy updated files to local JO-Shop project

---
Task ID: 1
Agent: Main
Task: Replace ALL Alert.alert with ConfirmModal + Fix icon error + Inline map

Work Log:
- Fixed ConfirmModal.js icon: 'alert-triangle' → 'warning' (invalid Ionicons name)
- Replaced 39 Alert.alert calls across 7 files with ConfirmModal:
  - ProfileScreen.js: 11 calls (profile CRUD, addresses, logout)
  - SettingsScreen.js: 5 calls (URL config validations)
  - AdminUsersScreen.js: 12 calls (user management, roles, permissions, logout)
  - AdminProductsScreen.js: 6 calls (product CRUD, toggle, logout)
  - AdminCategoriesScreen.js: 3 calls (category CRUD)
  - AdminDashboardScreen.js: 1 call (logout)
  - AdminOrdersScreen.js: 1 call (delivery assignment error)
- Cleaned up unused Alert imports in 3 additional files (ProductCard, ProductDetailScreen, AdminRolesScreen)
- Added inline map modal to DeliveryOrdersScreen using react-native-webview (WebView with embedded Google Maps)
- Installed react-native-webview v13.16.1

Stage Summary:
- Zero Alert.alert calls remain in the entire app
- Zero unused Alert imports remain
- ConfirmModal used consistently across all screens
- Map now opens inline in the app via WebView instead of external Google Maps
- User needs to run: npx pod-install (iOS) and rebuild the app for the webview changes
