# JO-Shop Web Frontend - Worklog

## Fecha: 2025

## Resumen
Creación completa de un frontend Next.js 16 para la aplicación de e-commerce JO-Shop, adaptada desde la aplicación React Native original.

## Archivos Creados

### Configuración del proyecto
- `package.json` - Dependencias: next 15.3+, react 19, axios, lucide-react, tailwindcss 4
- `tsconfig.json` - Configuración TypeScript con path aliases
- `next.config.ts` - Configuración Next.js con soporte de imágenes remotas
- `postcss.config.mjs` - Configuración PostCSS con Tailwind CSS 4
- `README.md` - Documentación del proyecto

### Estilos globales
- `src/app/globals.css` - Variables CSS del tema (colores, sombras), estilos base, animaciones, scrollbar custom, estados de orden, clases de utilidad

### Librerías
- `src/lib/api.ts` - Cliente Axios con interceptores (auth token, 401 redirect), helpers para extraer datos de respuestas API con diferentes formatos
- `src/lib/utils.ts` - Utilidades: formatPrice (USD), formatDate (es-ES), getStatusLabel, getStatusColor, getProductImage, showToast, debounce, getInitials, getRoleLabel, getRoleBadgeColor

### Contextos
- `src/contexts/AuthContext.tsx` - Autenticación completa: login (con soporte 2FA), verifyOtp, register, logout, updateProfile, persistencia en localStorage
- `src/contexts/ConfigContext.tsx` - Configuración global: fetch /config, soporte multi_store

### Componentes compartidos
- `src/components/Header.tsx` - Cabecera con título, botón volver, logout, settings
- `src/components/BottomNav.tsx` - Navegación inferior para clientes (Inicio, Carrito, Pedidos, Perfil) con badge de carrito
- `src/components/AdminSidebar.tsx` - Sidebar desktop colapsable + bottom nav mobile, filtros por permisos, iconos y labels
- `src/components/ProductCard.tsx` - Tarjeta de producto con imagen, nombre, precio, stock badge, botón agregar al carrito
- `src/components/ConfirmModal.tsx` - Modal de confirmación reutilizable con soporte para children

### Páginas

#### Autenticación
- `src/app/layout.tsx` - Layout raíz con AuthProvider y ConfigProvider
- `src/app/page.tsx` - Redirect inteligente según rol (admin→/admin, delivery→/delivery, customer→/home, none→/login)
- `src/app/login/page.tsx` - Login con email/password + flujo OTP de verificación en dos pasos
- `src/app/register/page.tsx` - Registro con nombre, email, password, confirmar password

#### Cliente
- `src/app/home/page.tsx` - Catálogo de productos: búsqueda, categoría pills, filtro de tienda (multi-store), grid responsivo
- `src/app/product/[id]/page.tsx` - Detalle de producto: imagen grande, nombre, precio, descripción, stock, agregar al carrito
- `src/app/cart/page.tsx` - Carrito: items con +/-, eliminar, vaciar, total, realizar pedido, empty state
- `src/app/orders/page.tsx` - Mis pedidos: tabs de filtro por estado, cards con estado/fecha/items/total
- `src/app/profile/page.tsx` - Perfil: avatar con iniciales, info personal editable, toggle 2FA, logout

#### Administración
- `src/app/admin/layout.tsx` - Layout admin con sidebar, guardia de rol (admin/editor)
- `src/app/admin/page.tsx` - Dashboard: stats cards (pedidos, ingresos, hoy, clientes, productos), tabla pedidos recientes
- `src/app/admin/products/page.tsx` - CRUD productos: tabla, búsqueda, modal crear/editar, eliminar
- `src/app/admin/categories/page.tsx` - CRUD categorías: lista con cards, modal crear/editar, eliminar
- `src/app/admin/orders/page.tsx` - Gestión pedidos: tabs estado, expandir detalles, actualizar estado, cancelar
- `src/app/admin/stores/page.tsx` - CRUD tiendas (multi-store): lista con info y conteo de productos
- `src/app/admin/roles/page.tsx` - CRUD roles: lista con conteo de permisos, modal con tabla de permisos por módulo
- `src/app/admin/users/page.tsx` - CRUD usuarios: grid de cards, búsqueda, modal con radio roles y checkboxes tiendas

#### Repartidor
- `src/app/delivery/layout.tsx` - Layout con guardia de rol (delivery)
- `src/app/delivery/page.tsx` - Entregas: tabs disponibles/mías, expandir con datos cliente y artículos, aceptar/entregar

## Total: 28 archivos creados

---

## Refactor: Eliminación de URLs basadas en roles — Landing pública

### Fecha: 2025-07

### Motivación
Eliminar `/admin/` y `/delivery/` de las URLs. Todas las vistas comparten URLs limpias.
El sistema de roles/permisos controla el acceso, no la estructura de URLs.
La landing page (`/`) es PÚBLICA — no requiere login para navegar productos.

### Cambios realizados

