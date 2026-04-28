import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import {useCart} from '@context/CartContext';
import {useConfig} from '@context/ConfigContext';
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
import AdminRolesScreen from '@screens/AdminRolesScreen';
import AdminUsersScreen from '@screens/AdminUsersScreen';
import AdminStoresScreen from '@screens/AdminStoresScreen';
import DeliveryOrdersScreen from '@screens/DeliveryOrdersScreen';
import MyOrdersScreen from '@screens/MyOrdersScreen';
import VerificationScreen from '@screens/VerificationScreen';

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
            MyOrders: 'receipt-outline',
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
      <Tab.Screen name="MyOrders" component={MyOrdersScreen} options={{tabBarLabel: 'Pedidos'}} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{tabBarLabel: 'Perfil'}} />
    </Tab.Navigator>
  );
};

// Tabs del admin - dinámicos según permisos
const AdminTabs = () => {
  const {canViewModule, hasPermission, hasRole} = useAuth();

  // Determinar qué tabs mostrar según permisos
  const tabs = [];

  if (canViewModule('dashboard')) {
    tabs.push({
      name: 'AdminDashboard',
      component: AdminDashboardScreen,
      label: 'Panel',
      icon: 'grid-outline',
    });
  }

  if (canViewModule('products')) {
    tabs.push({
      name: 'AdminProducts',
      component: AdminProductsScreen,
      label: 'Productos',
      icon: 'pricetag-outline',
    });
  }

  if (canViewModule('categories')) {
    tabs.push({
      name: 'AdminCategories',
      component: AdminCategoriesScreen,
      label: 'Categorías',
      icon: 'folder-outline',
    });
  }

  // Stores tab: only show in multi-store mode for admin or users with stores permission
  const {isMultiStore} = useConfig();
  if (isMultiStore && (hasRole('admin') || canViewModule('stores'))) {
    tabs.push({
      name: 'AdminStores',
      component: AdminStoresScreen,
      label: 'Tiendas',
      icon: 'storefront-outline',
    });
  }

  if (canViewModule('orders')) {
    tabs.push({
      name: 'AdminOrders',
      component: AdminOrdersScreen,
      label: 'Pedidos',
      icon: 'receipt-outline',
    });
  }

  if (hasRole('admin') || canViewModule('users')) {
    tabs.push({
      name: 'AdminRoles',
      component: AdminRolesScreen,
      label: 'Roles',
      icon: 'shield-outline',
    });
  }

  // Users tab only for admin
  if (hasRole('admin')) {
    tabs.push({
      name: 'AdminUsers',
      component: AdminUsersScreen,
      label: 'Usuarios',
      icon: 'people-outline',
    });
  }

  // Si no hay tabs visibles, al menos mostrar dashboard
  if (tabs.length === 0) {
    tabs.push({
      name: 'AdminDashboard',
      component: AdminDashboardScreen,
      label: 'Panel',
      icon: 'grid-outline',
    });
  }

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size}) => {
          const tab = tabs.find(t => t.name === route.name);
          return <Icon name={tab?.icon || 'circle-outline'} size={size} color={color} />;
        },
      })}>
      {tabs.map(tab => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} options={{tabBarLabel: tab.label}} />
      ))}
    </Tab.Navigator>
  );
};

// Tabs del delivery - solo entregas
const DeliveryTabs = () => {
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
            DeliveryOrders: 'bicycle-outline',
            DeliveryProfile: 'person-outline',
          };
          return <Icon name={icons[route.name] || 'circle-outline'} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="DeliveryOrders" component={DeliveryOrdersScreen} options={{tabBarLabel: 'Entregas'}} />
      <Tab.Screen name="DeliveryProfile" component={ProfileScreen} options={{tabBarLabel: 'Perfil'}} />
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
  const {isLoading, isRestoring, isAuthenticated, isAdmin, hasRole} = useAuth();

  // Verificar si el usuario tiene algún permiso de admin (o rol admin)
  const isStaff = hasRole('admin') || hasRole('editor');
  const isDelivery = hasRole('delivery');

  if (isRestoring) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? 'auth' : 'guest'}
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
      ) : isDelivery ? (
        // Delivery: solo gestión de entregas
        <>
          <Stack.Screen name="DeliveryMainTabs" component={DeliveryTabs} />
        </>
      ) : isStaff ? (
        // Staff (admin/editor): Panel + CRUDs con permisos
        <>
          <Stack.Screen name="AdminMainTabs" component={AdminTabs} />
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
      <Stack.Screen name="Verification" component={VerificationScreen} />
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
