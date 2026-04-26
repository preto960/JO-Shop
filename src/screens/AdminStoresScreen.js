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
<<<<<<< HEAD
=======
  Platform,
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import theme from '@theme/styles';
import ConfirmModal from '@components/ConfirmModal';
<<<<<<< HEAD
import Toast from '@components/Toast';
=======
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20;

<<<<<<< HEAD
=======
const INITIAL_FORM = {
  name: '',
  description: '',
  phone: '',
  address: '',
  logo: '',
  active: true,
};

const EMPTY_FORM_ERRORS = {};

>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
// ─── Component ────────────────────────────────────────────────────────────────
const AdminStoresScreen = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();
<<<<<<< HEAD
  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  // ─── Data state ──────────────────────────────────────────────────────────
  const [stores, setStores] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ─── UI state ────────────────────────────────────────────────────────────
=======

  // Data state
  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // UI state
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

<<<<<<< HEAD
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

  const handleLogout = useCallback(() => {
    setConfirmModal({
      visible: true,
      type: 'danger',
      title: 'Cerrar sesión',
      message: `¿Cerrar sesión de ${user?.name || 'la cuenta'}?`,
      confirmText: 'Cerrar sesión',
      onConfirm: () => logout(),
    });
  }, [user, logout]);

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
=======
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState(EMPTY_FORM_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal
  const [modal, setModal] = useState({visible: false, type: 'alert', title: '', message: '', confirmText: 'Aceptar', onConfirm: null});

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadStores = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const res = await apiService.fetchAdminStores({
          page: pageNum,
          limit: PAGE_LIMIT,
        });

        const items = Array.isArray(res) ? res : res.data || [];
        const paginationData = res.pagination || null;

        if (pageNum === 1) {
          setStores(items);
        } else {
          setStores(prev => [...prev, ...items]);
        }

        setPagination(paginationData);
        setHasMore(
          paginationData
            ? pageNum < paginationData.totalPages
            : items.length >= PAGE_LIMIT,
        );
        setPage(pageNum);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014

  useEffect(() => {
    loadStores(1);
  }, [loadStores]);

<<<<<<< HEAD
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

=======
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  const handleRefresh = useCallback(() => {
    loadStores(1, true);
  }, [loadStores]);

<<<<<<< HEAD
  // ─── Load more on scroll ─────────────────────────────────────────────────

=======
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !refreshing && hasMore) {
      loadStores(page + 1);
    }
  }, [loadingMore, refreshing, hasMore, page, loadStores]);

<<<<<<< HEAD
  // ─── Validation ──────────────────────────────────────────────────────────
