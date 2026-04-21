import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import {useCart} from '@context/CartContext';
import theme from '@theme/styles';

// Pantallas
import HomeScreen from '@screens/HomeScreen';
import CartScreen from '@screens/CartScreen';
import SettingsScreen from '@screens/SettingsScreen';
import ProductDetailScreen from '@screens/ProductDetailScreen';
import OrderConfirmationScreen from '@screens/OrderConfirmationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Iconos de tabs
const tabIcons = {
  Home: 'storefront-outline',
  Cart: 'cart-outline',
  Settings: 'settings-outline',
};

const tabIconsActive = {
  Home: 'storefront',
  Cart: 'cart',
  Settings: 'settings',
};

// Componente para badge del carrito
const CartBadge = () => {
  const {totalItems} = useCart();
  if (totalItems === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {totalItems > 99 ? '99+' : totalItems}
      </Text>
    </View>
  );
};

// Navegación por tabs
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size}) => (
          <View>
            <Icon
              name={tabIcons[route.name]}
              size={size}
              color={color}
            />
            {route.name === 'Cart' && <CartBadge />}
          </View>
        ),
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Carrito',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ajustes',
        }}
      />
    </Tab.Navigator>
  );
};

// Navegación principal (stack)
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: theme.colors.background},
      }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    height: 60,
    paddingTop: 6,
    paddingBottom: 8,
    ...theme.shadows.sm,
  },
  tabLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AppNavigator;
