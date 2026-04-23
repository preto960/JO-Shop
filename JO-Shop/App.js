import React, {createRef, useEffect, useState, useCallback} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from '@navigation/AppNavigator';
import {AuthProvider, useAuth} from '@context/AuthContext';
import {CartProvider} from '@context/CartContext';
import theme from '@theme/styles';
import pushNotifications from '@services/notifications';
import ConfirmModal from '@components/ConfirmModal';

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
 */
function navigateToScreen(screenName) {
  const route = SCREEN_ROUTES[screenName];
  const nav = navigationRef.current;
  if (!nav) return;

  if (route) {
    // Navegar al tab navigator padre + screen hijo
    nav.navigate(route.parent, { screen: route.screen, params: {} });
  } else {
    // Fallback: intentar navegacion directa
    nav.navigate(screenName);
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
    screen: null,
  });

  const showNotifModal = useCallback((title, message, screen) => {
    setNotifModal({visible: true, title, message, screen});
  }, []);

  // Registrar callback para que el modulo de notificaciones pueda usarlo
  useEffect(() => {
    pushNotifications.setForegroundCallback(showNotifModal);
  }, [showNotifModal]);

  // Manejar notificacion al abrir la app desde estado cerrado/background
  useEffect(() => {
    const handleInitialNotification = async () => {
      const notif = await pushNotifications.getInitialNotification();
      if (notif) {
        setInitialNotification(notif);
      }
    };
    handleInitialNotification();
  }, []);

  // Navegar al abrir la app desde notificacion (despues de autenticacion)
  useEffect(() => {
    if (!isAuthenticated || !initialNotification) return;

    const {data} = initialNotification;
    if (data?.screen) {
      setTimeout(() => {
        navigateToScreen(data.screen);
        setInitialNotification(null);
      }, 500);
    }
  }, [isAuthenticated, initialNotification]);

  // Escuchar mensajes en foreground (app abierta)
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = pushNotifications.onForegroundMessage(async (remoteMessage) => {
      const {notification, data} = remoteMessage;
      if (notification) {
        showNotifModal(
          notification.title || 'JO-Shop',
          notification.body || '',
          data?.screen || null,
        );
      }
    });

    return unsubscribe;
  }, [isAuthenticated, showNotifModal]);

  // Manejar accion del modal de notificacion
  const handleNotifClose = useCallback(() => {
    setNotifModal(prev => ({...prev, visible: false}));
  }, []);

  const handleNotifConfirm = useCallback(() => {
    const {screen} = notifModal;
    setNotifModal(prev => ({...prev, visible: false}));
    if (screen) {
      navigateToScreen(screen);
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
