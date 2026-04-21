# JO-Shop

App móvil para publicación de productos y carrito de compras, desarrollada con **React Native CLI** (sin Expo).

## Características

- Listado de productos desde el backend
- Búsqueda de productos
- Filtro por categorías
- Detalle de producto
- Carrito de compras con persistencia (AsyncStorage)
- Formulario de pedido con datos de entrega
- Confirmación de pedido
- Configuración de URL del servidor
- Prueba de conexión al backend
- Diseño minimalista

## Requisitos previos

- **Node.js** >= 18
- **npm** o **yarn**
- **Android Studio** (para Android)
- **Xcode** >= 15 (para iOS, solo macOS)

## Instalación

### 1. Clonar el proyecto

```bash
cd JO-Shop
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Para iOS (solo macOS)

```bash
cd ios && pod install && cd ..
```

## Configuración del Backend

1. Abre la app
2. Ve a la pestaña **Ajustes**
3. Ingresa la URL de tu backend (ej: `https://api.mitienda.com`)
4. Toca **Probar conexión** para verificar
5. Toca **Guardar**

### Estructura esperada del API

La app espera los siguientes endpoints en tu backend:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/products` | Obtener listado de productos |
| GET | `/products/:id` | Obtener detalle de un producto |
| GET | `/products/search?q=query` | Buscar productos |
| GET | `/categories` | Obtener categorías |
| POST | `/orders` | Crear un pedido |
| GET | `/health` o `/` | Verificar estado del servidor |

### Formato de producto esperado

```json
{
  "id": 1,
  "name": "Producto de ejemplo",
  "description": "Descripción del producto",
  "price": 29.99,
  "image": "https://ejemplo.com/imagen.jpg",
  "category": "Categoría",
  "stock": 50
}
```

La app es flexible y soporta campos alternativos: `title` en lugar de `name`, `precio` en lugar de `price`, `thumbnail` o `image_url` en lugar de `image`.

## Ejecutar la app

### Android

```bash
npx react-native run-android
```

### iOS

```bash
npx react-native run-ios
```

### Iniciar Metro Bundler

```bash
npx react-native start
```

## Estructura del proyecto

```
JO-Shop/
├── App.js                        # Punto de entrada principal
├── index.js                      # Registro de la app
├── package.json                  # Dependencias
├── babel.config.js               # Configuración de Babel
├── metro.config.js               # Configuración de Metro
├── android/                      # Proyecto Android
├── ios/                          # Proyecto iOS
└── src/
    ├── navigation/
    │   └── AppNavigator.js       # Navegación (tabs + stack)
    ├── screens/
    │   ├── HomeScreen.js         # Listado de productos
    │   ├── ProductDetailScreen.js # Detalle de producto
    │   ├── CartScreen.js         # Carrito y checkout
    │   ├── SettingsScreen.js     # Configuración del backend
    │   └── OrderConfirmationScreen.js # Confirmación de pedido
    ├── components/
    │   ├── Header.js             # Header y barra de búsqueda
    │   ├── ProductCard.js        # Tarjeta de producto
    │   ├── CartItem.js           # Item del carrito
    │   └── StateViews.js         # Estados: vacío, error, carga
    ├── context/
    │   └── CartContext.js         # Estado global del carrito
    ├── services/
    │   └── api.js                # Servicio de comunicación con el backend
    ├── theme/
    │   └── styles.js             # Tema y estilos globales
    └── utils/
        └── helpers.js            # Utilidades generales
```

## Tecnologías

- **React Native** 0.73.x (CLI puro, sin Expo)
- **React Navigation** 6 (Native Stack + Bottom Tabs)
- **Axios** para peticiones HTTP
- **AsyncStorage** para persistencia local
- **React Native Vector Icons** para iconos

## Paleta de colores

| Color | Hex | Uso |
|-------|-----|-----|
| Primario | `#1A1A2E` | Header, textos principales |
| Acento | `#E94560` | Botones, precios, destacados |
| Exito | `#2ECC71` | Confirmaciones, stock |
| Fondo | `#F8F9FA` | Fondo de la app |
| Tarjeta | `#FFFFFF` | Tarjetas y secciones |

## Licencia

MIT
