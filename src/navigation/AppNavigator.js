import React, {useRef, useEffect} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';
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
import SettingsSectionScreen from '@screens/SettingsSectionScreen';
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
import AdminBatchesScreen from '@screens/AdminBatchesScreen';
import MyOrdersScreen from '@screens/MyOrdersScreen';
import VerificationScreen from '@screens/VerificationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Badge del carrito
const CartBadge = () => {
  const {totalItems} = useCart();
  const {config} = useConfig();
  if (totalItems === 0) return null;
  const badgeColor = config.primary_color || theme.colors.accent;
  return (
    <View style={[styles.badge, {backgroundColor: badgeColor}]}>
      <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
    </View>
  );
};

// ─── Guest Tabs (sin login) ─────────────────────────────────────────────────
const GuestTabs = () => {
  const {config} = useConfig();
  const activeColor = config.primary_color || theme.colors.accent;
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size}) => {
          const icons = {
            Home: 'storefront-outline',
            Cart: 'cart-outline',
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
    </Tab.Navigator>
  );
};

// ─── Customer Tabs (logueado) ───────────────────────────────────────────────
const CustomerTabs = () => {
  const {config} = useConfig();
  const activeColor = config.primary_color || theme.colors.accent;
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: activeColor,
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

// ─── Admin Tabs (Panel + Configuración) ──────────────────────────────────
const AdminTabs = () => {
  const {canViewModule, hasRole} = useAuth();
  const {isMultiStore} = useConfig();
  const {config} = useConfig();
  const activeColor = config.primary_color || theme.colors.accent;

  const tabs = [];

  if (canViewModule('dashboard')) {
    tabs.push({name: 'AdminDashboard', component: AdminDashboardScreen, label: 'Panel', icon: 'grid-outline'});
  }
  if (canViewModule('products')) {
    tabs.push({name: 'AdminProducts', component: AdminProductsScreen, label: 'Productos', icon: 'pricetag-outline'});
  }
  if (canViewModule('batches')) {
    tabs.push({name: 'AdminBatches', component: AdminBatchesScreen, label: 'Lotes', icon: 'layers-outline'});
  }
  if (canViewModule('orders')) {
    tabs.push({name: 'AdminOrders', component: AdminOrdersScreen, label: 'Pedidos', icon: 'receipt-outline'});
  }
  if (tabs.length === 0) {
    tabs.push({name: 'AdminDashboard', component: AdminDashboardScreen, label: 'Panel', icon: 'grid-outline'});
  }

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size}) => {
          const icons = {
            AdminDashboard: 'grid-outline',
            SettingsHub: 'settings-outline',
          };
          return <Icon name={icons[route.name] || 'circle-outline'} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{tabBarLabel: 'Panel'}} />
      <Tab.Screen name="SettingsHub" component={SettingsScreen} options={{tabBarLabel: 'Config'}} />
    </Tab.Navigator>
  );
};

// Pantalla de loading al verificar sesión — usa el loader con borde animado
const LoadingScreen = () => {
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 360,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loaderBox}>
        <Animated.View
          style={[
            styles.loaderBorderWrap,
            {transform: [{rotate: rotateAnim.interpolate({inputRange: [0, 360], outputRange: ['0deg', '360deg']})}]},
          ]}>
          <View style={[styles.loaderBorderSeg, {borderTopColor: '#999'}]} />
          <View style={[styles.loaderBorderSeg, {borderRightColor: '#C0C0C0'}]} />
          <View style={[styles.loaderBorderSeg, {borderBottomColor: '#D8D8D8'}]} />
          <View style={[styles.loaderBorderSeg, {borderLeftColor: '#E0E0E0'}]} />
        </Animated.View>
        <View style={styles.loaderInner}>
          <Text style={styles.loaderText}>JO</Text>
        </View>
      </View>
    </View>
  );
};
// ─── Navegación principal ───────────────────────────────────────────────────
const AppNavigator = () => {
  const {isRestoring, isAuthenticated, hasRole} = useAuth();

  const isStaff = hasRole('admin') || hasRole('editor');

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
        // ─── MODO INVITADO: ver productos sin login ────────────────
        <>
          <Stack.Screen name="GuestTabs" component={GuestTabs} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        </>
      ) : isStaff ? (
        // ─── STAFF (admin/editor) ─────────────────────────────────
        <>
          <Stack.Screen name="AdminMainTabs" component={AdminTabs} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="AdminCategoriesPage" component={AdminCategoriesScreen} />
          <Stack.Screen name="AdminStoresPage" component={AdminStoresScreen} />
          <Stack.Screen name="AdminRolesPage" component={AdminRolesScreen} />
          <Stack.Screen name="AdminUsersPage" component={AdminUsersScreen} />
        </>
      ) : (
        // ─── CLIENTE (logueado) ────────────────────────────────────
        <>
          <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
        </>
      )}
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SettingsSection" component={SettingsSectionScreen} />
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
    backgroundColor: '#FFFFFF',
  },
  loaderBox: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loaderBorderWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  loaderBorderSeg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  loaderInner: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  loaderText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#636E72',
    letterSpacing: -0.5,
  },
});

export default AppNavigator;
