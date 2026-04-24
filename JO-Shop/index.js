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

let notifee = null;
let AndroidImportance = null;
try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default;
  AndroidImportance = notifeeModule.AndroidImportance;
} catch (err) {
  console.warn('[index.js] Notifee no disponible:', err.message);
}

// Valor numerico de Android importance HIGH (4) como fallback
const IMPORTANCE_HIGH = AndroidImportance?.HIGH || 4;

// ID del canal de notificaciones
const CHANNEL_ID = 'joshop_orders';

// Crear canal de notificaciones con notifee (Android 8+)
async function ensureNotificationChannel() {
  if (!notifee) return;
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Pedidos JO-Shop',
      description: 'Notificaciones de nuevos pedidos, actualizaciones y entregas',
      importance: IMPORTANCE_HIGH,
    });
    console.log('[index.js] Canal de notificaciones creado:', CHANNEL_ID);
  } catch (err) {
    console.warn('[index.js] Error creando canal:', err.message);
  }
}

if (messaging) {
  try {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Push][BG] Handler activado');
      console.log('[Push][BG] Message ID:', remoteMessage?.messageId);
      console.log('[Push][BG] Data:', JSON.stringify(remoteMessage?.data));

      // ─── Leer title/body desde data (data-only messages) ──────────────
      // El backend envia solo data (sin notification:{}).
      // title y body estan dentro de remoteMessage.data.
      const data = remoteMessage?.data || {};
      const title = data.title || 'JO-Shop';
      const body = data.body || 'Tienes una nueva notificacion';
      const messageId = remoteMessage?.messageId || Date.now().toString();

      console.log('[Push][BG] Title:', title);
      console.log('[Push][BG] Body:', body);

      // ─── Mostrar notificacion del sistema con notifee ───────────────────
      // Esto garantiza que la notificacion SIEMPRE se muestre.
      if (notifee) {
        try {
          await ensureNotificationChannel();

          await notifee.displayNotification({
            id: `joshop_${messageId}`,
            title,
            body,
            data,
            android: {
              channelId: CHANNEL_ID,
              smallIcon: 'ic_launcher',
              pressAction: {
                id: 'default',
                launchActivity: 'com.joshop.MainActivity',
              },
              tag: data.notifTag || data.type || 'default',
              importance: IMPORTANCE_HIGH,
              autoCancel: true,
              showTimestamp: true,
            },
          });

          console.log('[Push][BG] Notificacion del sistema mostrada con notifee');
        } catch (notifErr) {
          console.error('[Push][BG] Error mostrando notificacion con notifee:', notifErr.message);
        }
      } else {
        console.warn('[Push][BG] Notifee no disponible, la notificacion del sistema puede no mostrarse');
      }
    });
    console.log('[index.js] Background message handler registrado OK (con notifee)');
  } catch (err) {
    console.error('[index.js] Error registrando background handler:', err.message);
  }
}

AppRegistry.registerComponent(appName, () => App);
