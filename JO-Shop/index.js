import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// ─── CRITICAL: Background message handler para FCM ──────────────────────────
// OBLIGATORIO: Debe estar en index.js ANTES de AppRegistry.registerComponent()
// Si esta dentro de un componente React o se importa desde otro archivo que se
// carga tarde, NO funcionara cuando la app esta en background o cerrada (killed).
// ─────────────────────────────────────────────────────────────────────────────

let messaging = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (err) {
  console.warn('[index.js] Firebase Messaging no disponible:', err.message);
}

if (messaging) {
  try {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Push][BG] Handler activado');
      console.log('[Push][BG] Message ID:', remoteMessage?.messageId);
      console.log('[Push][BG] Data:', JSON.stringify(remoteMessage?.data));
      console.log('[Push][BG] Title:', remoteMessage?.notification?.title);
      console.log('[Push][BG] Body:', remoteMessage?.notification?.body);

      // Android muestra automaticamente la notificacion del sistema
      // porque el payload incluye notification.title y notification.body.
      // Aqui NO necesitamos hacer nada - el sistema la muestra por nosotros.
    });
    console.log('[index.js] Background message handler registrado OK');
  } catch (err) {
    console.error('[index.js] Error registrando background handler:', err.message);
  }
}

AppRegistry.registerComponent(appName, () => App);
