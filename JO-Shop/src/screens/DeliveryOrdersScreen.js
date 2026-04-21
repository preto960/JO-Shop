import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import {formatPrice} from '@utils/helpers';
import theme from '@theme/styles';

// ─── Status Configuration ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  confirmed: {
    label: 'Confirmado',
    color: '#3498DB',
    icon: 'checkmark-circle-outline',
  },
  shipped: {
    label: 'En camino',
    color: '#1ABC9C',
    icon: 'bicycle-outline',
  },
  delivered: {
    label: 'Entregado',
    color: theme.colors.success,
    icon: 'checkmark-done-outline',
  },
};

const FILTER_TABS = [
  {key: 'confirmed', label: 'Por entregar'},
  {key: 'shipped', label: 'En camino'},
  {key: 'delivered', label: 'Entregados'},
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = dateStr => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
};

const normalizeOrderData = raw => {
  const orders = Array.isArray(raw) ? raw : raw.data || [];
  return orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber || order.id,
    customerName:
      order.customerName ||
      order.customer?.name ||
      order.user?.name ||
      'Cliente',
    customerPhone:
      order.customerPhone || order.customer?.phone || order.user?.phone || '',
    address:
      order.customerAddr || order.shippingAddress || order.address || '',
    items: order.items || [],
    totalItems: order.totalItems || order.items?.length || 0,
    total: order.total || 0,
    status: order.status || 'confirmed',
    createdAt: order.createdAt || order.created_at || null,
  }));
};

// ─── Component ────────────────────────────────────────────────────────────────

