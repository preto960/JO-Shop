import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import {formatPrice} from '@utils/helpers';
import theme from '@theme/styles';

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await apiService.fetchDashboard();
      setStats(data);
    } catch (err) {
      console.error('Error loading dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const statusLabels = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  const statusColors = {
    pending: theme.colors.warning,
    confirmed: '#3498DB',
    preparing: '#9B59B6',
    shipped: '#2ECC71',
    delivered: '#27AE60',
    cancelled: theme.colors.accent,
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      `¿Cerrar sesión de ${user?.name || 'la cuenta'}?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Cerrar sesión', style: 'destructive', onPress: () => logout()},
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Panel Admin</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Panel Admin</Text>
            <Text style={styles.headerSubtitle}>{user?.name || 'Administrador'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
              <Icon name="settings-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} colors={[theme.colors.accent]} />
        }>
        {/* Stats cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="cart-outline" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{stats?.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="cash-outline" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{formatPrice(stats?.totalRevenue || 0)}</Text>
            <Text style={styles.statLabel}>Ingresos</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="today-outline" size={24} color="#3498DB" />
            <Text style={styles.statValue}>{stats?.todayOrders || 0}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="people-outline" size={24} color="#9B59B6" />
            <Text style={styles.statValue}>{stats?.totalCustomers || 0}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminProducts')}
            style={styles.actionCard}
            activeOpacity={0.8}>
            <View style={[styles.actionIcon, {backgroundColor: '#FDE8EC'}]}>
              <Icon name="pricetag-outline" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.actionTitle}>Productos</Text>
            <Text style={styles.actionSub}>{stats?.totalProducts || 0} activos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AdminCategories')}
            style={styles.actionCard}
            activeOpacity={0.8}>
            <View style={[styles.actionIcon, {backgroundColor: '#E8F8F0'}]}>
              <Icon name="folder-outline" size={24} color={theme.colors.success} />
            </View>
            <Text style={styles.actionTitle}>Categorías</Text>
            <Text style={styles.actionSub}>Gestionar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AdminOrders')}
            style={styles.actionCard}
            activeOpacity={0.8}>
            <View style={[styles.actionIcon, {backgroundColor: '#EBF0FA'}]}>
              <Icon name="receipt-outline" size={24} color="#3498DB" />
            </View>
            <Text style={styles.actionTitle}>Pedidos</Text>
            <Text style={styles.actionSub}>{stats?.pendingOrders || 0} pendientes</Text>
          </TouchableOpacity>
        </View>

        {/* Recent orders */}
        <Text style={styles.sectionTitle}>Pedidos recientes</Text>
        <View style={styles.ordersContainer}>
          {(stats?.recentOrders || []).length === 0 ? (
            <Text style={styles.emptyText}>No hay pedidos aún</Text>
          ) : (
            (stats?.recentOrders || []).map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>#{order.id}</Text>
                  <View style={[styles.statusBadge, {backgroundColor: (statusColors[order.status] || '#ccc') + '22'}]}>
                    <Text style={[styles.statusText, {color: statusColors[order.status] || '#666'}]}>
                      {statusLabels[order.status] || order.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderCustomer}>{order.customerName}</Text>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderItems}>
                    {order.totalItems} {order.totalItems === 1 ? 'producto' : 'productos'}
                  </Text>
                  <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: theme.colors.background},
  header: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.inputBg,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE8EC',
  },
  headerTitle: {fontSize: theme.fontSize.title, fontWeight: '700', color: theme.colors.text},
  headerSubtitle: {fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2},
  scrollContent: {padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl},
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {fontSize: theme.fontSize.md, color: theme.colors.textSecondary},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm},
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, alignItems: 'center', ...theme.shadows.sm,
  },
  statValue: {fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, marginTop: 6},
  statLabel: {fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: 2},
  sectionTitle: {
    fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text,
    marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm,
  },
  actionsGrid: {gap: theme.spacing.sm},
  actionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md, padding: theme.spacing.md, ...theme.shadows.sm,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: {fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text, marginLeft: theme.spacing.md, flex: 1},
  actionSub: {fontSize: theme.fontSize.sm, color: theme.colors.textSecondary},
  ordersContainer: {gap: theme.spacing.sm},
  emptyText: {fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: theme.spacing.xl},
  orderCard: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, ...theme.shadows.sm,
  },
  orderHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  orderId: {fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.text},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borderRadius.sm},
  statusText: {fontSize: theme.fontSize.xs, fontWeight: '600'},
  orderCustomer: {fontSize: theme.fontSize.md, color: theme.colors.text},
  orderFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4},
  orderItems: {fontSize: theme.fontSize.sm, color: theme.colors.textSecondary},
  orderTotal: {fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.accent},
});

export default AdminDashboardScreen;
