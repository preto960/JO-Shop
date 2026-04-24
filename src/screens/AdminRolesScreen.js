import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ConfirmModal from '@components/ConfirmModal';
import Toast from '@components/Toast';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import theme from '@theme/styles';

const AdminRolesScreen = () => {
  const navigation = useNavigation();
  const {hasPermission} = useAuth();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('roles');

  // Toast state
  const [toast, setToast] = useState({visible: false, message: '', type: 'success'});

  const showToast = useCallback((message, type = 'success') => {
    setToast({visible: true, message, type});
  }, []);
  const hideToast = useCallback(() => {
    setToast(prev => ({...prev, visible: false}));
  }, []);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    visible: false, type: 'confirm', title: '', message: '',
    confirmText: 'Aceptar', onConfirm: null,
  });

  // Modals
  const [roleDetailVisible, setRoleDetailVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [userRolesVisible, setUserRolesVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [createRoleVisible, setCreateRoleVisible] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [rolesRes, usersRes, permsRes] = await Promise.all([
        apiService.fetchRoles(),
        apiService.fetchUsers(),
        apiService.fetchPermissions(),
      ]);

      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
      setUsers(Array.isArray(usersRes?.data) ? usersRes.data : []);
      const perms = Array.isArray(permsRes?.permissions) ? permsRes.permissions : [];
      setAllPermissions(perms);
    } catch (err) {
      console.error('Error loading admin data:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // ─── Role Detail ───────────────────────────────────────────────────────
  const openRoleDetail = (role) => {
    setSelectedRole(role);
    setRoleDetailVisible(true);
  };

  const closeRoleDetail = () => {
    setRoleDetailVisible(false);
    setSelectedRole(null);
  };

  const togglePermission = async (permissionId) => {
    if (!selectedRole) return;

    try {
      const currentIds = selectedRole.permissions.map(rp => rp.permissionId);
      const newIds = currentIds.includes(permissionId)
        ? currentIds.filter(id => id !== permissionId)
        : [...currentIds, permissionId];

      await apiService.updateRole(selectedRole.id, {permissionIds: newIds});

      const updated = roles.map(r =>
        r.id === selectedRole.id
          ? {
              ...r,
              permissions: r.permissions.filter(rp => rp.permissionId !== permissionId),
              ...(newIds.includes(permissionId)
                ? {
                    permissions: [
                      ...r.permissions.filter(rp => rp.permissionId !== permissionId),
                      {permissionId, permission: allPermissions.find(p => p.id === permissionId)},
                    ],
                  }
                : {}),
            }
          : r,
      );
      setRoles(updated);
      setSelectedRole(updated.find(r => r.id === selectedRole.id));
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar el permiso', 'error');
    }
  };

  // ─── User Roles ────────────────────────────────────────────────────────
  const openUserRoles = (user) => {
    setSelectedUser(user);
    setUserRolesVisible(true);
  };

  const closeUserRoles = () => {
    setUserRolesVisible(false);
    setSelectedUser(null);
  };

  const toggleUserRole = async (roleId) => {
    if (!selectedUser) return;

    try {
      const currentIds = selectedUser.roles.map(r => r.id);
      const newIds = currentIds.includes(roleId)
        ? currentIds.filter(id => id !== roleId)
        : [...currentIds, roleId];

      await apiService.updateUserRoles(selectedUser.id, newIds);
      loadData(true);
      setSelectedUser({...selectedUser, roles: roles.filter(r => newIds.includes(r.id))});
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar el rol del usuario', 'error');
    }
  };

  // ─── Create Role ───────────────────────────────────────────────────────
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      showToast('El nombre del rol es requerido', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await apiService.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || null,
      });
      setCreateRoleVisible(false);
      setNewRoleName('');
      setNewRoleDesc('');
      loadData(true);
    } catch (err) {
      showToast(err.message || 'No se pudo crear el rol', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Group permissions by module ───────────────────────────────────────
  const getGroupedPermissions = () => {
    const grouped = {};
    for (const perm of allPermissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }
    return grouped;
  };

  // ─── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Roles y Permisos</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedPermissions = getGroupedPermissions();
  const moduleLabels = {
    products: 'Productos',
    categories: 'Categorías',
    orders: 'Pedidos',
    delivery: 'Delivery',
    stores: 'Tiendas',
    users: 'Usuarios',
    dashboard: 'Dashboard',
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Roles y Permisos</Text>
        <Text style={styles.headerSub}>Gestión del sistema</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['roles', 'users'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'roles' ? `Roles (${roles.length})` : `Usuarios (${users.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'roles' ? (
        <FlatList
          data={roles}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[theme.colors.accent]} />
          }
          ListHeaderComponent={() => (
            hasPermission('users.create') ? (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setCreateRoleVisible(true)}>
                <Icon name="add" size={20} color={theme.colors.white} />
                <Text style={styles.createBtnText}>Crear Rol</Text>
              </TouchableOpacity>
            ) : null
          )}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openRoleDetail(item)}
              activeOpacity={0.7}>
              <View style={styles.cardInfo}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleName}>{item.name}</Text>
                  <View style={[styles.userCount, item._count?.users > 0 && styles.userCountActive]}>
                    <Icon name="people" size={14} color={theme.colors.white} />
                    <Text style={styles.userCountText}>{item._count?.users || 0}</Text>
                  </View>
                </View>
                {item.description ? (
                  <Text style={styles.roleDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}
                <Text style={styles.permCount}>
                  {item.permissions?.length || 0} permiso(s)
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[theme.colors.accent]} />
          }
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openUserRoles(item)}
              activeOpacity={0.7}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.rolesList}>
                  {item.roles?.map(role => (
                    <View
                      key={role.id}
                      style={[
                        styles.roleBadge,
                        role.name === 'admin' && styles.roleBadgeAdmin,
                      ]}>
                      <Text style={styles.roleBadgeText}>{role.name}</Text>
                    </View>
                  ))}
                  {item.permissions?.length > 0 && (
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>+{item.permissions.length} perm. directo(s)</Text>
                    </View>
                  )}
                </View>
              </View>
              <Icon name="chevron-forward" size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* ─── Role Detail Modal ─────────────────────────────────────────── */}
      <Modal visible={roleDetailVisible} animationType="slide" onRequestClose={closeRoleDetail}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeRoleDetail} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedRole?.name || 'Rol'}</Text>
            <View style={{width: 28}} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedRole?.description ? (
              <Text style={styles.modalDesc}>{selectedRole.description}</Text>
            ) : null}

            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <View key={module} style={styles.moduleSection}>
                <Text style={styles.moduleTitle}>{moduleLabels[module] || module}</Text>
                {perms.map(perm => {
                  const isAssigned = selectedRole?.permissions?.some(rp => rp.permissionId === perm.id);
                  return (
                    <View key={perm.id} style={styles.permRow}>
                      <View style={styles.permInfo}>
                        <Text style={styles.permName}>{perm.name}</Text>
                        <Text style={styles.permCode}>{perm.code}</Text>
                      </View>
                      <Switch
                        value={isAssigned}
                        onValueChange={() => togglePermission(perm.id)}
                        trackColor={{
                          false: theme.colors.border,
                          true: theme.colors.accent,
                        }}
                        thumbColor={theme.colors.white}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── User Roles Modal ──────────────────────────────────────────── */}
      <Modal visible={userRolesVisible} animationType="slide" onRequestClose={closeUserRoles}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeUserRoles} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Roles de {selectedUser?.name}</Text>
            <View style={{width: 28}} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.sectionLabel}>Asignar Roles</Text>
            {roles.map(role => {
              const isAssigned = selectedUser?.roles?.some(r => r.id === role.id);
              return (
                <View key={role.id} style={styles.permRow}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permName}>{role.name}</Text>
                    {role.description ? (
                      <Text style={styles.permCode}>{role.description}</Text>
                    ) : null}
                  </View>
                  <Switch
                    value={isAssigned}
                    onValueChange={() => toggleUserRole(role.id)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.accent,
                    }}
                    thumbColor={theme.colors.white}
                  />
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── Create Role Modal ─────────────────────────────────────────── */}
      <Modal visible={createRoleVisible} animationType="slide" transparent onRequestClose={() => setCreateRoleVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setCreateRoleVisible(false)} activeOpacity={1} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Crear Rol</Text>
              <TouchableOpacity onPress={() => setCreateRoleVisible(false)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del rol *</Text>
              <TextInput
                style={styles.textInput}
                value={newRoleName}
                onChangeText={setNewRoleName}
                placeholder="Ej: supervisor"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newRoleDesc}
                onChangeText={setNewRoleDesc}
                placeholder="Descripción del rol..."
                placeholderTextColor={theme.colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleCreateRole}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Crear Rol</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
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
  headerTitle: {fontSize: theme.fontSize.title, fontWeight: '700', color: theme.colors.text},
  headerSub: {fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2},
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: theme.colors.accent},
  tabText: {fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.textSecondary},
  tabTextActive: {color: theme.colors.accent},
  list: {padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl},
  centerContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.md},
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm + 2,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  createBtnText: {fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.white},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  cardInfo: {flex: 1, marginRight: theme.spacing.sm},
  roleHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  roleName: {fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text},
  roleDesc: {fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2},
  permCount: {fontSize: theme.fontSize.xs, color: theme.colors.accent, marginTop: 4, fontWeight: '500'},
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.textLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  userCountActive: {backgroundColor: theme.colors.accent},
  userCountText: {fontSize: 11, fontWeight: '600', color: theme.colors.white},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {fontSize: 18, fontWeight: '700', color: theme.colors.white},
  userName: {fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text},
  userEmail: {fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2},
  rolesList: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4},
  roleBadge: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeAdmin: {backgroundColor: theme.colors.accent},
  roleBadgeText: {fontSize: theme.fontSize.xs, fontWeight: '500', color: theme.colors.textSecondary},
  // Modal
  modalSafeArea: {flex: 1, backgroundColor: theme.colors.background},
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  modalTitle: {fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text},
  modalDesc: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  modalContent: {paddingBottom: theme.spacing.xxl},
  sectionLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  moduleSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    overflow: 'hidden',
  },
  moduleTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.inputBg,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  permInfo: {flex: 1, marginRight: theme.spacing.md},
  permName: {fontSize: theme.fontSize.md, color: theme.colors.text, fontWeight: '500'},
  permCode: {fontSize: theme.fontSize.xs, color: theme.colors.textLight, marginTop: 2},
  // Bottom Sheet
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
  bottomSheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  bottomSheetTitle: {fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text},
  formGroup: {marginBottom: theme.spacing.md},
  label: {fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs},
  textInput: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  textArea: {minHeight: 80, textAlignVertical: 'top'},
  submitBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  btnDisabled: {opacity: 0.6},
  submitBtnText: {fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.white},
});

export default AdminRolesScreen;