const DeliveryOrdersScreen = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();

  // Data state
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('confirmed');

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Action state
  const [actionLoading, setActionLoading] = useState(null); // orderId being acted upon

  const flatListRef = useRef(null);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const res = await apiService.fetchOrders({status: activeTab});
        const normalized = normalizeOrderData(res);
        setOrders(normalized);
      } catch (err) {
        setError(
          err?.message || 'Error al cargar los pedidos. Intenta de nuevo.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const handleTabChange = useCallback(
    tabKey => {
      if (tabKey === activeTab) return;
      setActiveTab(tabKey);
      setError(null);
      setOrders([]);
      flatListRef.current?.scrollToOffset({offset: 0, animated: true});
    },
    [activeTab],
  );

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleAcceptOrder = useCallback(
    order => {
      Alert.alert(
        'Aceptar entrega',
        `¿Aceptar la entrega del pedido #${order.id}?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Aceptar',
            onPress: () => handleStatusChange(order.id, 'shipped'),
          },
        ],
      );
    },
    [],
  );

  const handleMarkDelivered = useCallback(
    order => {
      Alert.alert(
        'Confirmar entrega',
        `¿Confirmar que el pedido #${order.id} fue entregado?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Entregado',
            onPress: () => handleStatusChange(order.id, 'delivered'),
          },
        ],
      );
    },
    [],
  );

  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    try {
      setActionLoading(orderId);
      await apiService.updateOrderStatus(orderId, newStatus);

      // Optimistically update or reload
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? {...o, status: newStatus} : o)),
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err?.message || 'No se pudo actualizar el estado del pedido.',
      );
      // Reload to restore correct state
      loadOrders(true);
    } finally {
      setActionLoading(null);
    }
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      `¿Cerrar sesión de ${user?.name || 'la cuenta'}?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Cerrar sesión', style: 'destructive', onPress: () => logout()},
      ],
    );
  }, [user?.name, logout]);

  // ─── Render: Empty State ─────────────────────────────────────────────────

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Icon
            name="alert-circle-outline"
            size={56}
            color={theme.colors.accent}
          />
          <Text style={styles.emptyTitle}>Error al cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadOrders(true)}
            activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const tabConfig = STATUS_CONFIG[activeTab];
    return (
      <View style={styles.emptyContainer}>
        <Icon name="receipt-outline" size={56} color={theme.colors.textLight} />
        <Text style={styles.emptyTitle}>Sin pedidos</Text>
        <Text style={styles.emptyText}>
          No hay pedidos {tabConfig?.label?.toLowerCase() || ''} en este
          momento.
        </Text>
      </View>
    );
  }, [loading, error, activeTab, loadOrders]);

  // ─── Render: Order Card ──────────────────────────────────────────────────

  const renderOrderCard = useCallback(
    ({item}) => {
      const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.confirmed;
      const isActing = actionLoading === item.id;

      return (
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.orderId}>#{item.orderNumber}</Text>
              {item.createdAt && (
                <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: statusInfo.color + '18'},
              ]}>
              <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusBadgeText, {color: statusInfo.color}]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Card Body */}
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Icon
                name="person-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.customerName}
              </Text>
            </View>

            {item.customerPhone ? (
              <View style={styles.infoRow}>
                <Icon
                  name="call-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.customerPhone}
                </Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Icon
                name="location-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.infoText} numberOfLines={2}>
                {item.address || 'Sin dirección'}
              </Text>
            </View>
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <View style={styles.itemsInfo}>
                <Icon
                  name="cube-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.itemsText}>
                  {item.totalItems} producto{item.totalItems !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.totalText}>{formatPrice(item.total)}</Text>
            </View>

            {/* Action Button */}
            {item.status === 'confirmed' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptOrder(item)}
                disabled={isActing}
                activeOpacity={0.8}>
                {isActing ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <Icon name="bicycle-outline" size={16} color={theme.colors.white} />
                    <Text style={styles.actionButtonText}>Aceptar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {item.status === 'shipped' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deliverButton]}
                onPress={() => handleMarkDelivered(item)}
                disabled={isActing}
                activeOpacity={0.8}>
                {isActing ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <Icon
                      name="checkmark-done-outline"
                      size={16}
                      color={theme.colors.white}
                    />
                    <Text style={styles.actionButtonText}>Entregado</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {item.status === 'delivered' && (
              <View style={styles.deliveredBadge}>
                <Icon
                  name="checkmark-done-circle"
                  size={18}
                  color={theme.colors.success}
                />
              </View>
            )}
          </View>
        </View>
      );
    },
    [actionLoading, handleAcceptOrder, handleMarkDelivered],
  );

  // ─── Render: Filter Tabs ─────────────────────────────────────────────────

  const renderFilterTabs = useCallback(() => {
    return (
      <View style={styles.tabsContainer}>
        {FILTER_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = orders.filter(o => o.status === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}>
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && count > 0 && (
                <View style={styles.tabCount}>
                  <Text style={styles.tabCountText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [activeTab, orders, handleTabChange]);

  // ─── Loading Screen ──────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Entregas</Text>
            <Text style={styles.headerSubtitle}>Gestión de entregas</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleLogout}
              hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
              <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>Cargando entregas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Entregas</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} pedido{orders.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleLogout}
            hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Orders List */}
      <FlatList
        ref={flatListRef}
        data={orders}
        keyExtractor={item => String(item.id)}
        renderItem={renderOrderCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          orders.length === 0 ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header (matches AdminProductsScreen pattern)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  headerLeft: {
    width: 40,
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    width: 40,
    justifyContent: 'flex-end',
  },

  // Loading
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  loaderText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

  // Filter Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.inputBg,
    gap: theme.spacing.xs,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.white,
  },
  tabCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  tabCountText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.white,
  },

  // List
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },

  // Empty / Error states
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },

  // Order Card
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardHeaderLeft: {
    gap: 2,
  },
  orderId: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  orderDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },

  // Card Body
  cardBody: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 20,
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  itemsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  itemsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  totalText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.accent,
  },

  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  acceptButton: {
    backgroundColor: '#1ABC9C',
  },
  deliverButton: {
    backgroundColor: theme.colors.success,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
  deliveredBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.success + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DeliveryOrdersScreen;
