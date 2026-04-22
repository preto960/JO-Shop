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

// Flag para saber si Firebase esta realmente disponible
const isFirebaseAvailable = () => !!messaging;

// ─── FUNCIONES PÚBLICAS ────────────────────────────────────────────────────

/**
 * Solicitar permiso de notificaciones
 * @returns {Promise<boolean>}
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
    return enabled;
  } catch (error) {
    console.error('[Push] Error solicitando permisos:', error.message);
    return false;
  }
}

/**
 * Verificar si las notificaciones estan autorizadas
 * @returns {Promise<boolean>}
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
 * @returns {Promise<string|null>}
 */
export async function getFCMToken() {
  if (!isFirebaseAvailable()) {
    console.log('[Push] Firebase no disponible, no se puede obtener token FCM');
    return null;
  }

  try {
    // Verificar permisos primero
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
 * @returns {Promise<boolean>}
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
 * @returns {Function} Unsubscribe function
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
 * @returns {Function} Unsubscribe function
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
 * @returns {Promise<object|null>}
 */
export async function getInitialNotification() {
  if (!isFirebaseAvailable()) return null;

  try {
    return await messaging().getInitialNotification();
  } catch {
    return null;
  }
}

/**
 * Configurar el handler para background/quit messages
 */
export function setBackgroundMessageHandler() {
  if (!isFirebaseAvailable()) {
    console.log('[Push] Firebase no disponible, background handler no configurado');
    return;
  }

  try {
    // El background message handler se registra como modulo de nivel superior
    // en @react-native-firebase/messaging. Esta llamada es segura cuando
    // Firebase esta correctamente inicializado.
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Push] Mensaje en background:', remoteMessage?.messageId);
    });
    console.log('[Push] Background message handler configurado');
  } catch (error) {
    console.error('[Push] Error configurando background handler:', error.message);
  }
}

export default {
  requestNotificationPermission,
  checkNotificationPermission,
  getFCMToken,
  registerPushToken,
  unregisterPushToken,
  onTokenRefresh,
  onForegroundMessage,
  getInitialNotification,
  setBackgroundMessageHandler,
};
