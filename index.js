import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// ─── OneSignal: Inicializacion del SDK ──────────────────────────────────────
// OBLIGATORIO: Debe ejecutarse ANTES de AppRegistry.registerComponent()
// react-native-onesignal@4.5.4 (SDK OneSignal 5.x)
// ─────────────────────────────────────────────────────────────────────────────

import {LogLevel, OneSignal} from 'react-native-onesignal';

// App ID de JO-Shop en OneSignal
const ONESIGNAL_APP_ID = 'b35bca3a-765f-4854-bd30-d0c66d421c9f';

// Logging: Verbose en dev, Warn en produccion
OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.Warn);

// Inicializar el SDK de OneSignal
OneSignal.initialize(ONESIGNAL_APP_ID);

// Solicitar permisos de notificacion al usuario
OneSignal.Notifications.requestPermission(true);

console.log('[index.js] OneSignal inicializado correctamente');
console.log('[index.js] App ID:', ONESIGNAL_APP_ID);

// ─── Registrar componente principal ─────────────────────────────────────────
AppRegistry.registerComponent(appName, () => App);
