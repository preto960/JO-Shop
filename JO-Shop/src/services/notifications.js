import { Platform } from 'react-native';

// ─── NOTIFICACIONES PUSH (NO-OP) ─────────────────────────────────────────
//
// Este modulo es un placeholder. Las notificaciones push via Firebase Cloud
// Messaging (FCM) estan deshabilitadas hasta que configures tu proyecto de
// Firebase. Cuando estes listo, sigue estos pasos:
//
// 1. Crea un proyecto en https://console.firebase.google.com
// 2. Agrega una app Android con package name "com.joshop"
// 3. Descarga google-services.json y colocalo en android/app/
// 4. En android/build.gradle agrega:
//    classpath("com.google.gms:google-services:4.4.2")
// 5. En android/app/build.gradle agrega:
//    apply plugin: 'com.google.gms.google-services'
//    implementation platform('com.google.firebase:firebase-bom:33.1.2')
//    implementation 'com.google.firebase:firebase-messaging'
// 6. npm install @react-native-firebase/app@18.8.0 @react-native-firebase/messaging@18.8.0
// 7. Reemplaza este archivo con la version completa de Firebase
//    (usa el git history para recuperar la version con Firebase)
//
// Mientras tanto, todas las funciones exportadas son no-ops que retornan
// valores seguros para que el resto de la app funcione normalmente.

/**
 * Solicitar permiso de notificaciones
 * @returns {Promise<boolean>} Siempre false hasta que Firebase este configurado
 */
export async function requestNotificationPermission() {
  console.log('[Push] Firebase no configurado. Las notificaciones push estan deshabilitadas.');
  return false;
}

/**
 * Verificar si las notificaciones estan autorizadas
 * @returns {Promise<boolean>} Siempre false
 */
export async function checkNotificationPermission() {
  return false;
}

/**
 * Obtener el token FCM del dispositivo
 * @returns {Promise<string|null>} Siempre null
 */
export async function getFCMToken() {
  return null;
}

/**
 * Registrar el token FCM en el backend
 * @returns {Promise<boolean>} Siempre false (no se registro)
 */
export async function registerPushToken() {
  console.log('[Push] Firebase no configurado, saltando registro de token');
  return false;
}

/**
 * Eliminar el token FCM del backend (logout)
 */
export async function unregisterPushToken() {
  // No-op
}

/**
 * Escuchar cuando el token se refresca
 * @returns {Function} Unsubscribe vacio
 */
export function onTokenRefresh(callback) {
  return () => {};
}

/**
 * Escuchar mensajes en foreground (app abierta)
 * @returns {Function} Unsubscribe vacio
 */
export function onForegroundMessage(callback) {
  return () => {};
}

/**
 * Obtener la notificacion inicial (app abierta desde notificacion)
 * @returns {Promise<null>}
 */
export async function getInitialNotification() {
  return null;
}

/**
 * Configurar el handler para background/quit messages
 */
export function setBackgroundMessageHandler() {
  // No-op
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