=======
  // ─── Form Helpers ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFormErrors(EMPTY_FORM_ERRORS);
    setEditingStore(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setModalVisible(true);
    setTimeout(() => nameInputRef.current?.focus(), 300);
  }, [resetForm]);

  const openEditModal = useCallback(store => {
    setEditingStore(store);
    setForm({
      name: store.name || '',
      description: store.description || '',
      phone: store.phone || '',
      address: store.address || '',
      logo: store.logo || '',
      active: store.active !== false,
    });
    setFormErrors(EMPTY_FORM_ERRORS);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    resetForm();
  }, [resetForm]);

  const updateField = useCallback((field, value) => {
    setForm(prev => ({...prev, [field]: value}));
    setFormErrors(prev => ({...prev, [field]: undefined}));
  }, []);

  // ─── Validation ───────────────────────────────────────────────────────────
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014

  const validateForm = useCallback(() => {
    const errors = {};

<<<<<<< HEAD
    if (!formName.trim()) {
      errors.name = 'El nombre es obligatorio';
    } else if (formName.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (formName.trim().length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres';
    }

    if (!formOwnerId) {
      errors.owner = 'Debes seleccionar un propietario';
=======
    if (!form.name.trim()) {
      errors.name = 'El nombre es obligatorio';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Mínimo 2 caracteres';
    }

    if (form.logo.trim() && !isValidUrl(form.logo.trim())) {
      errors.logo = 'URL inválida';
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
<<<<<<< HEAD
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
=======
  }, [form]);

  // ─── Submit ───────────────────────────────────────────────────────────────
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

<<<<<<< HEAD
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
=======
    try {
      setSubmitting(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        logo: form.logo.trim() || null,
        active: form.active,
      };

      if (editingStore) {
        await apiService.updateStore(editingStore.id, payload);
      } else {
        await apiService.createStore(payload);
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
      }

      closeModal();
      loadStores(1, true);
    } catch (err) {
<<<<<<< HEAD
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
=======
      setModal({visible: true, type: 'alert', title: 'Error', message: err.message || 'No se pudo guardar la tienda', confirmText: 'Aceptar', onConfirm: null});
    } finally {
      setSubmitting(false);
    }
  }, [form, editingStore, validateForm, closeModal, loadStores]);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    store => {
      setModal({
        visible: true,
        type: 'danger',
        title: 'Eliminar tienda',
        message: `¿Estás seguro de que deseas eliminar "${store.name}"? Esta acción no se puede deshacer si tiene productos asociados.`,
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
        confirmText: 'Eliminar',
        onConfirm: async () => {
          try {
            await apiService.deleteStore(store.id);
<<<<<<< HEAD
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
=======
            setStores(prev => prev.filter(s => s.id !== store.id));
          } catch (err) {
            setModal({visible: true, type: 'alert', title: 'Error', message: err.message || 'No se pudo eliminar la tienda', confirmText: 'Aceptar', onConfirm: null});
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
          }
        },
      });
    },
<<<<<<< HEAD
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
=======
    [],
  );

  // ─── Toggle Active ────────────────────────────────────────────────────────

  const handleToggleActive = useCallback(
    store => {
      const newStatus = !store.active;
      const label = newStatus ? 'activar' : 'desactivar';

      setModal({
        visible: true,
        type: 'confirm',
        title: `${newStatus ? 'Activar' : 'Desactivar'} tienda`,
        message: `¿Deseas ${label} "${store.name}"?`,
        confirmText: newStatus ? 'Activar' : 'Desactivar',
        onConfirm: async () => {
          try {
            await apiService.updateStore(store.id, {active: newStatus});
            setStores(prev =>
              prev.map(s =>
                s.id === store.id ? {...s, active: newStatus} : s,
              ),
            );
          } catch (err) {
            setModal({visible: true, type: 'alert', title: 'Error', message: err.message || 'No se pudo actualizar la tienda', confirmText: 'Aceptar', onConfirm: null});
          }
        },
      });
    },
    [],
  );

  // ─── Render Helpers ───────────────────────────────────────────────────────
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (error && stores.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={56} color={theme.colors.accent} />
<<<<<<< HEAD
          <Text style={styles.emptyTitle}>Error de conexión</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadStores(1)}
            activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
=======
          <Text style={styles.emptyTitle}>Error al cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadStores(1)}
            activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="storefront-outline" size={56} color={theme.colors.textLight} />
        <Text style={styles.emptyTitle}>Sin tiendas</Text>
        <Text style={styles.emptyText}>
<<<<<<< HEAD
          Pulsa el botón + para agregar tu primera tienda
=======
          Crea tu primera tienda tocando el botón +
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
        </Text>
      </View>
    );
  }, [loading, error, stores.length, loadStores]);

<<<<<<< HEAD
  // ─── Render: Footer Loader ───────────────────────────────────────────────

=======
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.footerText}>Cargando más...</Text>
      </View>
    );
  }, [loadingMore]);