#### Estructura de rutas nueva
| Ruta Anterior | Ruta Nueva | Notas |
|---|---|---|
| `/` (redirector) | `/` | Landing page PÚBLICA |
| `/home` | `/` (redirect) | Redirige a `/` |
| `/admin` | `/dashboard` | `(management)/dashboard/` |
| `/admin/products` | `/manage-products` | `(management)/manage-products/` |
| `/admin/categories` | `/manage-categories` | `(management)/manage-categories/` |
| `/admin/orders` | `/manage-orders` | `(management)/manage-orders/` |
| `/admin/roles` | `/manage-roles` | `(management)/manage-roles/` |
| `/admin/users` | `/manage-users` | `(management)/manage-users/` |
| `/admin/stores` | `/manage-stores` | `(management)/manage-stores/` |
| `/delivery` | `/deliveries` | `(delivery)/deliveries/` |
| `/orders` | `/my-orders` | `my-orders/` |
| `/cart` | `/cart` | PÚBLICA (sin auth) |
| N/A | `/checkout` | NUEVO - flujo de compra |

#### Archivos creados/modificados
- `src/app/page.tsx` — Landing page pública con header propio, carrito, login hint
- `src/app/(management)/layout.tsx` — Layout con guardia admin/editor
- `src/app/(management)/dashboard/page.tsx` — Dashboard admin
- `src/app/(management)/manage-products/page.tsx` — CRUD productos
- `src/app/(management)/manage-categories/page.tsx` — CRUD categorías
- `src/app/(management)/manage-orders/page.tsx` — Gestión pedidos
- `src/app/(management)/manage-roles/page.tsx` — CRUD roles
- `src/app/(management)/manage-users/page.tsx` — CRUD usuarios
- `src/app/(management)/manage-stores/page.tsx` — CRUD tiendas
- `src/app/(delivery)/layout.tsx` — Layout con guardia delivery
- `src/app/(delivery)/deliveries/page.tsx` — Entregas
- `src/app/checkout/page.tsx` — Nuevo checkout page
- `src/app/my-orders/page.tsx` — Renombrado desde `/orders`
- `src/app/home/page.tsx` — Redirect a `/`
- `src/components/Header.tsx` — Cart icon con badge
- `src/components/AppHeader.tsx` — Cart icon con badge
- `src/components/SidebarMenu.tsx` — Rutas actualizadas
- `src/components/BottomNav.tsx` — Rutas actualizadas
- `src/app/login/page.tsx` — Redirect con saved path support
- `src/app/register/page.tsx` — Redirect con saved path support
- `src/app/cart/page.tsx` — Público, botón checkout/login
- `src/app/product/[id]/page.tsx` — Back button → `/`

#### Directorios eliminados
- `src/app/admin/` → movido a `(management)/`
- `src/app/delivery/` → movido a `(delivery)/`
- `src/app/orders/` → movido a `my-orders/`

#### Características técnicas del refactor
- Route groups `(management)` y `(delivery)` no afectan URLs
- Cart persistido en localStorage funciona entre login/register
- `joshop_redirect_after_login` guarda ruta para redirigir post-auth
- Cart icon con badge visible en Header, AppHeader y landing page
- Checkout flow: carrito → login si necesario → confirmar → my-orders
- Landing page muestra productos sin auth, hide addToCart si no logueado
- Build exitoso: 19 rutas, 0 errores

## Características técnicas
- Next.js 15 con App Router y TypeScript estricto
- Tailwind CSS 4 con variables CSS custom
- Sin shadcn/ui (componentes custom)
- API client con manejo robusto de respuestas
- Estado persistente (localStorage)
- Diseño responsive mobile-first
- Toda la UI en español
- Deploy-ready para Vercel

---
Task ID: 1
Agent: Main Agent
Task: Fix horizontal scroll item cutoff and manage-products blank page

Work Log:
- Analyzed landing page horizontal scroll sections (Mas vendidos, Ofertas, Category pills) - all used `scrollbar-hide` class hiding the scrollbar with no alternative navigation
- Removed `scrollbar-hide` from all three horizontal scroll sections
- Added visible thin scrollbar via `.scroll-container` CSS class
- Added left/right scroll arrow buttons (ChevronLeft/ChevronRight) to "Más vendidos" and "Ofertas" sections
- Added `paddingRight: 16` to scroll containers to prevent last item clipping
- Added `scroll-snap` for smooth snapping behavior
- Removed `overflow: hidden` from products grid that was clipping items
- For manage-products: Added `page=1&limit=100` pagination params to API call
- Added `tryExtractProducts()` deep fallback function to handle any API response shape
- Added `fetchError` state and error UI with retry button
- Added console logging for debugging API response format
- Build succeeded, pushed to GitHub (dab0e0d)

Stage Summary:
- Landing page now has visible scrollbar + arrow buttons for horizontal scroll sections
- manage-products now has better error handling, pagination support, and visible error state
- All changes deployed to https://jo-frontend-shop.vercel.app

---
Task ID: 3
Agent: Main Agent
Task: Add configuration/settings view for admin role in web app

Work Log:
- Analyzed mobile app SettingsScreen.js — found 3 sections: Backend URL (admin-only), Multi-Store toggle (admin-only), About (always visible)
- Updated ConfigContext.tsx — added updateConfig() function (PUT /config with {settings}) and isSaving state
- Created /settings page at src/app/(management)/settings/page.tsx with:
  - Multi-Store toggle (admin-only) — Switch component with immediate state + API update
  - Backend Server section (admin-only) — Read-only URL display, connection test button, external link
  - About section — App version, platform, current role, user info
- Added "Configuracion" nav item to SidebarMenu.tsx for admin users only
- Build succeeded, pushed to GitHub (145612f)

Stage Summary:
- New route: /settings with full config management
- ConfigContext now supports write operations via updateConfig()
- Settings page matches mobile app functionality
- Only admin users see the Configuracion menu item
