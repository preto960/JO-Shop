/**
 * ============================================
 *  JO-Shop — Environment Configuration
 * ============================================
 *
 * INSTRUCCIONES:
 * Cambia la URL de tu backend aqui antes de compilar.
 * Esta URL se usara automaticamente al iniciar la app.
 *
 * Puedes seguir cambiandola en runtime desde Ajustes,
 * pero este archivo es el valor por defecto.
 *
 * Para produccion: coloca la URL definitiva y compila.
 * Para desarrollo: cambia segun tu entorno local.
 */

const ENV = {
  // ── Cambia esta URL por la de tu backend ──
  API_URL: 'https://jo-backend-shop.vercel.app',

  // ── Configuracion general ──
  APP_NAME: 'JO-Shop',
  APP_VERSION: '1.0.0',
  DEBUG: __DEV__,

  // ── Timeouts (en milisegundos) ──
  API_TIMEOUT: 15000,
  CONNECTION_TIMEOUT: 10000,

  // ── Credenciales demo ──
  DEMO_ADMIN_EMAIL: 'admin@joshop.com',
  DEMO_ADMIN_PASSWORD: 'Admin123',
  DEMO_CLIENT_EMAIL: 'cliente@joshop.com',
  DEMO_CLIENT_PASSWORD: 'Cliente123',
  DEMO_EDITOR_EMAIL: 'editor@joshop.com',
  DEMO_EDITOR_PASSWORD: 'Editor123',
  // ── Google Maps / Places API ──
  GOOGLE_PLACES_API_KEY: 'AIzaSyBJBdrBQpWZeH6Ceh-S5ccRj5-tO4gM6DA',
};

export default ENV;