<<<<<<< HEAD
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
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tiendas</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="settings-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Cargando tiendas...</Text>
=======
  const renderStoreCard = useCallback(
    ({item}) => {
      const isActive = item.active !== false;
      const initial = (item.name || 'T').charAt(0).toUpperCase();

      return (
        <View style={styles.card}>
          {/* Avatar */}
          <View style={[styles.cardAvatar, !isActive && styles.cardAvatarInactive]}>
            {item.logo ? (
              <Icon name="image" size={20} color={isActive ? theme.colors.textSecondary : theme.colors.textLight} />
            ) : (
              <Text style={[styles.cardAvatarText, !isActive && styles.cardAvatarTextInactive]}>
                {initial}
              </Text>
            )}
          </View>

          {/* Store info */}
          <TouchableOpacity
            style={styles.cardBody}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.cardSubInfo}>
              {item.owner && (
                <Text style={styles.cardOwner} numberOfLines={1}>
                  {item.owner.name}
                </Text>
              )}
              {item._count?.products !== undefined && (
                <Text style={styles.cardProducts}>
                  {item._count.products} prod.
                </Text>
              )}
            </View>
            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.address || 'Sin dirección'}
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => handleToggleActive(item)}
              hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}
              style={styles.toggleBtn}>
              <Icon
                name={isActive ? 'toggle' : 'toggle-outline'}
                size={28}
                color={isActive ? theme.colors.success : theme.colors.border}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => openEditModal(item)}
              activeOpacity={0.7}>
              <Icon name="create-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}>
              <Icon name="trash-outline" size={20} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleToggleActive, openEditModal, handleDelete],
  );

  // ─── Render Form Modal ────────────────────────────────────────────────────

  const renderFormModal = useCallback(() => {
    const isEditing = !!editingStore;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={closeModal}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Editar Tienda' : 'Nueva Tienda'}
            </Text>
            <View style={{width: 28}} />
          </View>

          {/* Modal body */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets>

            {/* Name */}
            <Text style={styles.label}>
              Nombre <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              ref={nameInputRef}
              style={[styles.input, formErrors.name && styles.inputError]}
              value={form.name}
              onChangeText={val => updateField('name', val)}
              placeholder="Nombre de la tienda"
              placeholderTextColor={theme.colors.textLight}
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
              maxLength={200}
            />
            {formErrors.name && (
              <Text style={styles.errorText}>{formErrors.name}</Text>
            )}

            {/* Description */}
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              ref={descriptionInputRef}
              style={[styles.input, styles.inputMultiline]}
              value={form.description}
              onChangeText={val => updateField('description', val)}
              placeholder="Descripción de la tienda"
              placeholderTextColor={theme.colors.textLight}
              returnKeyType="next"
              onSubmitEditing={() => phoneInputRef.current?.focus()}
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Phone & Address row */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.input}
                  value={form.phone}
                  onChangeText={val => updateField('phone', val)}
                  placeholder="+52 55 1234"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => addressInputRef.current?.focus()}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>Dirección</Text>
                <TextInput
                  ref={addressInputRef}
                  style={styles.input}
                  value={form.address}
                  onChangeText={val => updateField('address', val)}
                  placeholder="Dirección"
                  placeholderTextColor={theme.colors.textLight}
                  returnKeyType="next"
                  onSubmitEditing={() => logoInputRef.current?.focus()}
                />
              </View>
            </View>

            {/* Logo URL */}
            <Text style={styles.label}>URL del Logo</Text>
            <TextInput
              ref={logoInputRef}
              style={[styles.input, formErrors.logo && styles.inputError]}
              value={form.logo}
              onChangeText={val => updateField('logo', val)}
              placeholder="https://ejemplo.com/logo.png"
              placeholderTextColor={theme.colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {formErrors.logo && (
              <Text style={styles.errorText}>{formErrors.logo}</Text>
            )}

            {/* Active toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Tienda activa</Text>
                <Text style={styles.toggleDescription}>
                  Las tiendas inactivas no se muestran en la app
                </Text>
              </View>
              <Switch
                value={form.active}
                onValueChange={val => updateField('active', val)}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.success,
                }}
                thumbColor={theme.colors.white}
              />
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}>
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Guardar Cambios' : 'Crear Tienda'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }, [
    modalVisible,
    editingStore,
    form,
    formErrors,
    submitting,
    closeModal,
    updateField,
    handleSubmit,
  ]);

  // ─── Main Render ──────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tiendas</Text>
            <Text style={styles.headerSubtitle}>
              Gestionar tiendas
            </Text>
          </View>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>Cargando tiendas...</Text>
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
        </View>
      </SafeAreaView>
    );
  }

<<<<<<< HEAD
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Toast notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({...prev, visible: false}))}
      />

=======
  const handleLogout = () => {
    setModal({
      visible: true,
      type: 'danger',
      title: 'Cerrar sesión',
      message: `¿Cerrar sesión de ${user?.name || 'la cuenta'}?`,
      confirmText: 'Cerrar sesión',
      onConfirm: () => logout(),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tiendas</Text>
<<<<<<< HEAD
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="settings-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
=======
          <Text style={styles.headerSubtitle}>
            {stores.length} tienda{stores.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={openCreateModal}
            hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Icon name="add-circle-outline" size={28} color={theme.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
            <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Store list */}
      <FlatList
        data={stores}
<<<<<<< HEAD
        keyExtractor={item => item.id.toString()}
        renderItem={renderStoreCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
=======
        keyExtractor={item => String(item.id)}
        renderItem={renderStoreCard}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={
          stores.length === 0 ? styles.emptyList : styles.listContent
        }
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
<<<<<<< HEAD
=======
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openCreateModal}
<<<<<<< HEAD
        activeOpacity={0.85}>
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? 'Editar' : 'Nueva tienda'}</Text>
            <View style={{width: 28}} />
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
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

            {/* Submit button */}
            <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
              {submitting ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Text style={styles.submitButtonText}>{isEditing ? 'Guardar cambios' : 'Crear'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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
=======
        activeOpacity={0.85}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Icon name="add" size={28} color={theme.colors.white} />
      </TouchableOpacity>

      {/* Form modal */}
      {renderFormModal()}

      <ConfirmModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        onClose={() => setModal(prev => ({...prev, visible: false}))}
        onConfirm={() => {
          if (modal.onConfirm) modal.onConfirm();
          else setModal(prev => ({...prev, visible: false}));
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
        }}
      />
    </SafeAreaView>
  );
};

<<<<<<< HEAD
// ── Styles ────────────────────────────────────────────────────────────────────
=======
// ─── Simple URL validator ─────────────────────────────────────────────────────
function isValidUrl(string) {
  if (!string || typeof string !== 'string') return false;
  const pattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
  return pattern.test(string.trim());
}

// ─── Styles ──────────────────────────────────────────────────────────────────
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

<<<<<<< HEAD
  // ─── Header ───────────────────────────────────────────────────────────────
=======
  // Header
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
<<<<<<< HEAD
  headerLeft: { width: 68 },
  headerCenter: { flex: 1, alignItems: 'center' },
=======
  headerLeft: {
    width: 40,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
<<<<<<< HEAD
    textAlign: 'center',
  },
  headerRight: {
    width: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },

  // ─── Loading ──────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
=======
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
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

<<<<<<< HEAD
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
=======
  // List
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
    paddingTop: theme.spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
<<<<<<< HEAD
    paddingVertical: theme.spacing.md,
=======
    paddingVertical: theme.spacing.lg,
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
    gap: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

<<<<<<< HEAD
  // ─── FAB ──────────────────────────────────────────────────────────────────
=======
  // Empty states
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

  // Store card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardAvatarInactive: {
    opacity: 0.5,
  },
  cardAvatarText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  cardAvatarTextInactive: {
    color: theme.colors.textLight,
  },
  cardBody: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  cardOwner: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  cardProducts: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  cardAddress: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  toggleBtn: {
    padding: theme.spacing.xs,
  },
  iconActionBtn: {
    padding: theme.spacing.xs,
  },

  // FAB
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
<<<<<<< HEAD
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

  // ─── Modal (full-screen) ────────────────────────────────────────────────
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.white,
=======
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
    elevation: 6,
  },

  // Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
<<<<<<< HEAD
=======
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
<<<<<<< HEAD
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: theme.spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
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
=======
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },

  // Form
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  required: {
    color: theme.colors.accent,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  inputMultiline: {
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.accent,
  },
<<<<<<< HEAD

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
=======
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rowItem: {
    flex: 1,
  },
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
<<<<<<< HEAD
    backgroundColor: theme.colors.inputBg || '#F0F2F5',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
=======
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    fontSize: theme.fontSize.md,
<<<<<<< HEAD
    fontWeight: '500',
=======
    fontWeight: '600',
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
    color: theme.colors.text,
  },
  toggleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
<<<<<<< HEAD
=======
  submitButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
>>>>>>> 4130fa3e5706e1bc810c77d0dadf4cd1bb8ff014
});

export default AdminStoresScreen;
