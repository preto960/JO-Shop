import { Platform } from 'react-native';
import apiService from '@services/api';

// ─── Firebase Messaging: import defensivo ──────────────────────────────────
// Si Firebase no esta instalado o los modulos nativos no estan compilados,
// el import falla y usamos un mock seguro para que la app no crashee.
let messaging = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (err) {
  console.warn('[Push] Firebase Messaging no disponible:', err.message);
}

// ─── Notifee: import defensivo ────────────────────────────────────────────
// Notifee permite mostrar notificaciones del sistema de forma explicita,
// lo cual es mas confiable que el comportamiento automatico de Firebase.
let notifee = null;
let AndroidImportance = null;
try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default;
  AndroidImportance = notifeeModule.AndroidImportance;
} catch (err) {
  console.warn('[Push] Notifee no disponible:', err.message);
}

// Valor numerico de Android importance HIGH (4) como fallback
const IMPORTANCE_HIGH = AndroidImportance?.HIGH || 4;

// Flag para saber si Firebase esta realmente disponible
const isFirebaseAvailable = () => !!messaging;

// ─── CALLBACK PARA NOTIFICACIONES FOREGROUND ──────────────────────
// Los callbacks se almacenan aqui para que App.js pueda conectar el modal
let _foregroundCallback = null;

export function setForegroundCallback(callback) {
  _foregroundCallback = callback;
}

// ─── CANAL DE NOTIFICACIONES ANDROID ───────────────────────────────────────
// El canal se crea tanto en MainApplication.java (nivel nativo) como con notifee
// (nivel JS) para asegurar que exista en todos los casos.
const CHANNEL_ID = 'joshop_orders';

/**
 * Crear canal de notificaciones con notifee.
 * Llamar al iniciar la app (despues del login) para asegurar que el canal existe.
 */
export async function ensureNotificationChannel() {
  if (!notifee) return;
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Pedidos JO-Shop',
      description: 'Notificaciones de nuevos pedidos, actualizaciones y entregas',
      importance: IMPORTANCE_HIGH,
    });
    console.log('[Push] Canal de notificaciones verificado:', CHANNEL_ID);
  } catch (err) {
    console.warn('[Push] Error creando canal con notifee:', err.message);
  }
}

/**
 * Solicitar permiso de notificaciones (Android 13+ tambien necesita POST_NOTIFICATIONS)
 */
export async function requestNotificationPermission() {
  if (!isFirebaseAvailable()) {
    console.log('[Push] Firebase no disponible, no se pueden solicitar permisos');
    return false;
  }

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[Push] Permisos:', enabled ? 'OTORGADOS' : 'DENEGADOS');

    // Despues de obtener permisos, asegurar que el canal de notificaciones existe
    if (enabled && Platform.OS === 'android') {
      await ensureNotificationChannel();
    }

    return enabled;
  } catch (error) {
    console.error('[Push] Error solicitando permisos:', error.message);
    return false;
  }
}

/**
 * Verificar si las notificaciones estan autorizadas
 */
export async function checkNotificationPermission() {
  if (!isFirebaseAvailable()) return false;

  try {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/**
 * Obtener el token FCM del dispositivo
 */
export async function getFCMToken() {
  if (!isFirebaseAvailable()) {
    console.log('[Push] Firebase no disponible, no se puede obtener token FCM');
    return null;
  }

  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.log('[Push] Sin permisos, solicitando...');
      const granted = await requestNotificationPermission();
      if (!granted) return null;
    }

    const token = await messaging().getToken();
    if (token) {
      console.log('[Push] Token FCM obtenido:', token.substring(0, 20) + '...');
    }
    return token;
  } catch (error) {
    console.error('[Push] Error obteniendo token FCM:', error.message);
    return null;
  }
}

/**
 * Registrar el token FCM en el backend
 */
export async function registerPushToken() {
  if (!isFirebaseAvailable()) {
    console.log('[Push] Firebase no configurado, saltando registro de token');
    return false;
  }

  try {
    const token = await getFCMToken();
    if (!token) {
      console.log('[Push] No se pudo obtener el token FCM');
      return false;
    }

    const api = await apiService.createApiClient();
    if (!api) {
      console.log('[Push] No hay conexion al servidor para registrar token');
      return false;
    }

    await api.post('/notifications/token', {
      token: token,
      platform: Platform.OS,
    });

    console.log('[Push] Token registrado en el backend exitosamente');

    // Asegurar canal de notificaciones despues del registro
    await ensureNotificationChannel();

    return true;
  } catch (error) {
    console.error('[Push] Error registrando token:', error.message);
    return false;
  }
}

/**
 * Eliminar el token FCM del backend (logout)
 */
export async function unregisterPushToken() {
  if (!isFirebaseAvailable()) return;

  try {
    const token = await getFCMToken();
    if (!token) return;

    const api = await apiService.createApiClient();
    if (!api) return;

    await api.delete('/notifications/token', { data: { token } });
    console.log('[Push] Token eliminado del backend');
  } catch (error) {
    console.error('[Push] Error eliminando token:', error.message);
  }
}

/**
 * Escuchar cuando el token se refresca
 */
export function onTokenRefresh(callback) {
  if (!isFirebaseAvailable()) {
    return () => {};
  }

  try {
    return messaging().onTokenRefresh(callback);
  } catch {
    return () => {};
  }
}

/**
 * Escuchar mensajes en foreground (app abierta)
 * Usa el callback registrado via setForegroundCallback para mostrar el modal
 */
export function onForegroundMessage(callback) {
  if (!isFirebaseAvailable()) {
    return () => {};
  }

  try {
    return messaging().onMessage(callback);
  } catch {
    return () => {};
  }
}

/**
 * Obtener la notificacion inicial (app abierta desde notificacion)
 */
export async function getInitialNotification() {
  if (!isFirebaseAvailable()) return null;

  try {
    return await messaging().getInitialNotification();
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// NOTA IMPORTANTE:
// - setBackgroundMessageHandler se registra en index.js ANTES de AppRegistry.
// - El background handler usa notifee para mostrar la notificacion del sistema.
// - notifee.displayNotification() garantiza que la notificacion SIEMPRE se muestre,
//   incluso cuando el comportamiento automatico de Firebase no funciona.
// ────────────────────────────────────────────────────────────────────────────

export default {
  requestNotificationPermission,
  checkNotificationPermission,
  getFCMToken,
  registerPushToken,
  unregisterPushToken,
  onTokenRefresh,
  onForegroundMessage,
  getInitialNotification,
  setForegroundCallback,
  isFirebaseAvailable,
  ensureNotificationChannel,
};
