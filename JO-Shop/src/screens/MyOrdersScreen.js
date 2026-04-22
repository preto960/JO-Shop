import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService from '@services/api';
import {formatPrice} from '@utils/helpers';
import theme from '@theme/styles';
import ConfirmModal from '@components/ConfirmModal';

// ─── Status Configuration ─────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: theme.colors.warning,
    bgColor: theme.colors.warning + '15',
    icon: 'time-outline',
    description: 'Tu pedido fue recibido y está esperando confirmación.',
  },
  confirmed: {
    label: 'Confirmado',
    color: '#3498DB',
    bgColor: '#3498DB15',
    icon: 'checkmark-circle-outline',
    description: 'Tu pedido fue confirmado, esperando un repartidor.',
  },
  preparing: {
    label: 'Preparando',
    color: '#9B59B6',
    bgColor: '#9B59B615',
    icon: 'restaurant-outline',
    description: 'Tu pedido está siendo preparado.',
  },
  shipped: {
    label: 'En camino',
    color: '#1ABC9C',
    bgColor: '#1ABC9C15',
    icon: 'bicycle-outline',
    description: 'Tu pedido va en camino. ¡Pronto llegará!',
  },
  delivered: {
    label: 'Entregado',
    color: theme.colors.success,
    bgColor: theme.colors.success + '15',
    icon: 'checkmark-done-circle',
    description: 'Tu pedido fue entregado exitosamente.',
  },
  cancelled: {
    label: 'Cancelado',
    color: theme.colors.accent,
    bgColor: theme.colors.accent + '15',
    icon: 'close-circle-outline',
    description: 'Este pedido fue cancelado.',
  },
};

const FILTER_TABS = [
  {key: 'all', label: 'Todos'},
  {key: 'active', label: 'Activos'},
  {key: 'completed', label: 'Completados'},
];

// ─── Helpers ───────────────────────────────────────────────────────────────

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

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

const getStatusStep = status => {
  const idx = STATUS_STEPS.indexOf(status);
  return idx >= 0 ? idx : 0;
};

// ─── Component ────────────────────────────────────────────────────────────

