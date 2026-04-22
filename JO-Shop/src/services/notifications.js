import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import apiService from '@services/api';

// Clave para guardar el token registrado en el backend
const REGISTERED_TOKEN_KEY = '@joshop_fcm_token';

/**
 * Solicitar permiso de notificaciones al usuario
 */
export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    }

    // Android 13+ necesita permiso explicito
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    }

    // Android < 13 no necesita permiso explicito
    return true;
  } catch (err) {
    console.error('[Push] Error solicitando permiso:', err.message);
    return false;
  }
}

/**
 * Verificar si las notificaciones estan autorizadas
 */
export async function checkNotificationPermission() {
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
  try {
    // Deshabilitar auto-init para evitar token no autorizado
    await messaging().setAutoInitEnabled(true);

    const token = await messaging().getToken();
    return token;
  } catch (err) {
    console.error('[Push] Error obteniendo FCM token:', err.message);
    return null;
  }
}

/**
 * Registrar el token FCM en el backend
 */
export async function registerPushToken() {
  try {
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
    console.error('[Push] Error registrando token:', err.message);
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
      // Si falla (ej. 401), eliminar todos los tokens del usuario
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
    console.error('[Push] Error eliminando token:', err.message);
  }
}

/**
 * Escuchar cuando el token se refresca (Firebase lo rota)
 */
export function onTokenRefresh(callback) {
  return messaging().onTokenRefresh(async (newToken) => {
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
      console.error('[Push] Error re-registrando token refrescado:', err.message);
    }
  });
}

/**
 * Escuchar mensajes en foreground (app abierta)
 */
export function onForegroundMessage(callback) {
  return messaging().onMessage(async (remoteMessage) => {
    console.log('[Push] Mensaje recibido en foreground:', remoteMessage?.notification?.title);
    if (callback) callback(remoteMessage);
  });
}

/**
 * Obtener la notificacion inicial (app abierta desde notificacion)
 */
export async function getInitialNotification() {
  return messaging().getInitialNotification();
}

/**
 * Configurar el handler para background/quit messages
 */
export function setBackgroundMessageHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[Push] Mensaje recibido en background:', remoteMessage?.notification?.title);
    // No se puede mostrar UI aqui, pero se pueden hacer tareas en background
  });
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
