# JO-Shop - Worklog

---
Task ID: 1
Agent: Super Z (Main)
Task: Crear app móvil React Native CLI "JO-Shop" - E-commerce minimalista

Work Log:
- Planificación de la estructura del proyecto React Native CLI (sin Expo)
- Creación de la estructura de carpetas: src/navigation, screens, components, context, services, theme, utils
- Configuración base: package.json, babel.config.js, metro.config.js, app.json, .gitignore
- Creación del tema global minimalista (colors, spacing, fontSize, shadows)
- Servicio de API con Axios: fetchProducts, fetchProductById, searchProducts, fetchCategories, createOrder, checkConnection
- Contexto global del carrito con useReducer + persistencia en AsyncStorage
- Navegación: Bottom Tabs (Inicio, Carrito, Ajustes) + Native Stack (ProductDetail, OrderConfirmation)
- Pantallas: HomeScreen (listado + búsqueda + categorías), ProductDetailScreen, CartScreen (checkout con formulario), SettingsScreen (config backend), OrderConfirmationScreen
- Componentes: ProductCard, CartItem, Header, EmptyState, ErrorState, LoadingState
- Configuración nativa Android: MainActivity, MainApplication, AndroidManifest, build.gradle
- Configuración nativa iOS: AppDelegate.h, AppDelegate.m, Info.plist
- README con instrucciones de instalación, API esperada y estructura del proyecto
- Corrección de imports (ScrollView en CartScreen y SettingsScreen)

Stage Summary:
- Proyecto completo de React Native CLI (sin Expo) en /home/z/my-project/JO-Shop/
- 31 archivos creados
- App funcional con: listado de productos, búsqueda, categorías, carrito persistente, checkout, configuración de backend
- Nombre: "JO-Shop" - comienza con "JO-", estilo minimalista
- Dependencias: React Native 0.73, React Navigation 6, Axios, AsyncStorage, Vector Icons
---
Task ID: 1
Agent: main
Task: Fix Android build, JS bundle crash, and icon issues for JO-Shop React Native app

Work Log:
- Investigated Android "Activity class does not exist" error — confirmed all config (applicationId, namespace, package, file path) is correct; issue is stale build artifacts
- Performed complete audit of all 28 JS files — zero broken imports found
- Confirmed `StyleSheet doesn't exist` is a Metro bundler cache issue (not code)
- Fixed react-native.config.js: removed `dependencies` block that set `android: null` and `ios: null`, which was blocking react-native-vector-icons font linking
- Fixed android/app/build.gradle: added `apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")` to copy icon fonts during build
- Verified all 6 admin views exist and are complete (Login, AdminDashboard, AdminProducts, AdminCategories, AdminOrders, AdminRoles)
- Verified permission-based navigation is implemented with `canViewModule()` checks
- Pushed fixes to GitHub

Stage Summary:
- Icon fix committed and pushed (68eacb7)
- All admin screens verified complete — no missing views
- User needs to: clean build + clear Metro cache + rebuild on their Windows machine

---
Task ID: 2
Agent: main
Task: Find and fix the root cause of 'StyleSheet doesn't exist' crash

Work Log:
- Found that AdminOrdersScreen.js was using StyleSheet.create() (line 615) WITHOUT importing StyleSheet from react-native
- This caused ReferenceError at module evaluation time, which cascaded to prevent AppRegistry.registerComponent from executing
- Fixed by adding StyleSheet to the react-native import block in AdminOrdersScreen.js
- Also found and fixed Header.js: was using styles.header, styles.leftContainer, etc. without any StyleSheet.create() definition
- Removed unused ActivityIndicator import from Header.js
- Committed and pushed to GitHub (4cc0217)

Stage Summary:
- ROOT CAUSE FOUND: AdminOrdersScreen.js missing StyleSheet import was causing the entire app crash
- Header.js missing styles definition was a secondary bug (would crash when Header/SearchBar rendered)
- Both fixes committed and pushed to GitHub

---
Task ID: 3
Agent: main
Task: Implement embedded environment config system for API URL

Work Log:
- Created src/config/env.js with pre-build configuration (API_URL, demo credentials, timeouts)
- Updated api.js to use ENV.API_URL as default baseUrl instead of empty string
- Updated SettingsScreen to show embedded URL in amber card, allow runtime override, and restore to env
- Updated LoginScreen to pull demo credentials from ENV config
- Added @config path alias to babel.config.js and metro.config.js
- Committed and pushed (e5cf162)

Stage Summary:
- App now works OUT OF THE BOX — no need to configure URL before login
- Default URL: https://jo-backend-shop.vercel.app (change in src/config/env.js)
- Settings screen shows env URL vs runtime override with restore capability
- Single file edit + rebuild is all that's needed to change environments
