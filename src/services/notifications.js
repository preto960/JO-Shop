// ─── Servicio de Notificaciones (OneSignal) ──────────────────────────────────
// Migrado desde Firebase Messaging + Notifee a react-native-onesignal@4.5.4
//
// Este archivo mantiene la MISMA API que el anterior (Firebase) para que
// AuthContext.js y App.js funcionen sin cambios. Solo cambia la implementacion.
//
// Con OneSignal el flujo es:
//   1. index.js inicializa el SDK y pide permisos
//   2. Al hacer login, AuthContext llama registerPushToken() que hace OneSignal.login(userId)
//   3. Al hacer logout, AuthContext llama unregisterPushToken() que hace OneSignal.logout()
//   4. Las notificaciones llegan automaticamente via OneSignal (no necesita FCM)
//   5. setForegroundCallback + onForegroundMessage siguen funcionando para el modal

import {Platform} from 'react-native';
import apiService from '@services/api';
import OneSignal from 'react-native-onesignal';

// ─── OneSignal esta siempre disponible despues de la instalacion ─────────────
const isOneSignalAvailable = () => true;

// ─── CALLBACK PARA NOTIFICACIONES FOREGROUND ──────────────────────
// App.js registra un callback aqui para mostrar el modal de notificacion
let _foregroundCallback = null;

export function setForegroundCallback(callback) {
  _foregroundCallback = callback;
}

// ─── Funciones publicas (mantienen la misma API que Firebase) ──────────────

/**
 * Solicitar permiso de notificaciones.
 * Con OneSignal, los permisos ya se solicitaron en index.js.
 * Esta funcion es un no-op que retorna true para compatibilidad.
 */
export async function requestNotificationPermission() {
  try {
    const permissionStatus = await OneSignal.Notifications.getPermissionAsync();
    const enabled = permissionStatus === 'authorized' || permissionStatus === 'provisional';
    console.log('[Push] Permisos OneSignal:', enabled ? 'OTORGADOS' : 'DENEGADOS');
    return enabled;
  } catch (error) {
    console.error('[Push] Error verificando permisos:', error.message);
    return false;
  }
}

/**
 * Verificar si las notificaciones estan autorizadas
 */
export async function checkNotificationPermission() {
  try {
    const permissionStatus = await OneSignal.Notifications.getPermissionAsync();
    return permissionStatus === 'authorized' || permissionStatus === 'provisional';
  } catch {
    return false;
  }
}

/**
 * Obtener el ID del dispositivo en OneSignal (equivalente al FCM token).
 * NOTA: Con OneSignal no necesitas enviar este token al backend.
 * OneSignal.login(userId) ya asocia el dispositivo al usuario.
 */
export async function getFCMToken() {
  try {
    const deviceId = await OneSignal.User.getOnesignalId();
    return deviceId;
  } catch (error) {
    console.error('[Push] Error obteniendo OneSignal ID:', error.message);
    return null;
  }
}

/**
 * Registrar el dispositivo con OneSignal y el usuario en el backend.
 * Con OneSignal, llamamos OneSignal.login(userId) para asociar el dispositivo.
 * Tambien enviamos el player_id al backend por referencia/debugging.
 */
export async function registerPushToken() {
  try {
    // Obtener el userId del AuthContext (via el token actual en apiService)
    const api = await apiService.createApiClient();
    if (!api) {
      console.log('[Push] No hay conexion al servidor');
      return false;
    }

    // Obtener el perfil para saber el userId
    let userId = null;
    try {
      const profile = await api.get('/auth/me');
      userId = profile?.id;
    } catch {
      console.log('[Push] No se pudo obtener el perfil del usuario');
      return false;
    }

    if (!userId) {
      console.log('[Push] No hay userId disponible');
      return false;
    }

    // Asociar el dispositivo con el usuario en OneSignal
    OneSignal.login(String(userId));
    console.log('[Push] OneSignal.login() exitoso para user', userId);

    // Obtener el player_id y enviarlo al backend como referencia
    try {
      const playerId = await OneSignal.User.getOnesignalId();
      if (playerId) {
        await api.post('/notifications/token', {
          token: playerId,
          platform: Platform.OS,
        });
        console.log('[Push] Player ID registrado en backend:', playerId?.substring(0, 20) + '...');
      }
    } catch (err) {
      console.warn('[Push] Error registrando player ID en backend (no critico):', err.message);
    }

    return true;
  } catch (error) {
    console.error('[Push] Error en registerPushToken:', error.message);
    return false;
  }
}

/**
 * Desasociar el dispositivo del usuario (logout).
 * Llama OneSignal.logout() para romper la asociacion.
 */
export async function unregisterPushToken() {
  try {
    OneSignal.logout();
    console.log('[Push] OneSignal.logout() exitoso');

    // Tambien eliminar el token del backend
    try {
      const api = await apiService.createApiClient();
      if (api) {
        const playerId = await OneSignal.User.getOnesignalId();
        if (playerId) {
          await api.delete('/notifications/token', {data: {token: playerId}});
        }
      }
    } catch {
      // No critico
    }
  } catch (error) {
    console.error('[Push] Error en unregisterPushToken:', error.message);
  }
}

/**
 * Escuchar cuando el token cambia (compatibilidad con Firebase onTokenRefresh).
 * Con OneSignal los tokens se manejan internamente, pero emitimos el evento
 * para mantener compatibilidad con AuthContext.
 */
export function onTokenRefresh(callback) {
  // OneSignal maneja tokens internamente. Retornamos unsubscribe vacio.
  return () => {};
}

/**
 * Escuchar mensajes en foreground (app abierta).
 * Convierte el evento de OneSignal al formato que App.js espera.
 */
export function onForegroundMessage(callback) {
  // Handler para notificaciones en foreground
  const handler = (event) => {
    const notification = event.notification;
    const additionalData = notification?.additionalData || {};

    // Convertir al formato que App.js espera (simula un remoteMessage de Firebase)
    const remoteMessage = {
      data: {
        title: notification?.title || 'JO-Shop',
        body: notification?.body || '',
        ...additionalData,
      },
      notification: {
        title: notification?.title,
        body: notification?.body,
      },
    };

    // Llamar al callback de App.js
    if (callback) {
      callback(remoteMessage);
    }
  };

  OneSignal.Notifications.addEventListener('foregroundWillDisplay', handler);

  // Retornar funcion de cleanup
  return () => {
    OneSignal.Notifications.removeEventListener('foregroundWillDisplay', handler);
  };
}

/**
 * Obtener la notificacion inicial (app abierta desde notificacion).
 * Con OneSignal, usamos el evento 'click' para capturar la notificacion que
 * abrio la app desde estado cerrado/background.
 */
export async function getInitialNotification() {
  try {
    // OneSignal no tiene un getInitialNotification directo como Firebase.
    // La notificacion inicial se maneja via el evento 'click' en App.js.
    // Retornamos null y App.js usa el evento click como fuente principal.
    return null;
  } catch {
    return null;
  }
}

/**
 * Verificar si OneSignal esta disponible (compatibilidad con isFirebaseAvailable).
 */
export const isFirebaseAvailable = isOneSignalAvailable;

/**
 * Crear canal de notificaciones (compatibilidad).
 * Con OneSignal no es necesario crear canales manualmente.
 */
export async function ensureNotificationChannel() {
  console.log('[Push] OneSignal maneja los canales automaticamente');
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
  setForegroundCallback,
  isFirebaseAvailable,
  ensureNotificationChannel,
};
