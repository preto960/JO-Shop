import React, {createRef, useEffect, useState, useCallback} from 'react';
import {StatusBar, StyleSheet, View, DeviceEventEmitter} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from '@navigation/AppNavigator';
import {AuthProvider, useAuth} from '@context/AuthContext';
import {CartProvider} from '@context/CartContext';
import theme from '@theme/styles';
import pushNotifications from '@services/notifications';
import ConfirmModal from '@components/ConfirmModal';

// OneSignal: import para obtener la notificacion inicial
import OneSignal from 'react-native-onesignal';

// Ref de navegacion accesible fuera del componente
export const navigationRef = createRef();

// ─── Mapeo de pantallas: nombre logico → ruta de navegacion real ──────────
// Las pantallas estan dentro de Tab Navigators anidados, asi que necesitamos
// navegar al parent + screen hijo.
const SCREEN_ROUTES = {
  DeliveryOrders: { parent: 'DeliveryMainTabs', screen: 'DeliveryOrders' },
  DeliveryProfile: { parent: 'DeliveryMainTabs', screen: 'DeliveryProfile' },
  MyOrders:        { parent: 'CustomerTabs',    screen: 'MyOrders' },
  Home:            { parent: 'CustomerTabs',    screen: 'Home' },
  Cart:            { parent: 'CustomerTabs',    screen: 'Cart' },
  Profile:         { parent: 'CustomerTabs',    screen: 'Profile' },
  AdminDashboard:  { parent: 'AdminMainTabs',   screen: 'AdminDashboard' },
  AdminOrders:     { parent: 'AdminMainTabs',   screen: 'AdminOrders' },
  AdminProducts:   { parent: 'AdminMainTabs',   screen: 'AdminProducts' },
  AdminCategories: { parent: 'AdminMainTabs',   screen: 'AdminCategories' },
  AdminUsers:      { parent: 'AdminMainTabs',   screen: 'AdminUsers' },
  AdminRoles:      { parent: 'AdminMainTabs',   screen: 'AdminRoles' },
};

/**
 * Navegar a una pantalla por nombre logico.
 * Maneja correctamente navegadores anidados (tabs dentro de stacks).
 * @param {string} screenName - Nombre logico de la pantalla
 * @param {object} params - Parametros a pasar (orderId, type, etc.)
 */
function navigateToScreen(screenName, params = {}) {
  const route = SCREEN_ROUTES[screenName];
  const nav = navigationRef.current;
  if (!nav) {
    console.warn('[Navigation] navigationRef.current es null, no se puede navegar a', screenName);
    return;
  }

  // Verificar que el navigator tenga un estado valido (listo para navegar)
  if (!nav.getRootState || !nav.getRootState().routes || nav.getRootState().routes.length === 0) {
    console.warn('[Navigation] Navigator no esta listo aun, reintentando en 300ms...');
    setTimeout(() => navigateToScreen(screenName, params), 300);
    return;
  }

  if (route) {
    // Navegar al tab navigator padre + screen hijo con params
    console.log('[Navigation] Navegando a', route.parent, '->', route.screen, 'params:', JSON.stringify(params));
    nav.navigate(route.parent, { screen: route.screen, params });
  } else {
    // Fallback: intentar navegacion directa con params
    console.log('[Navigation] Navegando directo a', screenName, 'params:', JSON.stringify(params));
    nav.navigate(screenName, params);
  }
}

