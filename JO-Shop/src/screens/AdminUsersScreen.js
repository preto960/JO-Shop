import React, {useState, useEffect, useCallback} from 'react';
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
  Alert,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import theme from '@theme/styles';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20;

const MODULE_LABELS = {
  products: 'Productos',
  categories: 'Categorías',
  orders: 'Pedidos',
  users: 'Usuarios',
  dashboard: 'Dashboard',
  roles: 'Roles',
};

// ─── Component ────────────────────────────────────────────────────────────────
const AdminUsersScreen = () => {
  const navigation = useNavigation();
  const {user: currentUser, logout, fetchProfile} = useAuth();

  // ─── Data state ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ─── UI state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // ─── Search ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Detail modal ────────────────────────────────────────────────────────
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Edit modal ──────────────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    birthdate: '',
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── Roles & Permissions for edit modal ──────────────────────────────────
  const [availableRoles, setAvailableRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // ─── Role management loading state ───────────────────────────────────────
  const [rolesSaving, setRolesSaving] = useState(false);
  const [permSaving, setPermSaving] = useState(null);

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadUsers = useCallback(
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

        const res = await apiService.fetchUsers({
          page: pageNum,
          limit: PAGE_LIMIT,
          search: searchQuery || undefined,
        });

        const items = Array.isArray(res) ? res : res.data || [];
        const paginationData = res.pagination || null;

        if (pageNum === 1) {
          setUsers(items);
        } else {
          setUsers(prev => [...prev, ...items]);
        }

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
    [searchQuery],
  );

  useEffect(() => {
    loadUsers(1);
  }, [searchQuery, loadUsers]);

  const handleRefresh = useCallback(() => {
    loadUsers(1, true);
  }, [loadUsers]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !refreshing && hasMore) {
      loadUsers(page + 1);
    }
  }, [loadingMore, refreshing, hasMore, page, loadUsers]);

  // ─── Detail Modal ────────────────────────────────────────────────────────

  const openDetail = useCallback(
    async userData => {
      setSelectedUser(userData);
      setDetailVisible(true);
      setDetailLoading(true);

      try {
        // Fetch roles and permissions for display
        const [rolesRes, permsRes] = await Promise.all([
          apiService.fetchRoles(),
          apiService.fetchPermissions(),
        ]);

        const rolesList = Array.isArray(rolesRes)
          ? rolesRes
          : rolesRes.data || rolesRes.roles || [];
        setAvailableRoles(rolesList);

        const permsList = Array.isArray(permsRes)
          ? permsRes
          : permsRes.permissions || permsRes.data || [];
        setAllPermissions(permsList);
      } catch (err) {
        console.warn('Failed to load roles/permissions:', err.message);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    setSelectedUser(null);
  }, []);

  // ─── Edit Modal ──────────────────────────────────────────────────────────

  const openEdit = useCallback(
    userData => {
      // Solo ocultar el modal de detalle, NO limpiar selectedUser
      // (renderEditModal necesita selectedUser para renderizar)
      setDetailVisible(false);
      setEditForm({
        name: userData.name || '',
        phone: userData.phone || '',
        birthdate: userData.birthdate
          ? String(userData.birthdate).substring(0, 10)
          : '',
        active: userData.active !== false,
      });
      // Asegurar que selectedUser sigue seteado antes de abrir el edit
      setSelectedUser(userData);
      setEditVisible(true);
      setEditLoading(true);

      // Roles and permissions already loaded from detail modal
      if (availableRoles.length === 0 || allPermissions.length === 0) {
        Promise.all([
          apiService.fetchRoles().catch(() => []),
          apiService.fetchPermissions().catch(() => []),
        ]).then(([rolesRes, permsRes]) => {
          const rolesList = Array.isArray(rolesRes)
            ? rolesRes
            : rolesRes.data || rolesRes.roles || [];
          const permsList = Array.isArray(permsRes)
            ? permsRes
            : permsRes.permissions || permsRes.data || [];
          setAvailableRoles(rolesList);
          setAllPermissions(permsList);
          setEditLoading(false);
        });
      } else {
        setEditLoading(false);
      }
    },
    [availableRoles.length, allPermissions.length],
  );

  const closeEdit = useCallback(() => {
    setEditVisible(false);
  }, []);

  const updateEditField = useCallback((field, value) => {
    setEditForm(prev => ({...prev, [field]: value}));
  }, []);

  // ─── Save User (phone, birthdate, active) ───────────────────────────────

  const handleSaveUser = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      const api = await apiService.createApiClient();
      if (!api) throw new Error('No hay URL del servidor configurada');

      await api.put(`/auth/users/${selectedUser.id}`, {
        name: editForm.name || undefined,
        phone: editForm.phone || null,
        birthdate: editForm.birthdate || null,
        active: editForm.active,
      });

      // Update local state
      const updatedUser = {
        ...selectedUser,
        phone: editForm.phone || null,
        birthdate: editForm.birthdate || null,
        active: editForm.active,
      };
      setSelectedUser(updatedUser);
      setUsers(prev =>
        prev.map(u =>
          u.id === selectedUser.id ? {...u, ...updatedUser} : u,
        ),
      );

      // If editing self, refresh profile
      if (currentUser?.id === selectedUser.id) {
        await fetchProfile();
      }

      Alert.alert('Éxito', 'Usuario actualizado correctamente');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo guardar los cambios');
    } finally {
      setSubmitting(false);
    }
  }, [selectedUser, editForm, currentUser, fetchProfile]);

  // ─── Deactivate Confirmation ────────────────────────────────────────────

  const handleToggleActive = useCallback(
    (userData, fromEdit = false) => {
      const newStatus = !userData.active;
      const label = newStatus ? 'activar' : 'desactivar';

      Alert.alert(
        `${newStatus ? 'Activar' : 'Desactivar'} usuario`,
        `${newStatus ? 'Activar' : 'Desactivar'} a "${userData.name}" impide ${
          newStatus ? 'que pueda acceder' : 'el acceso al sistema'
        }. ¿Continuar?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: newStatus ? 'Activar' : 'Desactivar',
            style: newStatus ? 'default' : 'destructive',
            onPress: async () => {
              try {
                const api = await apiService.createApiClient();
                if (!api) throw new Error('No hay URL del servidor configurada');

                await api.put(`/auth/users/${userData.id}`, {
                  name: userData.name,
                  active: newStatus,
                });

                const updated = {
                  ...userData,
                  active: newStatus,
                };

                setSelectedUser(updated);
                setUsers(prev =>
                  prev.map(u =>
                    u.id === userData.id ? {...u, active: newStatus} : u,
                  ),
                );

                if (fromEdit) {
                  updateEditField('active', newStatus);
                }

                if (currentUser?.id === userData.id) {
                  await fetchProfile();
                }
              } catch (err) {
                Alert.alert(
                  'Error',
                  err.message || 'No se pudo actualizar el estado del usuario',
                );
              }
            },
          },
        ],
      );
    },
    [currentUser, fetchProfile, updateEditField],
  );

  // ─── Roles Management ───────────────────────────────────────────────────

  const handleRemoveRole = useCallback(
    (userId, roleId) => {
      if (!selectedUser) return;

      const role = availableRoles.find(r => r.id === roleId);
      Alert.alert(
        'Quitar rol',
        `¿Quitar el rol "${role?.name || roleId}" a "${selectedUser.name}"?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: async () => {
              try {
                setRolesSaving(true);
                const currentIds = (selectedUser.roles || []).map(r => r.id);
                const newIds = currentIds.filter(id => id !== roleId);
                await apiService.updateUserRoles(userId, newIds);

                const updatedUser = {
                  ...selectedUser,
                  roles: (selectedUser.roles || []).filter(r => r.id !== roleId),
                };
                setSelectedUser(updatedUser);
                setUsers(prev =>
                  prev.map(u =>
                    u.id === userId
                      ? {...u, roles: updatedUser.roles}
                      : u,
                  ),
                );
              } catch (err) {
                Alert.alert(
                  'Error',
                  err.message || 'No se pudo quitar el rol',
                );
              } finally {
                setRolesSaving(false);
              }
            },
          },
        ],
      );
    },
    [selectedUser, availableRoles],
  );

  const handleAddRole = useCallback(
    (userId, roleId) => {
      if (!selectedUser) return;

      const role = availableRoles.find(r => r.id === roleId);
      Alert.alert(
        'Asignar rol',
        `¿Asignar el rol "${role?.name || roleId}" a "${selectedUser.name}"?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Asignar',
            onPress: async () => {
              try {
                setRolesSaving(true);
                const currentIds = (selectedUser.roles || []).map(r => r.id);
                const newIds = [...currentIds, roleId];
                await apiService.updateUserRoles(userId, newIds);

                const updatedUser = {
                  ...selectedUser,
                  roles: [
                    ...(selectedUser.roles || []),
                    role || {id: roleId, name: roleId},
                  ],
                };
                setSelectedUser(updatedUser);
                setUsers(prev =>
                  prev.map(u =>
                    u.id === userId
                      ? {...u, roles: updatedUser.roles}
                      : u,
                  ),
                );
              } catch (err) {
                Alert.alert(
                  'Error',
                  err.message || 'No se pudo asignar el rol',
                );
              } finally {
                setRolesSaving(false);
              }
            },
          },
        ],
      );
    },
    [selectedUser, availableRoles],
  );

  // ─── Permissions Management ─────────────────────────────────────────────

  const handleTogglePermission = useCallback(
    async (userId, permissionId) => {
      if (!selectedUser) return;

      const perm = allPermissions.find(p => p.id === permissionId);
      const isGranted = (selectedUser.permissions || []).some(
        p => p.id === permissionId || p.permissionId === permissionId,
      );

      setPermSaving(permissionId);

      try {
        if (isGranted) {
          await apiService.revokeUserPermission(userId, permissionId);
          const updatedUser = {
            ...selectedUser,
            permissions: (selectedUser.permissions || []).filter(
              p => p.id !== permissionId && p.permissionId !== permissionId,
            ),
          };
          setSelectedUser(updatedUser);
          setUsers(prev =>
            prev.map(u =>
              u.id === userId
                ? {...u, permissions: updatedUser.permissions}
                : u,
            ),
          );
        } else {
          await apiService.grantUserPermission(userId, permissionId);
          const updatedUser = {
            ...selectedUser,
            permissions: [
              ...(selectedUser.permissions || []),
              perm || {id: permissionId},
            ],
          };
          setSelectedUser(updatedUser);
          setUsers(prev =>
            prev.map(u =>
              u.id === userId
                ? {...u, permissions: updatedUser.permissions}
                : u,
            ),
          );
        }
      } catch (err) {
        Alert.alert(
          'Error',
          err.message || 'No se pudo actualizar el permiso',
        );
      } finally {
        setPermSaving(null);
      }
    },
    [selectedUser, allPermissions],
  );

  // ─── Group permissions by module ────────────────────────────────────────

  const getGroupedPermissions = useCallback(() => {
    const grouped = {};
    for (const perm of allPermissions) {
      const mod = perm.module || 'otros';
      if (!grouped[mod]) {
        grouped[mod] = [];
      }
      grouped[mod].push(perm);
    }
    return grouped;
  }, [allPermissions]);

  // ─── Format helpers ─────────────────────────────────────────────────────

  const formatDate = useCallback(dateStr => {
    if (!dateStr) return 'No especificada';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  }, []);

  // ─── Render: User Card ──────────────────────────────────────────────────

  const renderUserCard = useCallback(
    ({item}) => {
      const isActive = item.active !== false;
      const initial = (item.name || item.email || 'U')
        .charAt(0)
        .toUpperCase();

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => openDetail(item)}
          activeOpacity={0.7}>
          {/* Avatar with first letter */}
          <View
            style={[
              styles.cardAvatar,
              !isActive && styles.cardAvatarInactive,
            ]}>
            <Text
              style={[
                styles.cardAvatarText,
                !isActive && styles.cardAvatarTextInactive,
              ]}>
              {initial}
            </Text>
          </View>

          {/* User info */}
          <View style={styles.cardBody}>
            <View style={styles.cardNameRow}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name || 'Sin nombre'}
              </Text>
              {/* Active dot */}
              <View
                style={[
                  styles.statusDot,
                  isActive ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
            </View>
            <Text style={styles.cardEmail} numberOfLines={1}>
              {item.email}
            </Text>

            {/* Role badges */}
            {item.roles && item.roles.length > 0 ? (
              <View style={styles.cardBadges}>
                {item.roles.slice(0, 3).map(role => (
                  <View
                    key={role.id}
                    style={[
                      styles.roleBadge,
                      role.name === 'admin' && styles.roleBadgeAdmin,
                    ]}>
                    <Text
                      style={[
                        styles.roleBadgeText,
                        role.name === 'admin' && styles.roleBadgeTextAdmin,
                      ]}>
                      {role.name}
                    </Text>
                  </View>
                ))}
                {item.roles.length > 3 && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      +{item.roles.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          {/* Inactive label */}
          {!isActive && (
            <View style={styles.inactiveTag}>
              <Text style={styles.inactiveTagText}>Inactivo</Text>
            </View>
          )}

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
    [openDetail],
  );

  // ─── Render: Empty State ────────────────────────────────────────────────

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (error && users.length === 0) {
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
            onPress={() => loadUsers(1)}
            activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <Icon
            name="search-outline"
            size={56}
            color={theme.colors.textLight}
          />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>
            No se encontraron usuarios para "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="people-outline" size={56} color={theme.colors.textLight} />
        <Text style={styles.emptyTitle}>Sin usuarios</Text>
        <Text style={styles.emptyText}>
          Aún no hay usuarios registrados
        </Text>
      </View>
    );
  }, [loading, error, users.length, searchQuery, loadUsers]);

  // ─── Render: Footer Loader ──────────────────────────────────────────────

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.footerText}>Cargando más...</Text>
      </View>
    );
  }, [loadingMore]);

  // ─── Render: Detail Modal (Bottom Sheet) ────────────────────────────────

  const renderDetailModal = useCallback(() => {
    if (!selectedUser) return null;

    const isActive = selectedUser.active !== false;
    const groupedPermissions = getGroupedPermissions();
    const userPermIds = new Set(
      (selectedUser.permissions || []).map(
        p => p.id || p.permissionId,
      ),
    );

    return (
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={closeDetail}
          />
          <View style={styles.sheetContainer}>
            {/* Handle */}
            <View style={styles.sheetHandleWrapper}>
              <View style={styles.sheetHandle} />
            </View>

            {detailLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.accent}
                />
                <Text style={styles.sheetLoadingText}>
                  Cargando detalles...
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {/* User header */}
                <View style={styles.detailHeader}>
                  <View
                    style={[
                      styles.detailAvatar,
                      !isActive && styles.detailAvatarInactive,
                    ]}>
                    <Text
                      style={[
                        styles.detailAvatarText,
                        !isActive && styles.detailAvatarTextInactive,
                      ]}>
                      {(selectedUser.name || selectedUser.email || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailHeaderInfo}>
                    <Text style={styles.detailName}>
                      {selectedUser.name || 'Sin nombre'}
                    </Text>
                    <Text style={styles.detailEmail}>
                      {selectedUser.email}
                    </Text>
                    <View style={styles.detailStatusRow}>
                      <View
                        style={[
                          styles.detailStatusBadge,
                          isActive
                            ? styles.detailStatusActive
                            : styles.detailStatusInactive,
                        ]}>
                        <Icon
                          name={
                            isActive ? 'checkmark-circle' : 'close-circle'
                          }
                          size={14}
                          color={
                            isActive
                              ? theme.colors.success
                              : theme.colors.accent
                          }
                        />
                        <Text
                          style={[
                            styles.detailStatusText,
                            isActive
                              ? styles.detailStatusTextActive
                              : styles.detailStatusTextInactive,
                          ]}>
                          {isActive ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Info section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Información
                  </Text>
                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Icon
                        name="call-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                        style={styles.detailInfoIcon}
                      />
                      <View style={styles.detailInfoContent}>
                        <Text style={styles.detailInfoLabel}>
                          Teléfono
                        </Text>
                        <Text style={styles.detailInfoValue}>
                          {selectedUser.phone || 'No especificado'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailInfoDivider} />
                    <View style={styles.detailInfoRow}>
                      <Icon
                        name="calendar-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                        style={styles.detailInfoIcon}
                      />
                      <View style={styles.detailInfoContent}>
                        <Text style={styles.detailInfoLabel}>
                          Fecha de nacimiento
                        </Text>
                        <Text style={styles.detailInfoValue}>
                          {formatDate(selectedUser.birthdate)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailInfoDivider} />
                    <View style={styles.detailInfoRow}>
                      <Icon
                        name="time-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                        style={styles.detailInfoIcon}
                      />
                      <View style={styles.detailInfoContent}>
                        <Text style={styles.detailInfoLabel}>
                          Fecha de registro
                        </Text>
                        <Text style={styles.detailInfoValue}>
                          {formatDate(selectedUser.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Roles section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Roles</Text>
                  {selectedUser.roles && selectedUser.roles.length > 0 ? (
                    <View style={styles.detailBadgesWrap}>
                      {selectedUser.roles.map(role => (
                        <View
                          key={role.id}
                          style={[
                            styles.detailRoleBadge,
                            role.name === 'admin' &&
                              styles.detailRoleBadgeAdmin,
                          ]}>
                          <Icon
                            name="shield-checkmark-outline"
                            size={14}
                            color={
                              role.name === 'admin'
                                ? theme.colors.white
                                : theme.colors.accent
                            }
                          />
                          <Text
                            style={[
                              styles.detailRoleBadgeText,
                              role.name === 'admin' &&
                                styles.detailRoleBadgeTextAdmin,
                            ]}>
                            {role.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.detailEmptyText}>
                      Sin roles asignados
                    </Text>
                  )}
                </View>

                {/* Permissions section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Permisos directos
                  </Text>
                  {selectedUser.permissions &&
                  selectedUser.permissions.length > 0 ? (
                    Object.entries(groupedPermissions).map(
                      ([mod, perms]) => {
                        const modulePerms = perms.filter(p =>
                          userPermIds.has(p.id),
                        );
                        if (modulePerms.length === 0) return null;
                        return (
                          <View key={mod} style={styles.detailModuleCard}>
                            <Text style={styles.detailModuleTitle}>
                              {MODULE_LABELS[mod] || mod}
                            </Text>
                            <View style={styles.detailPermChipsWrap}>
                              {modulePerms.map(perm => (
                                <View
                                  key={perm.id}
                                  style={styles.detailPermChip}>
                                  <Text style={styles.detailPermChipText}>
                                    {perm.name || perm.code}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      },
                    )
                  ) : (
                    <Text style={styles.detailEmptyText}>
                      Sin permisos directos (hereda de roles)
                    </Text>
                  )}
                </View>

                {/* Action buttons */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.detailEditBtn}
                    onPress={() => openEdit(selectedUser)}
                    activeOpacity={0.8}>
                    <Icon
                      name="create-outline"
                      size={20}
                      color={theme.colors.white}
                    />
                    <Text style={styles.detailEditBtnText}>
                      Editar usuario
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.detailToggleBtn,
                      !isActive && styles.detailToggleBtnActivate,
                    ]}
                    onPress={() =>
                      handleToggleActive(selectedUser, false)
                    }
                    activeOpacity={0.8}>
                    <Icon
                      name={
                        isActive
                          ? 'person-remove-outline'
                          : 'person-add-outline'
                      }
                      size={20}
                      color={theme.colors.white}
                    />
                    <Text style={styles.detailToggleBtnText}>
                      {isActive ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  }, [
    selectedUser,
    detailVisible,
    detailLoading,
    getGroupedPermissions,
    formatDate,
    closeDetail,
    openEdit,
    handleToggleActive,
  ]);

  // ─── Render: Edit Modal (Full Screen) ───────────────────────────────────

  const renderEditModal = useCallback(() => {
    if (!selectedUser) return null;

    const isActive = editForm.active;
    const userRoleIds = new Set(
      (selectedUser.roles || []).map(r => r.id),
    );
    const userPermIds = new Set(
      (selectedUser.permissions || []).map(
        p => p.id || p.permissionId,
      ),
    );
    const groupedPermissions = getGroupedPermissions();

    return (
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEdit}>
        <SafeAreaView style={styles.editSafeArea} edges={['top']}>
          {/* Modal header */}
          <View style={styles.editHeader}>
            <TouchableOpacity
              onPress={closeEdit}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon
                name="arrow-back"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.editTitle}>
              Editar usuario
            </Text>
            <View style={{width: 24}} />
          </View>

          {editLoading ? (
            <View style={styles.editLoaderContainer}>
              <ActivityIndicator
                size="large"
                color={theme.colors.accent}
              />
              <Text style={styles.editLoaderText}>
                Cargando datos...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.editBody}
              contentContainerStyle={styles.editBodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets>
              {/* Active toggle */}
              <View style={styles.editToggleRow}>
                <View style={styles.editToggleInfo}>
                  <Text style={styles.editToggleLabel}>
                    Usuario activo
                  </Text>
                  <Text style={styles.editToggleDescription}>
                    {isActive
                      ? 'El usuario puede iniciar sesión'
                      : 'El usuario no podrá iniciar sesión'}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={val => {
                    if (!val) {
                      handleToggleActive(
                        {...selectedUser, active: true},
                        true,
                      );
                    } else {
                      handleToggleActive(
                        {...selectedUser, active: false},
                        true,
                      );
                    }
                  }}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.success,
                  }}
                  thumbColor={theme.colors.white}
                />
              </View>

              {/* Name */}
              <Text style={styles.editLabel}>Nombre</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.name}
                onChangeText={val => updateEditField('name', val)}
                placeholder="Nombre del usuario"
                placeholderTextColor={theme.colors.textLight}
                returnKeyType="next"
                autoCapitalize="words"
                autoCorrect={false}
              />

              {/* Phone */}
              <Text style={styles.editLabel}>Teléfono</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.phone}
                onChangeText={val => updateEditField('phone', val)}
                placeholder="Ej: +52 55 1234 5678"
                placeholderTextColor={theme.colors.textLight}
                keyboardType="phone-pad"
                returnKeyType="next"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Birthdate */}
              <Text style={styles.editLabel}>Fecha de nacimiento</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.birthdate}
                onChangeText={val => updateEditField('birthdate', val)}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={theme.colors.textLight}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                maxLength={10}
              />
              <Text style={styles.editHint}>
                Formato: año-mes-día (ej. 1990-05-15)
              </Text>

              {/* Divider */}
              <View style={styles.editDivider} />

              {/* Roles section */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Roles</Text>
                <Text style={styles.editSectionDescription}>
                  Administrar los roles asignados al usuario
                </Text>

                {/* Current roles as removable badges */}
                {selectedUser.roles && selectedUser.roles.length > 0 ? (
                  <View style={styles.editCurrentRoles}>
                    <Text style={styles.editSubLabel}>Roles actuales</Text>
                    <View style={styles.editRoleBadgesWrap}>
                      {selectedUser.roles.map(role => (
                        <View
                          key={role.id}
                          style={[
                            styles.editRoleBadge,
                            role.name === 'admin' &&
                              styles.editRoleBadgeAdmin,
                          ]}>
                          <Text
                            style={[
                              styles.editRoleBadgeText,
                              role.name === 'admin' &&
                                styles.editRoleBadgeTextAdmin,
                            ]}>
                            {role.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              handleRemoveRole(selectedUser.id, role.id)
                            }
                            disabled={rolesSaving}
                            hitSlop={{
                              top: 4,
                              bottom: 4,
                              left: 2,
                              right: 2,
                            }}>
                            <Icon
                              name="close-circle"
                              size={16}
                              color={
                                role.name === 'admin'
                                  ? 'rgba(255,255,255,0.7)'
                                  : theme.colors.textLight
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.editEmptyRoles}>
                    Sin roles asignados
                  </Text>
                )}

                {/* Available roles to add */}
                {availableRoles.length > 0 && (
                  <View style={styles.editAvailableRoles}>
                    <Text style={styles.editSubLabel}>
                      Roles disponibles
                    </Text>
                    <View style={styles.editRoleBadgesWrap}>
                      {availableRoles
                        .filter(r => !userRoleIds.has(r.id))
                        .map(role => (
                          <TouchableOpacity
                            key={role.id}
                            style={styles.editRoleAddBadge}
                            onPress={() =>
                              handleAddRole(selectedUser.id, role.id)
                            }
                            disabled={rolesSaving}
                            activeOpacity={0.7}>
                            <Icon
                              name="add-circle-outline"
                              size={14}
                              color={theme.colors.accent}
                            />
                            <Text style={styles.editRoleAddBadgeText}>
                              {role.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={styles.editDivider} />

              {/* Permissions section */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>
                  Permisos directos
                </Text>
                <Text style={styles.editSectionDescription}>
                  Asignar permisos individuales al usuario (además de los
                  heredados por roles)
                </Text>

                {Object.entries(groupedPermissions).length > 0 ? (
                  Object.entries(groupedPermissions).map(
                    ([mod, perms]) => (
                      <View key={mod} style={styles.editModuleCard}>
                        <Text style={styles.editModuleTitle}>
                          {MODULE_LABELS[mod] || mod}
                        </Text>
                        {perms.map(perm => {
                          const isGranted = userPermIds.has(perm.id);
                          const isSaving =
                            permSaving === perm.id;

                          return (
                            <View
                              key={perm.id}
                              style={styles.editPermRow}>
                              <View style={styles.editPermInfo}>
                                <Text style={styles.editPermName}>
                                  {perm.name || perm.code}
                                </Text>
                                {perm.description ? (
                                  <Text
                                    style={styles.editPermDesc}
                                    numberOfLines={1}>
                                    {perm.description}
                                  </Text>
                                ) : null}
                              </View>
                              {isSaving ? (
                                <ActivityIndicator
                                  size="small"
                                  color={theme.colors.accent}
                                />
                              ) : (
                                <TouchableOpacity
                                  style={[
                                    styles.editPermChip,
                                    isGranted &&
                                      styles.editPermChipGranted,
                                  ]}
                                  onPress={() =>
                                    handleTogglePermission(
                                      selectedUser.id,
                                      perm.id,
                                    )
                                  }
                                  activeOpacity={0.7}>
                                  <Icon
                                    name={
                                      isGranted
                                        ? 'checkmark-circle'
                                        : 'add-circle-outline'
                                    }
                                    size={16}
                                    color={
                                      isGranted
                                        ? theme.colors.white
                                        : theme.colors.textSecondary
                                    }
                                  />
                                  <Text
                                    style={[
                                      styles.editPermChipText,
                                      isGranted &&
                                        styles.editPermChipTextGranted,
                                    ]}>
                                    {isGranted
                                      ? 'Asignado'
                                      : 'Asignar'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ),
                  )
                ) : (
                  <Text style={styles.editEmptyRoles}>
                    No hay permisos disponibles
                  </Text>
                )}
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.editSubmitBtn,
                  submitting && styles.editSubmitBtnDisabled,
                ]}
                onPress={handleSaveUser}
                disabled={submitting}
                activeOpacity={0.8}>
                {submitting ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.white}
                  />
                ) : (
                  <Text style={styles.editSubmitBtnText}>
                    Guardar cambios
                  </Text>
                )}
              </TouchableOpacity>

              {/* Bottom padding */}
              <View style={{height: theme.spacing.xxl}} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    );
  }, [
    selectedUser,
    editVisible,
    editLoading,
    editForm,
    availableRoles,
    permSaving,
    submitting,
    getGroupedPermissions,
    closeEdit,
    updateEditField,
    handleToggleActive,
    handleRemoveRole,
    handleAddRole,
    handleTogglePermission,
    handleSaveUser,
  ]);

  // ─── Logout handler ─────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      `¿Cerrar sesión de ${currentUser?.name || 'la cuenta'}?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.backBtn}>
            <Icon
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Usuarios</Text>
            <Text style={styles.headerSubtitle}>
              Administrar usuarios
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.accent}
          />
          <Text style={styles.loaderText}>
            Cargando usuarios...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.backBtn}>
            <Icon
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Usuarios</Text>
          <Text style={styles.headerSubtitle}>
            {users.length} usuario{users.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleLogout}
            hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Icon
              name="log-out-outline"
              size={22}
              color={theme.colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon
            name="search"
            size={18}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={theme.colors.textLight}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon
                name="close-circle"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Users list */}
      <FlatList
        data={users}
        keyExtractor={item => String(item.id)}
        renderItem={renderUserCard}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={
          users.length === 0 ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />

      {/* Detail bottom sheet modal */}
      {renderDetailModal()}

      {/* Edit full-screen modal */}
      {renderEditModal()}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Screen ──────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────
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
  },

  // ── Loading ─────────────────────────────────────────────────────────────
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

  // ── Search ──────────────────────────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    height: 42,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    height: 42,
    padding: 0,
    ...Platform.select({ios: {paddingVertical: 2}}),
  },

  // ── List ────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
    paddingTop: theme.spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // ── Empty state ─────────────────────────────────────────────────────────
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

  // ── User Card (list row) ────────────────────────────────────────────────
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
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarInactive: {
    backgroundColor: theme.colors.border,
  },
  cardAvatarText: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  cardAvatarTextInactive: {
    color: theme.colors.textLight,
  },
  cardBody: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: theme.colors.success,
  },
  statusDotInactive: {
    backgroundColor: theme.colors.accent,
  },
  cardEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeAdmin: {
    backgroundColor: theme.colors.accent,
  },
  roleBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  roleBadgeTextAdmin: {
    color: theme.colors.white,
  },
  inactiveTag: {
    backgroundColor: '#FDE8EC',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: theme.spacing.sm,
  },
  inactiveTagText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  cardChevron: {
    marginLeft: theme.spacing.sm,
  },

  // ── Bottom Sheet (Detail Modal) ─────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '90%',
    ...theme.shadows.lg,
  },
  sheetHandleWrapper: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  sheetScroll: {
    maxHeight: '85%',
  },
  sheetScrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  sheetLoading: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  sheetLoadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

  // ── Detail Modal Content ────────────────────────────────────────────────
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  detailAvatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarInactive: {
    backgroundColor: theme.colors.border,
  },
  detailAvatarText: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  detailAvatarTextInactive: {
    color: theme.colors.textLight,
  },
  detailHeaderInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  detailName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailStatusRow: {
    marginTop: 4,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailStatusActive: {},
  detailStatusInactive: {},
  detailStatusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  detailStatusTextActive: {
    color: theme.colors.success,
  },
  detailStatusTextInactive: {
    color: theme.colors.accent,
  },

  detailSection: {
    marginTop: theme.spacing.md,
  },
  detailSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  detailEmptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },

  // Info card
  detailInfoCard: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  detailInfoIcon: {
    marginRight: theme.spacing.sm,
  },
  detailInfoContent: {
    flex: 1,
  },
  detailInfoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  detailInfoValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginTop: 1,
  },
  detailInfoDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },

  // Roles badges in detail
  detailBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  detailRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailRoleBadgeAdmin: {
    backgroundColor: theme.colors.accent,
  },
  detailRoleBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  detailRoleBadgeTextAdmin: {
    color: theme.colors.white,
  },

  // Permissions modules in detail
  detailModuleCard: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  detailModuleTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
  },
  detailPermChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: theme.spacing.sm,
  },
  detailPermChip: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailPermChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  // Action buttons in detail
  detailActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.sm,
  },
  detailEditBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  detailToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.textSecondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.sm,
  },
  detailToggleBtnActivate: {
    backgroundColor: theme.colors.success,
  },
  detailToggleBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },

  // ── Edit Modal (Full Screen) ────────────────────────────────────────────
  editSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  editTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  editBody: {
    flex: 1,
  },
  editBodyContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  editLoaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLoaderText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

  // Toggle
  editToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.sm,
  },
  editToggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  editToggleLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editToggleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Form fields
  editLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  editInput: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md + 2,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  editHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  editDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },

  // Section
  editSection: {
    marginTop: theme.spacing.sm,
  },
  editSectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  editSectionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Roles in edit
  editCurrentRoles: {
    marginTop: theme.spacing.md,
  },
  editSubLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  editRoleBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  editRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editRoleBadgeAdmin: {
    backgroundColor: theme.colors.accent,
  },
  editRoleBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  editRoleBadgeTextAdmin: {
    color: theme.colors.white,
  },
  editAvailableRoles: {
    marginTop: theme.spacing.md,
  },
  editRoleAddBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  editRoleAddBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.accent,
  },
  editEmptyRoles: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },

  // Permissions in edit
  editModuleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    ...theme.shadows.sm,
  },
  editModuleTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.inputBg,
  },
  editPermRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  editPermInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  editPermName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  editPermDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: 1,
  },
  editPermChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editPermChipGranted: {
    backgroundColor: theme.colors.accent,
  },
  editPermChipText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  editPermChipTextGranted: {
    color: theme.colors.white,
  },

  // Submit button
  editSubmitBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  editSubmitBtnDisabled: {
    opacity: 0.6,
  },
  editSubmitBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
});

export default AdminUsersScreen;
