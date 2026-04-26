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

## Características técnicas
- Next.js 15 con App Router y TypeScript estricto
- Tailwind CSS 4 con variables CSS custom
- Sin shadcn/ui (componentes custom)
- API client con manejo robusto de respuestas
- Estado persistente (localStorage)
- Diseño responsive mobile-first
- Toda la UI en español
- Deploy-ready para Vercel