// Componente que maneja notificaciones push
const NotificationHandler = () => {
  const {isAuthenticated} = useAuth();
  const [initialNotification, setInitialNotification] = useState(null);

  // Estado para el modal de notificacion foreground
  const [notifModal, setNotifModal] = useState({
    visible: false,
    title: '',
    message: '',
    data: null,
  });

  const showNotifModal = useCallback((title, message, data) => {
    setNotifModal({visible: true, title, message, data});
  }, []);

  // Registrar callback para que el modulo de notificaciones pueda usarlo
  useEffect(() => {
    pushNotifications.setForegroundCallback(showNotifModal);
  }, [showNotifModal]);

  // ─── OneSignal: Handler para notificacion abierta (click) ────────────
  // Maneja tanto la notificacion inicial (app abierta desde notificacion)
  // como las notificaciones abiertas mientras la app esta en foreground
  useEffect(() => {
    const clickHandler = (event) => {
      const notification = event.notification;
      const additionalData = notification?.additionalData || {};

      console.log('[App] Notificacion OneSignal abierta');
      console.log('[App] Screen:', additionalData.screen);
      console.log('[App] Data:', JSON.stringify(additionalData));

      const notifData = {
        data: additionalData,
        notification: {
          title: notification?.title,
          body: notification?.body,
        },
      };

      // Si la app ya esta autenticada, navegar directamente
      if (isAuthenticated && additionalData?.screen) {
        navigateToScreen(additionalData.screen, additionalData);
      } else {
        // Si no esta autenticada, guardar para navegar despues del login
        setInitialNotification(notifData);
      }
    };

    OneSignal.Notifications.addEventListener('click', clickHandler);

    return () => {
      OneSignal.Notifications.removeEventListener('click', clickHandler);
    };
  }, [isAuthenticated]);

  // Navegar al abrir la app desde notificacion (despues de autenticacion)
  useEffect(() => {
    if (!isAuthenticated || !initialNotification) return;

    const {data} = initialNotification;
    if (data?.screen) {
      console.log('[App] Navegando desde notificacion inicial a:', data.screen, 'con data:', JSON.stringify(data));
      // Esperar 800ms para asegurar que NavigationContainer esta listo
      const timer = setTimeout(() => {
        navigateToScreen(data.screen, data);
        setInitialNotification(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, initialNotification]);

  // Escuchar mensajes en foreground (app abierta)
  // onForegroundMessage esta adaptado para emitir eventos en formato Firebase-compatible
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = pushNotifications.onForegroundMessage(async (remoteMessage) => {
      const data = remoteMessage?.data || {};
      const title = data.title || remoteMessage?.notification?.title || 'JO-Shop';
      const body = data.body || remoteMessage?.notification?.body || '';

      if (title || body) {
        showNotifModal(title, body, data);
        // Emitir evento para que las pantallas refresquen sus datos
        DeviceEventEmitter.emit('pushNotificationReceived', data);
      }
    });

    return unsubscribe;
  }, [isAuthenticated, showNotifModal]);

  // Manejar accion del modal de notificacion
  const handleNotifClose = useCallback(() => {
    setNotifModal(prev => ({...prev, visible: false}));
  }, []);

  const handleNotifConfirm = useCallback(() => {
    const {data} = notifModal;
    setNotifModal(prev => ({...prev, visible: false}));
    if (data?.screen) {
      // Emitir evento para que la pantalla destino reaccione (expandir, highlight, etc.)
      DeviceEventEmitter.emit('pushNotificationAction', data);
      navigateToScreen(data.screen, data);
    }
  }, [notifModal]);

  return (
    <>
      <ConfirmModal
        visible={notifModal.visible}
        onClose={handleNotifClose}
        onConfirm={handleNotifConfirm}
        title={notifModal.title}
        message={notifModal.message}
        confirmText="Ver"
        cancelText="Cerrar"
        type="confirm"
        icon="notifications"
      />
    </>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationContainer
            ref={navigationRef}
            theme={{
              dark: false,
              colors: {
                primary: theme.colors.accent,
                background: theme.colors.background,
                card: theme.colors.card,
                text: theme.colors.text,
                border: theme.colors.border,
                notification: theme.colors.accent,
              },
            }}>
            <View style={styles.container}>
              <StatusBar
                barStyle="dark-content"
                backgroundColor={theme.colors.white}
                translucent={false}
              />
              <NotificationHandler />
              <AppNavigator />
            </View>
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default App;
