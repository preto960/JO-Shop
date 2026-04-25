import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// ─── OneSignal: Inicializacion del SDK ──────────────────────────────────────
// OBLIGATORIO: Debe ejecutarse ANTES de AppRegistry.registerComponent()
// react-native-onesignal@4.5.4 (SDK OneSignal 5.x)
// ─────────────────────────────────────────────────────────────────────────────

import OneSignal from 'react-native-onesignal';

// App ID de JO-Shop en OneSignal
const ONESIGNAL_APP_ID = 'b35bca3a-765f-4854-bd30-d0c66d421c9f';

// Wrapper seguro: evita crashes si el modulo nativo no esta listo
const safeInit = () => {
  try {
    if (!OneSignal) {
      console.warn('[index.js] OneSignal no disponible, la app iniciara sin push');
      return;
    }

    // Logging
    if (OneSignal.Debug && OneSignal.LOG_LEVELS) {
      OneSignal.Debug.setLogLevel(__DEV__ ? OneSignal.LOG_LEVELS.VERBOSE : OneSignal.LOG_LEVELS.WARN);
    }

    // Inicializar SDK
    if (OneSignal.initialize) {
      OneSignal.initialize(ONESIGNAL_APP_ID);
      console.log('[index.js] OneSignal SDK inicializado');
    }

    // Solicitar permisos (puede no estar disponible inmediatamente)
    if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) {
      OneSignal.Notifications.requestPermission(true);
    }
  } catch (err) {
    console.warn('[index.js] Error inicializando OneSignal:', err.message);
  }
};

safeInit();

// ─── Registrar componente principal ─────────────────────────────────────────
AppRegistry.registerComponent(appName, () => App);
