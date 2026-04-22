import React, {createRef, useEffect, useState} from 'react';
import {StatusBar, StyleSheet, View, Alert} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from '@navigation/AppNavigator';
import {AuthProvider, useAuth} from '@context/AuthContext';
import {CartProvider} from '@context/CartContext';
import theme from '@theme/styles';
import pushNotifications from '@services/notifications';

// Ref de navegacion accesible fuera del componente
export const navigationRef = createRef();

// Componente que maneja notificaciones push
const NotificationHandler = () => {
  const {isAuthenticated} = useAuth();
  const [initialNotification, setInitialNotification] = useState(null);

  // Configurar handler para mensajes en background (se llama una vez)
  useEffect(() => {
    pushNotifications.setBackgroundMessageHandler();
  }, []);

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
    if (data) {
      // Navegar a la pantalla correspondiente segun el tipo
      setTimeout(() => {
        if (data.screen === 'DeliveryOrders') {
          navigationRef.current?.navigate('DeliveryOrders');
        } else if (data.screen === 'MyOrders') {
          navigationRef.current?.navigate('MyOrders');
        } else if (data.screen === 'AdminOrders') {
          navigationRef.current?.navigate('AdminOrders');
        }
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
        Alert.alert(
          notification.title || 'JO-Shop',
          notification.body || '',
          [
            {
              text: 'Ver',
              onPress: () => {
                if (data?.screen) {
                  navigationRef.current?.navigate(data.screen);
                }
              },
            },
            {text: 'Cerrar', style: 'cancel'},
          ],
        );
      }
    });

    return unsubscribe;
  }, [isAuthenticated]);

  return null;
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
