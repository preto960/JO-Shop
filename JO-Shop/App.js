import React from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from '@navigation/AppNavigator';
import {AuthProvider} from '@context/AuthContext';
import {CartProvider} from '@context/CartContext';
import theme from '@theme/styles';

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationContainer
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
