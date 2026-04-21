import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import {useCart} from '@context/CartContext';
import theme from '@theme/styles';

// Screens
import LoginScreen from '@screens/LoginScreen';
import RegisterScreen from '@screens/RegisterScreen';
import HomeScreen from '@screens/HomeScreen';
import CartScreen from '@screens/CartScreen';
import SettingsScreen from '@screens/SettingsScreen';
import ProductDetailScreen from '@screens/ProductDetailScreen';
import OrderConfirmationScreen from '@screens/OrderConfirmationScreen';
import ProfileScreen from '@screens/ProfileScreen';
import AdminDashboardScreen from '@screens/AdminDashboardScreen';
import AdminProductsScreen from '@screens/AdminProductsScreen';
import AdminCategoriesScreen from '@screens/AdminCategoriesScreen';
import AdminOrdersScreen from '@screens/AdminOrdersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Badge del carrito
const CartBadge = () => {
  const {totalItems} = useCart();
  if (totalItems === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
    </View>
  );
};

// Tabs del cliente
const CustomerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size}) => {
          const icons = {
            Home: 'storefront-outline',
            Cart: 'cart-outline',
            Profile: 'person-outline',
          };
          return <Icon name={icons[route.name] || 'circle-outline'} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{tabBarLabel: 'Inicio'}} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Carrito',
          tabBarIcon: ({color, size}) => (
            <View>
              <Icon name="cart-outline" size={size} color={color} />
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{tabBarLabel: 'Perfil'}} />
    </Tab.Navigator>
  );
};

// Tabs del admin
const AdminTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size}) => {
          const icons = {
            AdminDashboard: 'grid-outline',
            AdminProducts: 'pricetag-outline',
            AdminOrders: 'receipt-outline',
          };
          return <Icon name={icons[route.name] || 'circle-outline'} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{tabBarLabel: 'Dashboard'}} />
      <Tab.Screen name="AdminProducts" component={AdminProductsScreen} options={{tabBarLabel: 'Productos'}} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{tabBarLabel: 'Pedidos'}} />
    </Tab.Navigator>
  );
};

// Pantalla de loading al verificar sesión
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Cargando...</Text>
  </View>
);

// Navegación principal
const AppNavigator = () => {
  const {isLoading, isAuthenticated, isAdmin} = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: theme.colors.background},
      }}>
      {!isAuthenticated ? (
        // No autenticado: Login / Register
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : isAdmin ? (
        // Admin: Dashboard + CRUDs
        <>
          <Stack.Screen name="AdminMainTabs" component={AdminTabs} />
          <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        </>
      ) : (
        // Cliente: Home + Carrito + Perfil
        <>
          <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
        </>
      )}
      <Stack.Screen name="Settings" component={SettingsScreen} />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});

export default AppNavigator;
