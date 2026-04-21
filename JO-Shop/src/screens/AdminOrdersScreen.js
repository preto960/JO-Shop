import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService from '@services/api';
import { formatPrice } from '@utils/helpers';
import theme from '@theme/styles';

const COLORS = {
  accent: '#E94560',
  success: '#2ECC71',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
  background: '#F8F9FA',
  card: '#FFFFFF',
  border: '#E8ECEF',
  inputBg: '#F0F2F5',
  pending: '#F39C12',
  confirmed: '#3498DB',
  preparing: '#9B59B6',
  shipped: '#1ABC9C',
  delivered: '#2ECC71',
  cancelled: '#E74C3C',
};

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: COLORS.pending, icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: COLORS.confirmed, icon: 'checkmark-circle-outline' },
  preparing: { label: 'Preparing', color: COLORS.preparing, icon: 'restaurant-outline' },
  shipped: { label: 'Shipped', color: COLORS.shipped, icon: 'bicycle-outline' },
  delivered: { label: 'Delivered', color: COLORS.delivered, icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', color: COLORS.cancelled, icon: 'close-circle-outline' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
};

const AdminOrdersScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const flatListRef = useRef(null);

  const fetchOrders = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
          setError(null);
        } else if (pageNum === 1) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const params = { page: pageNum, limit: 20 };
        if (activeTab !== 'all') {
          params.status = activeTab;
        }

        const response = await apiService.fetchOrders(params);

        if (pageNum === 1 || isRefresh) {
          setOrders(response.data);
        } else {
          setOrders((prev) => [...prev, ...response.data]);
        }

        setPage(pageNum);
        if (response.pagination) {
          setHasMore(pageNum < response.pagination.totalPages);
        } else {
          setHasMore(response.data.length >= 20);
        }
      } catch (err) {
        setError(err?.message || 'Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    fetchOrders(1, true);
  }, [fetchOrders]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setPage(1);
    setHasMore(true);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleLoadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      fetchOrders(page + 1);
    }
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
  };

  const handleOpenStatusModal = () => {
    if (selectedOrder) {
      setStatusModalVisible(true);
    }
  };

  const handleCloseStatusModal = () => {
    setStatusModalVisible(false);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder || updatingStatus) return;

    try {
      setUpdatingStatus(true);

      if (newStatus === 'cancelled') {
        await apiService.cancelOrder(selectedOrder.id);
      } else {
        await apiService.updateOrderStatus(selectedOrder.id, newStatus);
      }

      const updatedOrder = { ...selectedOrder, status: newStatus };
      setSelectedOrder(updatedOrder);
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)),
      );
      setStatusModalVisible(false);
    } catch (err) {
      setError(err?.message || 'Failed to update order status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getNextStatuses = (currentStatus) => {
    if (currentStatus === 'cancelled') return ['confirmed'];
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex === -1) return STATUS_FLOW;
    return STATUS_FLOW.slice(currentIndex + 1);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsScroll}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count =
              tab.key === 'all'
                ? null
                : orders.filter((o) => o.status === tab.key).length;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => handleTabChange(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabLabel,
                    isActive && styles.filterTabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {isActive && count !== null && (
                  <View style={styles.filterTabCount}>
                    <Text style={styles.filterTabCountText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const renderOrderCard = ({ item }) => {
    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderCardHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>#{item.id}</Text>
            <Text style={styles.orderDateText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.color + '18' },
            ]}
          >
            <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.orderCardBody}>
          <View style={styles.orderInfoRow}>
            <Icon name="person-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.orderInfoText} numberOfLines={1}>
              {item.customerName}
            </Text>
          </View>

          <View style={styles.orderInfoRow}>
            <Icon name="call-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.orderInfoText} numberOfLines={1}>
              {item.customerPhone}
            </Text>
          </View>

          <View style={styles.orderInfoRow}>
            <Icon name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.orderInfoText} numberOfLines={1}>
              {item.customerAddr}
            </Text>
          </View>
        </View>

        <View style={styles.orderCardFooter}>
          <View style={styles.itemsCountContainer}>
            <Icon name="cube-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.itemsCountText}>
              {item.totalItems} {item.totalItems === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <Text style={styles.orderTotalText}>{formatPrice(item.total)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderDetail = () => {
    if (!selectedOrder) return null;

    const statusInfo = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending;
    const nextStatuses = getNextStatuses(selectedOrder.status);

    return (
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent={false}
        onRequestRequestClose={handleCloseDetail}
      >
        <SafeAreaView style={styles.detailContainer} edges={['top']}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.detailCloseButton}
              onPress={handleCloseDetail}
              activeOpacity={0.7}
            >
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Order Details</Text>
            <TouchableOpacity
              style={styles.detailEditButton}
              onPress={handleOpenStatusModal}
              activeOpacity={0.7}
            >
              <Text style={styles.detailEditButtonText}>Update</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.detailScroll}
            contentContainerStyle={styles.detailScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailStatusCard}>
              <View
                style={[
                  styles.detailStatusBadge,
                  { backgroundColor: statusInfo.color },
                ]}
              >
                <Icon name={statusInfo.icon} size={22} color="#FFFFFF" />
                <Text style={styles.detailStatusText}>{statusInfo.label}</Text>
              </View>
              <Text style={styles.detailOrderId}>Order #{selectedOrder.id}</Text>
              <Text style={styles.detailDate}>{formatDate(selectedOrder.createdAt)}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Customer Info</Text>
              <View style={styles.detailInfoCard}>
                <View style={styles.detailInfoRow}>
                  <Icon name="person-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailInfoText}>{selectedOrder.customerName}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Icon name="call-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailInfoText}>{selectedOrder.customerPhone}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Icon name="location-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.detailInfoText, styles.detailAddrText]}>
                    {selectedOrder.customerAddr}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Items ({selectedOrder.items?.length || 0})</Text>
              <View style={styles.detailItemsCard}>
                {(selectedOrder.items || []).map((item, index) => (
                  <View key={index} style={styles.detailItemRow}>
                    <View style={styles.detailItemInfo}>
                      <Text style={styles.detailItemName} numberOfLines={2}>
                        {item.productName}
                      </Text>
                      <Text style={styles.detailItemMeta}>
                        {formatPrice(item.productPrice)} x {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.detailItemSubtotal}>
                      {formatPrice(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailTotalCard}>
              <Text style={styles.detailTotalLabel}>Total</Text>
              <Text style={styles.detailTotalValue}>{formatPrice(selectedOrder.total)}</Text>
            </View>
          </ScrollView>

          <View style={styles.detailFooter}>
            <TouchableOpacity
              style={styles.detailCancelBtn}
              onPress={() => handleUpdateStatus('cancelled')}
              disabled={selectedOrder.status === 'cancelled' || selectedOrder.status === 'delivered'}
              activeOpacity={0.7}
            >
              <Icon name="close-circle-outline" size={20} color={COLORS.cancelled} />
              <Text style={styles.detailCancelBtnText}>Cancel Order</Text>
            </TouchableOpacity>

            {nextStatuses.length > 0 && (
              <TouchableOpacity
                style={styles.detailNextStatusBtn}
                onPress={() => handleUpdateStatus(nextStatuses[0])}
                disabled={updatingStatus}
                activeOpacity={0.7}
              >
                {updatingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="arrow-forward-outline" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.detailNextStatusBtnText}>
                  Mark as {STATUS_CONFIG[nextStatuses[0]]?.label || nextStatuses[0]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderStatusModal = () => {
    if (!selectedOrder) return null;

    const statusInfo = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending;
    const nextStatuses = getNextStatuses(selectedOrder.status);

    return (
      <Modal
        visible={statusModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseStatusModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleCloseStatusModal}
          activeOpacity={1}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Update Order Status</Text>

            <View style={styles.modalCurrentStatus}>
              <Text style={styles.modalCurrentLabel}>Current Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusInfo.color + '18' },
                ]}
              >
                <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            <Text style={styles.modalActionsLabel}>Change to</Text>

            <View style={styles.modalActionsGrid}>
              {nextStatuses.map((statusKey) => {
                const info = STATUS_CONFIG[statusKey];
                return (
                  <TouchableOpacity
                    key={statusKey}
                    style={[
                      styles.modalActionBtn,
                      { borderColor: info.color + '40' },
                    ]}
                    onPress={() => handleUpdateStatus(statusKey)}
                    disabled={updatingStatus}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalActionIcon, { backgroundColor: info.color + '15' }]}>
                      <Icon name={info.icon} size={20} color={info.color} />
                    </View>
                    <Text style={[styles.modalActionLabel, { color: info.color }]}>
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <TouchableOpacity
                  style={[styles.modalActionBtn, { borderColor: COLORS.cancelled + '40' }]}
                  onPress={() => handleUpdateStatus('cancelled')}
                  disabled={updatingStatus}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.modalActionIcon,
                      { backgroundColor: COLORS.cancelled + '15' },
                    ]}
                  >
                    <Icon name="close-circle-outline" size={20} color={COLORS.cancelled} />
                  </View>
                  <Text style={[styles.modalActionLabel, { color: COLORS.cancelled }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {updatingStatus && (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.modalLoadingText}>Updating status...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={handleCloseStatusModal}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="receipt-outline" size={64} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'all'
          ? 'There are no orders yet.'
          : `No ${activeTab} orders at the moment.`}
      </Text>
      <TouchableOpacity style={styles.emptyRetryBtn} onPress={onRefresh} activeOpacity={0.7}>
        <Icon name="refresh" size={18} color={COLORS.accent} />
        <Text style={styles.emptyRetryBtnText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle-outline" size={64} color={COLORS.cancelled} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.errorRetryBtn} onPress={onRefresh} activeOpacity={0.7}>
        <Icon name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.errorRetryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        {renderHeader()}
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        ref={flatListRef}
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrderCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={error ? renderErrorState() : renderEmptyState()}
        contentContainerStyle={[
          styles.listContent,
          orders.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.loadMoreText}>Loading more orders...</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {renderOrderDetail()}
      {renderStatusModal()}
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fullLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  filterTabsContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: COLORS.accent,
  },
  filterTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabLabelActive: {
    color: '#FFFFFF',
  },
  filterTabCount: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderIdContainer: {
    gap: 2,
  },
  orderIdLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderDateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderInfoText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemsCountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  orderTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '12',
  },
  emptyRetryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  errorSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
  },
  errorRetryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
  },
  detailEditButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  detailStatusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailStatusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailOrderId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailSection: {
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 4,
  },
  detailInfoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailInfoText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  detailAddrText: {
    flexWrap: 'wrap',
  },
  detailItemsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailItemInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  detailItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  detailItemMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailItemSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailTotalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  detailTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
  },
  detailFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  detailCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.cancelled + '12',
    flex: 1,
    justifyContent: 'center',
  },
  detailCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.cancelled,
  },
  detailNextStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    flex: 1,
    justifyContent: 'center',
  },
  detailNextStatusBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  modalCurrentStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCurrentLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalActionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: COLORS.background,
    flex: 1,
    minWidth: '45%',
  },
  modalActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  modalLoadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalCloseBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
};

export default AdminOrdersScreen;
