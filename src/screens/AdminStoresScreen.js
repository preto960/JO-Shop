import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Switch,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import apiService from '@services/api';
import theme from '@theme/styles';
import ConfirmModal from '@components/ConfirmModal';
import Toast from '@components/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20;

// ─── Component ────────────────────────────────────────────────────────────────
const AdminStoresScreen = () => {
  const navigation = useNavigation();
  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  // ─── Data state ──────────────────────────────────────────────────────────
  const [stores, setStores] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ─── UI state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // ─── Modal state ─────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Form fields ─────────────────────────────────────────────────────────
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formOwnerId, setFormOwnerId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // ─── Users for owner dropdown ────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);

  // ─── Confirm modal ───────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    type: 'alert',
    title: '',
    message: '',
    confirmText: 'Aceptar',
    onConfirm: null,
  });

  // ─── Toast ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
  });

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadStores = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const res = await apiService.fetchStoresAdmin({
        page: pageNum,
        limit: PAGE_LIMIT,
      });

      const items = res.data || [];
      const paginationData = res.pagination || null;

      if (pageNum === 1) {
        setStores(items);
      } else {
        setStores(prev => [...prev, ...items]);
      }

      setHasMore(
        paginationData
          ? pageNum < paginationData.totalPages
          : items.length >= PAGE_LIMIT,
      );
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading stores:', err.message);
      setError('No se pudieron cargar las tiendas. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadStores(1);
  }, [loadStores]);

  // ─── Load users for owner dropdown ───────────────────────────────────────

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await apiService.fetchUsers();
      const items = Array.isArray(res) ? res : res.data || [];
      setUsers(items);
    } catch (err) {
      console.warn('Error loading users:', err.message);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ─── Pull to refresh ─────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    loadStores(1, true);
  }, [loadStores]);

  // ─── Load more on scroll ─────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !refreshing && hasMore) {
      loadStores(page + 1);
    }
  }, [loadingMore, refreshing, hasMore, page, loadStores]);

  // ─── Validation ──────────────────────────────────────────────────────────

  const validateForm = useCallback(() => {
    const errors = {};

    if (!formName.trim()) {
      errors.name = 'El nombre es obligatorio';
    } else if (formName.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (formName.trim().length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres';
    }

    if (!formOwnerId) {
      errors.owner = 'Debes seleccionar un propietario';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formName, formOwnerId]);

  // ─── Open / Close modal ──────────────────────────────────────────────────

  const openCreateModal = useCallback(() => {
    setIsEditing(false);
    setEditingStore(null);
    setFormName('');
    setFormDescription('');
    setFormPhone('');
    setFormAddress('');
    setFormActive(true);
    setFormOwnerId(null);
    setFormErrors({});
    setModalVisible(true);
    loadUsers();
    setTimeout(() => nameInputRef.current?.focus(), 300);
  }, [loadUsers]);

  const openEditModal = useCallback(
    store => {
      setIsEditing(true);
      setEditingStore(store);
      setFormName(store.name || '');
      setFormDescription(store.description || '');
      setFormPhone(store.phone || '');
      setFormAddress(store.address || '');
      setFormActive(store.active !== false);
      setFormOwnerId(store.ownerId || store.owner?.id || null);
      setFormErrors({});
      setOwnerDropdownOpen(false);
      setModalVisible(true);
      loadUsers();
    },
    [loadUsers],
  );

  const closeModal = useCallback(() => {
    if (submitting) return;
    setModalVisible(false);
    setFormName('');
    setFormDescription('');
    setFormPhone('');
    setFormAddress('');
    setFormActive(true);
    setFormOwnerId(null);
    setFormErrors({});
    setEditingStore(null);
    setIsEditing(false);
    setOwnerDropdownOpen(false);
  }, [submitting]);

  // ─── Submit (create / update) ────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      phone: formPhone.trim() || null,
      address: formAddress.trim() || null,
      active: formActive,
      ownerId: formOwnerId,
    };

    try {
      setSubmitting(true);

      if (isEditing && editingStore) {
        await apiService.updateStore(editingStore.id, payload);
        setToast({
          visible: true,
          message: 'Tienda actualizada correctamente',
          type: 'success',
        });
      } else {
        await apiService.createStore(payload);
        setToast({
          visible: true,
          message: 'Tienda creada correctamente',
          type: 'success',
        });
      }

      closeModal();
      loadStores(1, true);
    } catch (err) {
      console.error('Error saving store:', err.message);
      setToast({
        visible: true,
        message: err.message || 'No se pudo guardar la tienda',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm,
    formName,
    formDescription,
    formPhone,
    formAddress,
    formActive,
    formOwnerId,
    isEditing,
    editingStore,
    closeModal,
    loadStores,
  ]);

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    store => {
      const productCount = store._count?.products || store.productCount || 0;

      setConfirmModal({
        visible: true,
        type: 'danger',
        title: 'Eliminar tienda',
        message: `¿Estás seguro de eliminar "${store.name}"?${
          productCount > 0
            ? `\n\n⚠️ Esta tienda tiene ${productCount} producto(s) asociado(s). Los productos podrían quedar sin tienda asignada.`
            : ''
        }`,
        confirmText: 'Eliminar',
        onConfirm: async () => {
          try {
            await apiService.deleteStore(store.id);
            setConfirmModal(prev => ({...prev, visible: false}));
            setToast({
              visible: true,
              message: 'Tienda eliminada correctamente',
              type: 'success',
            });
            loadStores(1, true);
          } catch (err) {
            console.error('Error deleting store:', err.message);
            setConfirmModal(prev => ({...prev, visible: false}));
            setToast({
              visible: true,
              message: err.message || 'No se pudo eliminar la tienda',
              type: 'error',
            });
          }
        },
      });
    },
    [loadStores],
  );

  // ─── Owner dropdown helpers ──────────────────────────────────────────────

  const getOwnerName = useCallback(() => {
    if (!formOwnerId) return '';
    const user = users.find(u => u.id === formOwnerId);
    return user ? user.name || user.email : '';
  }, [formOwnerId, users]);

  const toggleOwnerDropdown = useCallback(() => {
    setOwnerDropdownOpen(prev => !prev);
  }, []);

  const selectOwner = useCallback(
    user => {
      setFormOwnerId(user.id);
      setOwnerDropdownOpen(false);
      if (formErrors.owner) {
        setFormErrors(prev => ({...prev, owner: undefined}));
      }
    },
    [formErrors.owner],
  );

  // ─── Render: Store Card ──────────────────────────────────────────────────

  const renderStoreCard = useCallback(
    ({item}) => {
      const isActive = item.active !== false;
      const productCount = item._count?.products || item.productCount || 0;
      const ownerName =
        item.owner?.name || item.ownerName || 'Sin propietario';

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}>
          {/* Store info */}
          <View style={styles.cardBody}>
            <View style={styles.cardNameRow}>
              <View style={styles.storeIconWrapper}>
                <Icon name="storefront-outline" size={20} color={theme.colors.accent} />
              </View>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              {/* Active/inactive dot */}
              <View
                style={[
                  styles.statusDot,
                  isActive ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
            </View>

            {/* Description */}
            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {/* Owner info */}
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Icon name="person-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {ownerName}
                </Text>
              </View>
            </View>

            {/* Product count badge */}
            <View style={styles.productBadge}>
              <Icon name="pricetag-outline" size={12} color={theme.colors.accent} />
              <Text style={styles.productBadgeText}>
                {productCount} producto{productCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <Icon
            name="chevron-forward"
            size={20}
            color={theme.colors.textLight}
            style={styles.cardChevron}
          />
        </TouchableOpacity>
      );
    },
    [openEditModal],
  );

  // ─── Render: Empty State ─────────────────────────────────────────────────

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (error && stores.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={56} color={theme.colors.accent} />
          <Text style={styles.emptyTitle}>Error de conexión</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadStores(1)}
            activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="storefront-outline" size={56} color={theme.colors.textLight} />
        <Text style={styles.emptyTitle}>Sin tiendas</Text>
        <Text style={styles.emptyText}>
          Pulsa el botón + para agregar tu primera tienda
        </Text>
      </View>
    );
  }, [loading, error, stores.length, loadStores]);

  // ─── Render: Footer Loader ───────────────────────────────────────────────

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.footerText}>Cargando más...</Text>
      </View>
    );
  }, [loadingMore]);

  // ─── Form label helper ───────────────────────────────────────────────────

  const renderFieldLabel = useCallback(
    (label, fieldName) => (
      <Text style={styles.fieldLabel}>
        {label}
        {formErrors[fieldName] ? (
          <Text style={styles.fieldError}> {formErrors[fieldName]}</Text>
        ) : null}
      </Text>
    ),
    [formErrors],
  );

  // ─── Render: Owner dropdown inside modal ─────────────────────────────────

  const renderOwnerDropdown = useCallback(() => (
    <View style={styles.fieldGroup}>
      {renderFieldLabel('Propietario *', 'owner')}
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          formErrors.owner && styles.inputError,
          ownerDropdownOpen && styles.dropdownTriggerOpen,
        ]}
        onPress={toggleOwnerDropdown}
        activeOpacity={0.7}>
        {usersLoading ? (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        ) : formOwnerId && getOwnerName() ? (
          <Text style={styles.dropdownSelectedText} numberOfLines={1}>
            {getOwnerName()}
          </Text>
        ) : (
          <Text style={styles.dropdownPlaceholder}>
            Seleccionar propietario
          </Text>
        )}
        <Icon
          name={ownerDropdownOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {ownerDropdownOpen && (
        <View style={styles.dropdownList}>
          <ScrollView
            nestedScrollEnabled
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled">
            {users.length === 0 && !usersLoading ? (
              <Text style={styles.dropdownEmptyText}>No hay usuarios disponibles</Text>
            ) : (
              users.map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.dropdownItem,
                    formOwnerId === user.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => selectOwner(user)}
                  activeOpacity={0.7}>
                  <Icon
                    name="person-outline"
                    size={16}
                    color={
                      formOwnerId === user.id
                        ? theme.colors.accent
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      formOwnerId === user.id && styles.dropdownItemTextSelected,
                    ]}
                    numberOfLines={1}>
                    {user.name || user.email}
                  </Text>
                  {formOwnerId === user.id && (
                    <Icon name="checkmark" size={16} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  ), [
    ownerDropdownOpen,
    usersLoading,
    users,
    formOwnerId,
    formErrors.owner,
    getOwnerName,
    toggleOwnerDropdown,
    selectOwner,
    renderFieldLabel,
  ]);

  // ─── Main render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tiendas</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Cargando tiendas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Toast notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({...prev, visible: false}))}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tiendas</Text>
        <Text style={styles.headerCount}>{stores.length}</Text>
      </View>

      {/* Store list */}
      <FlatList
        data={stores}
        keyExtractor={item => item.id.toString()}
        renderItem={renderStoreCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openCreateModal}
        activeOpacity={0.85}>
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create / Edit Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={closeModal}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            {/* Handle bar */}
            <View style={styles.modalHandleWrapper}>
              <View style={styles.modalHandle} />
            </View>

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Editar tienda' : 'Nueva tienda'}
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                activeOpacity={0.7}
                disabled={submitting}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              {/* Name field */}
              <View style={styles.fieldGroup}>
                {renderFieldLabel('Nombre *', 'name')}
                <TextInput
                  ref={nameInputRef}
                  style={[styles.textInput, formErrors.name && styles.inputError]}
                  value={formName}
                  onChangeText={text => {
                    setFormName(text);
                    if (formErrors.name) {
                      setFormErrors(prev => ({...prev, name: undefined}));
                    }
                  }}
                  placeholder="Ej. Mi Tienda"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={100}
                  editable={!submitting}
                  returnKeyType="next"
                  onSubmitEditing={() => descriptionInputRef.current?.focus()}
                />
              </View>

              {/* Description field */}
              <View style={styles.fieldGroup}>
                {renderFieldLabel('Descripción', 'description')}
                <TextInput
                  ref={descriptionInputRef}
                  style={[styles.textInput, styles.textArea, formErrors.description && styles.inputError]}
                  value={formDescription}
                  onChangeText={text => {
                    setFormDescription(text);
                    if (formErrors.description) {
                      setFormErrors(prev => ({...prev, description: undefined}));
                    }
                  }}
                  placeholder="Describe tu tienda..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!submitting}
                  textAlignVertical="top"
                />
              </View>

              {/* Phone field */}
              <View style={styles.fieldGroup}>
                {renderFieldLabel('Teléfono', 'phone')}
                <TextInput
                  style={[styles.textInput, formErrors.phone && styles.inputError]}
                  value={formPhone}
                  onChangeText={text => {
                    setFormPhone(text);
                    if (formErrors.phone) {
                      setFormErrors(prev => ({...prev, phone: undefined}));
                    }
                  }}
                  placeholder="Ej. +52 55 1234 5678"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={20}
                  editable={!submitting}
                  returnKeyType="next"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Address field */}
              <View style={styles.fieldGroup}>
                {renderFieldLabel('Dirección', 'address')}
                <TextInput
                  style={[styles.textInput, formErrors.address && styles.inputError]}
                  value={formAddress}
                  onChangeText={text => {
                    setFormAddress(text);
                    if (formErrors.address) {
                      setFormErrors(prev => ({...prev, address: undefined}));
                    }
                  }}
                  placeholder="Ej. Av. Principal #123"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={200}
                  editable={!submitting}
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>

              {/* Owner dropdown */}
              {renderOwnerDropdown()}

              {/* Active toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Tienda activa</Text>
                  <Text style={styles.toggleDescription}>
                    {formActive
                      ? 'La tienda será visible para los clientes'
                      : 'La tienda no será visible para los clientes'}
                  </Text>
                </View>
                <Switch
                  value={formActive}
                  onValueChange={setFormActive}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.success,
                  }}
                  thumbColor={theme.colors.white}
                  disabled={submitting}
                />
              </View>
            </ScrollView>

            {/* Modal footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={closeModal}
                activeOpacity={0.8}
                disabled={submitting}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnSubmit,
                  submitting && styles.modalBtnDisabled,
                ]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>
                    {isEditing ? 'Guardar cambios' : 'Crear tienda'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onClose={() => setConfirmModal(prev => ({...prev, visible: false}))}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          else setConfirmModal(prev => ({...prev, visible: false}));
        }}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  header: {
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
    textAlign: 'center',
    marginRight: -40, // offset the back button to truly center
  },
  headerRight: {
    width: 40,
  },
  headerCount: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },

  // ─── Loading ──────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

  // ─── List ─────────────────────────────────────────────────────────────────
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl + 70,
  },

  // ─── Card ─────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  cardBody: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  cardName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  metaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FDE8EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  productBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: '600',
    marginLeft: 4,
  },

  // ─── Status dot ───────────────────────────────────────────────────────────
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: theme.spacing.sm,
  },
  statusDotActive: {
    backgroundColor: theme.colors.success,
  },
  statusDotInactive: {
    backgroundColor: theme.colors.textLight,
  },

  // ─── Chevron ──────────────────────────────────────────────────────────────
  cardChevron: {
    marginLeft: theme.spacing.xs,
  },

  // ─── Empty / Error ────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  retryBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ─── Footer loader ────────────────────────────────────────────────────────
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // ─── FAB ──────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: theme.colors.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // ─── Modal (bottom sheet) ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    maxHeight: '85%',
  },
  modalHandleWrapper: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnCancel: {
    backgroundColor: '#F0F2F5',
  },
  modalBtnCancelText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modalBtnSubmit: {
    backgroundColor: theme.colors.accent,
  },
  modalBtnDisabled: {
    opacity: 0.65,
  },
  modalBtnSubmitText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ─── Form fields ──────────────────────────────────────────────────────────
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  fieldError: {
    color: theme.colors.accent,
    fontWeight: '400',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.inputBg || '#F0F2F5',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.accent,
  },

  // ─── Owner dropdown ───────────────────────────────────────────────────────
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.inputBg || '#F0F2F5',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  dropdownTriggerOpen: {
    borderColor: theme.colors.accent,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownSelectedText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  dropdownPlaceholder: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  dropdownList: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: theme.colors.accent,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
    maxHeight: 180,
  },
  dropdownScroll: {
    maxHeight: 176,
  },
  dropdownEmptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: '#FDE8EC',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  dropdownItemTextSelected: {
    color: theme.colors.accent,
    fontWeight: '600',
  },

  // ─── Toggle ───────────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBg || '#F0F2F5',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  toggleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default AdminStoresScreen;
