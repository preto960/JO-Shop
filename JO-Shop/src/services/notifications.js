import { Platform } from 'react-native';
import apiService from '@services/api';

// Clave para guardar el token registrado en el backend
const REGISTERED_TOKEN_KEY = '@joshop_fcm_token';

// Flag para saber si Firebase esta disponible
let firebaseAvailable = null;

/**
 * Intentar importar Firebase de forma segura
 */
async function getMessaging() {
  if (firebaseAvailable === false) return null;

  try {
    const messaging = require('@react-native-firebase/messaging').default;
    // Probar si funciona
    await messaging().isAutoInitEnabled();
    firebaseAvailable = true;
    return messaging;
  } catch (err) {
    console.warn('[Push] Firebase no disponible:', err.message);
    firebaseAvailable = false;
    return null;
  }
}

/**
 * Solicitar permiso de notificaciones al usuario
 */
export async function requestNotificationPermission() {
  try {
    const messaging = await getMessaging();
    if (!messaging) return false;

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (err) {
    console.warn('[Push] Error solicitando permiso:', err.message);
    return false;
  }
}

/**
 * Verificar si las notificaciones estan autorizadas
 */
export async function checkNotificationPermission() {
  try {
    const messaging = await getMessaging();
    if (!messaging) return false;

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
  try {
    const messaging = await getMessaging();
    if (!messaging) return null;

    const token = await messaging().getToken();
    return token;
  } catch (err) {
    console.warn('[Push] Error obteniendo FCM token:', err.message);
    return null;
  }
}

/**
 * Registrar el token FCM en el backend
 */
export async function registerPushToken() {
  try {
    const messaging = await getMessaging();
    if (!messaging) {
      console.log('[Push] Firebase no configurado, saltando registro de token');
      return false;
    }

    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        console.log('[Push] Permiso de notificaciones denegado');
        return false;
      }
    }

    const token = await getFCMToken();
    if (!token) {
      console.log('[Push] No se pudo obtener el token FCM');
      return false;
    }

    // Verificar si ya registramos este token
    const stored = await _getStoredToken();
    if (stored === token) {
      console.log('[Push] Token ya registrado en el backend');
      return true;
    }

    // Registrar en el backend
    const api = await apiService.createApiClient();
    await api.post('/notifications/token', {
      token,
      platform: Platform.OS,
    });

    // Guardar token registrado localmente
    await _storeToken(token);

    console.log('[Push] Token registrado en el backend exitosamente');
    return true;
  } catch (err) {
    console.warn('[Push] Error registrando token:', err.message);
    return false;
  }
}

/**
 * Eliminar el token FCM del backend (logout)
 */
export async function unregisterPushToken() {
  try {
    const token = await _getStoredToken();
    if (!token) return;

    try {
      const api = await apiService.createApiClient();
      await api.delete('/notifications/token', { data: { token } });
    } catch {
      try {
        const api = await apiService.createApiClient();
        await api.delete('/notifications/tokens');
      } catch {
        // Ignorar errores al desregistrar
      }
    }

    await _clearStoredToken();
    console.log('[Push] Token eliminado del backend');
  } catch (err) {
    console.warn('[Push] Error eliminando token:', err.message);
  }
}

/**
 * Escuchar cuando el token se refresca (Firebase lo rota)
 */
export function onTokenRefresh(callback) {
  try {
    const messagingMod = require('@react-native-firebase/messaging').default;
    return messagingMod().onTokenRefresh(async (newToken) => {
      console.log('[Push] Token refrescado por Firebase');
      try {
        const api = await apiService.createApiClient();
        await api.post('/notifications/token', {
          token: newToken,
          platform: Platform.OS,
        });
        await _storeToken(newToken);
        if (callback) callback(newToken);
      } catch (err) {
        console.warn('[Push] Error re-registrando token refrescado:', err.message);
      }
    });
  } catch {
    // Firebase no disponible, devolver unsubscribe vacio
    return () => {};
  }
}

/**
 * Escuchar mensajes en foreground (app abierta)
 */
export function onForegroundMessage(callback) {
  try {
    const messagingMod = require('@react-native-firebase/messaging').default;
    return messagingMod().onMessage(async (remoteMessage) => {
      console.log('[Push] Mensaje recibido en foreground:', remoteMessage?.notification?.title);
      if (callback) callback(remoteMessage);
    });
  } catch {
    return () => {};
  }
}

/**
 * Obtener la notificacion inicial (app abierta desde notificacion)
 */
export async function getInitialNotification() {
  try {
    const messaging = await getMessaging();
    if (!messaging) return null;
    return messaging().getInitialNotification();
  } catch {
    return null;
  }
}

/**
 * Configurar el handler para background/quit messages
 */
export function setBackgroundMessageHandler() {
  try {
    const messagingMod = require('@react-native-firebase/messaging').default;
    messagingMod().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Push] Mensaje recibido en background:', remoteMessage?.notification?.title);
    });
  } catch {
    // Firebase no disponible, ignorar
  }
}

// ─── HELPERS PARA STORAGE ─────────────────────────────────────────────────

async function _getStoredToken() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(REGISTERED_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function _storeToken(token) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, token);
  } catch {
    // Ignorar
  }
}

async function _clearStoredToken() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem(REGISTERED_TOKEN_KEY);
  } catch {
    // Ignorar
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