const MyOrdersScreen = () => {
  const navigation = useNavigation();

  // Data state
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Modal state
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'Aceptar',
    onConfirm: null,
  });

  const flatListRef = useRef(null);

  // ─── Data Loading ─────────────────────────────────────────────────────

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const res = await apiService.fetchOrders();
        const allOrders = Array.isArray(res) ? res : res?.data || [];

        // Filter based on tab
        let filtered = allOrders;
        if (activeTab === 'active') {
          filtered = allOrders.filter(o =>
            ['pending', 'confirmed', 'preparing', 'shipped'].includes(o.status),
          );
        } else if (activeTab === 'completed') {
          filtered = allOrders.filter(o =>
            ['delivered', 'cancelled'].includes(o.status),
          );
        }

        // Normalize data
        const normalized = filtered.map(order => ({
          id: order.id,
          orderNumber: order.id,
          customerName: order.customerName || 'Cliente',
          customerAddr: order.customerAddr || order.address || '',
          items: order.items || [],
          totalItems: order.totalItems || order.items?.length || 0,
          total: order.total || 0,
          status: order.status || 'pending',
          createdAt: order.createdAt || null,
          delivery: order.delivery || null,
        }));

        // Sort by newest first
        normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setOrders(normalized);
      } catch (err) {
        setError(err?.message || 'Error al cargar tus pedidos.');
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
      setExpandedOrder(null);
      flatListRef.current?.scrollToOffset({offset: 0, animated: true});
    },
    [activeTab],
  );

  const toggleExpand = useCallback(
    orderId => {
      setExpandedOrder(prev => (prev === orderId ? null : orderId));
    },
    [],
  );

  // ─── Actions ─────────────────────────────────────────────────────────

  const handleCallDelivery = useCallback(phone => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleCancelOrder = useCallback(
    order => {
      setConfirmModal({
        visible: true,
        type: 'danger',
        title: 'Cancelar pedido',
        message: `¿Deseas cancelar el pedido #${order.id}?\n\nEsta acción restaurará el stock de los productos.`,
        confirmText: 'Sí, cancelar',
        onConfirm: async () => {
          setConfirmModal(prev => ({...prev, visible: false}));
          try {
            await apiService.cancelOrder(order.id);
            setConfirmModal({
              visible: true,
              type: 'alert',
              icon: 'checkmark-circle',
              title: 'Pedido cancelado',
              message: 'El pedido fue cancelado y el stock restaurado.',
              confirmText: 'Entendido',
            });
            setTimeout(() => loadOrders(true), 500);
          } catch (err) {
            setConfirmModal({
              visible: true,
              type: 'alert',
              title: 'Error',
              message: err?.message || 'No se pudo cancelar el pedido.',
              confirmText: 'Entendido',
            });
          }
        },
      });
    },
    [loadOrders],
  );

  // ─── Render: Status Progress ──────────────────────────────────────────

  const renderStatusProgress = useCallback(
    status => {
      const currentStep = getStatusStep(status);
      const isCancelled = status === 'cancelled';

      return (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            {!isCancelled
              ? STATUS_STEPS.map((step, idx) => (
                  <View
                    key={step}
                    style={[
                      styles.progressDot,
                      idx <= currentStep && styles.progressDotActive,
                    ]}
                  />
                ))
              : null}
          </View>
        </View>
      );
    },
    [],
  );

  // ─── Render: Delivery Info ────────────────────────────────────────────

  const renderDeliveryInfo = useCallback(
    delivery => {
      if (!delivery) return null;

      return (
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryHeader}>
            <Icon
              name="bicycle-outline"
              size={18}
              color="#1ABC9C"
            />
            <Text style={styles.deliveryTitle}>Tu repartidor</Text>
          </View>

          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryDataRow}>
              <Icon
                name="person-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.deliveryName}>{delivery.name}</Text>
            </View>

            {delivery.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCallDelivery(delivery.phone)}
                activeOpacity={0.7}>
                <Icon name="call" size={16} color={theme.colors.white} />
                <Text style={styles.callButtonText}>
                  Llamar al {delivery.phone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [handleCallDelivery],
  );

  // ─── Render: Order Card ────────────────────────────────────────────────

  const renderOrderCard = useCallback(
    ({item}) => {
      const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
      const isExpanded = expandedOrder === item.id;
      const canCancel = ['pending', 'confirmed'].includes(item.status);

      return (
        <View style={styles.card}>
          {/* Card Header - Touchable to expand */}
          <TouchableOpacity
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.7}
            style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View>
                <Text style={styles.orderId}>Pedido #{item.orderNumber}</Text>
                {item.createdAt && (
                  <Text style={styles.orderDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.cardHeaderRight}>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: statusInfo.bgColor},
                ]}>
                <Icon name={statusInfo.icon} size={12} color={statusInfo.color} />
                <Text style={[styles.statusBadgeText, {color: statusInfo.color}]}>
                  {statusInfo.label}
                </Text>
              </View>
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textLight}
              />
            </View>
          </TouchableOpacity>

          {/* Status Progress Bar */}
          {renderStatusProgress(item.status)}

          {/* Expanded Content */}
          {isExpanded && (
            <View style={styles.expandedContent}>
              {/* Status description */}
              <View style={styles.statusDescription}>
                <Text style={styles.statusDescriptionText}>
                  {statusInfo.description}
                </Text>
              </View>

              {/* Delivery info */}
              {(item.status === 'shipped' || item.status === 'delivered') &&
                item.delivery && (
                  renderDeliveryInfo(item.delivery)
                )}

              {/* Delivery address */}
              {item.customerAddr && (
                <View style={styles.addressRow}>
                  <Icon
                    name="location-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.customerAddr}
                  </Text>
                </View>
              )}

              {/* Items list */}
              {item.items && item.items.length > 0 && (
                <View style={styles.itemsSection}>
                  <Text style={styles.itemsTitle}>Productos</Text>
                  {item.items.map((itm, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>
                          {itm.productName} x{itm.quantity}
                        </Text>
                        <Text style={styles.itemPrice}>
                          {formatPrice(itm.productPrice)} c/u
                        </Text>
                      </View>
                      <Text style={styles.itemSubtotal}>
                        {formatPrice(itm.subtotal)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Totals */}
              <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Total ({item.totalItems}{' '}
                    {item.totalItems === 1 ? 'producto' : 'productos'})
                  </Text>
                  <Text style={styles.totalValue}>
                    {formatPrice(item.total)}
                  </Text>
                </View>
              </View>

              {/* Cancel button */}
              {canCancel && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelOrder(item)}
                  activeOpacity={0.7}>
                  <Icon name="close-circle-outline" size={16} color={theme.colors.accent} />
                  <Text style={styles.cancelButtonText}>Cancelar pedido</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    },
    [expandedOrder, toggleExpand, renderDeliveryInfo, renderStatusProgress, handleCancelOrder],
  );

  // ─── Render: Filter Tabs ──────────────────────────────────────────────

  const renderFilterTabs = useCallback(() => {
    return (
      <View style={styles.tabsContainer}>
        {FILTER_TABS.map(tab => {
          const isActive = activeTab === tab.key;
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
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [activeTab, handleTabChange]);

  // ─── Render: Empty State ──────────────────────────────────────────────

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

    return (
      <View style={styles.emptyContainer}>
        <Icon name="receipt-outline" size={56} color={theme.colors.textLight} />
        <Text style={styles.emptyTitle}>Sin pedidos</Text>
        <Text style={styles.emptyText}>
          {activeTab === 'all'
            ? 'Aún no has realizado ningún pedido.'
            : activeTab === 'active'
              ? 'No tienes pedidos activos en este momento.'
              : 'No tienes pedidos completados.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Explorar productos</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, error, activeTab, loadOrders, navigation]);

  // ─── Loading Screen ────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Pedidos</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>Cargando pedidos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
          <Icon name="refresh" size={22} color={theme.colors.text} />
        </TouchableOpacity>
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

      {/* Confirm Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onClose={() => setConfirmModal(prev => ({...prev, visible: false}))}
        onConfirm={() => {
          setConfirmModal(prev => ({...prev, visible: false}));
          if (confirmModal.onConfirm) confirmModal.onConfirm();
        }}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
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
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.inputBg,
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
    lineHeight: 22,
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
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  orderId: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  orderDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },

  // Status Progress
  progressContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: {
    backgroundColor: '#1ABC9C',
  },

  // Expanded Content
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  statusDescription: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  statusDescriptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  // Delivery Info
  deliveryCard: {
    backgroundColor: '#1ABC9C10',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#1ABC9C30',
    overflow: 'hidden',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  deliveryTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: '#1ABC9C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryInfo: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  deliveryDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  deliveryName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#1ABC9C',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  callButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  // Items
  itemsSection: {
    gap: theme.spacing.xs,
  },
  itemsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  itemPrice: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
  itemSubtotal: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },

  // Totals
  totalsSection: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    color: theme.colors.accent,
  },

  // Cancel Button
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});

export default MyOrdersScreen;
