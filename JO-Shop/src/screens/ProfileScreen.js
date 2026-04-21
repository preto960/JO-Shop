import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import theme from '@theme/styles';

const ProfileScreen = () => {
  const {user, isAdmin, hasRole, logout, fetchProfile} = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({phone: '', birthdate: ''});
  const [saving, setSaving] = useState(false);

  const isStaff = hasRole('admin') || hasRole('editor');

  // ─── Edit profile ──────────────────────────────────────────────────────

  const openEditModal = useCallback(() => {
    setEditForm({
      phone: user?.phone || '',
      birthdate: user?.birthdate || '',
    });
    setEditModalVisible(true);
  }, [user?.phone, user?.birthdate]);

  const handleSaveProfile = useCallback(async () => {
    try {
      setSaving(true);
      const api = await apiService.createApiClient();
      if (!api) {
        Alert.alert('Error', 'No hay conexión con el servidor.');
        return;
      }
      await api.put('/auth/profile', {
        phone: editForm.phone.trim() || null,
        birthdate: editForm.birthdate.trim() || null,
      });
      await fetchProfile();
      setEditModalVisible(false);
      Alert.alert('Perfil actualizado', 'Tus datos han sido guardados.');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  }, [editForm, fetchProfile]);

  // ─── Logout ────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            setLoggingOut(true);
            setTimeout(() => logout(), 300);
          },
        },
      ],
    );
  };

  // ─── Data ──────────────────────────────────────────────────────────────

  const roleNames = user?.roles?.map(r => r.name) || [];

  // Permisos: solo visible para admin/editor (no para cliente)
  const permCodes = isStaff ? (user?.permissions?.map(p => p.code) || []) : [];
  const moduleLabels = {
    products: 'Productos',
    categories: 'Categorías',
    orders: 'Pedidos',
    users: 'Usuarios',
    dashboard: 'Dashboard',
  };

  const groupedPerms = {};
  for (const code of permCodes) {
    const [mod] = code.split('.');
    if (!groupedPerms[mod]) groupedPerms[mod] = [];
    groupedPerms[mod].push(code);
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Avatar y nombre */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
          <View style={styles.roleBadges}>
            {roleNames.map(role => (
              <View
                key={role}
                style={[
                  styles.roleBadge,
                  role === 'admin' && styles.roleBadgeAdmin,
                ]}>
                <Icon
                  name={
                    role === 'admin'
                      ? 'shield'
                      : role === 'editor'
                        ? 'create'
                        : 'person'
                  }
                  size={14}
                  color={
                    role === 'admin' || role === 'editor'
                      ? theme.colors.white
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.roleText,
                    (role === 'admin' || role === 'editor') &&
                      styles.roleTextWhite,
                  ]}>
                  {role === 'admin'
                    ? 'Administrador'
                    : role === 'editor'
                      ? 'Editor'
                      : role === 'delivery'
                        ? 'Delivery'
                        : 'Cliente'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon
              name="mail-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon
              name="call-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>
                {user?.phone || 'No configurado'}
              </Text>
            </View>
          </View>

          {user?.birthdate && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Icon
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Fecha de nacimiento</Text>
                  <Text style={styles.infoValue}>{user.birthdate}</Text>
                </View>
              </View>
            </>
          )}

          {user?.address && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Icon
                  name="location-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{user.address}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon
              name="time-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Miembro desde</Text>
              <Text style={styles.infoValue}>
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                    })
                  : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit profile button (not for admin — they edit in user management) */}
        {!isAdmin && (
          <TouchableOpacity
            onPress={openEditModal}
            style={styles.editButton}
            activeOpacity={0.8}>
            <Icon name="create-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
        )}

        {/* Permisos (solo para staff, no para cliente) */}
        {isStaff && Object.keys(groupedPerms).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="key-outline" size={18} color={theme.colors.accent} />
              {' '}Mis Permisos ({permCodes.length})
            </Text>
            {Object.entries(groupedPerms).map(([module, codes]) => (
              <View key={module} style={styles.permModule}>
                <Text style={styles.permModuleLabel}>
                  {moduleLabels[module] || module}
                </Text>
                <View style={styles.permList}>
                  {codes.map(code => (
                    <View key={code} style={styles.permChip}>
                      <Icon
                        name="checkmark"
                        size={12}
                        color={theme.colors.success}
                      />
                      <Text style={styles.permChipText}>{code}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cerrar sesión */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutButton, loggingOut && styles.buttonDisabled]}
          disabled={loggingOut}
          activeOpacity={0.8}>
          <Icon name="log-out-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.logoutText}>
            {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                value={editForm.phone}
                onChangeText={val =>
                  setEditForm(prev => ({...prev, phone: val}))
                }
                placeholder="Tu número de teléfono"
                placeholderTextColor={theme.colors.textLight}
                style={styles.input}
                keyboardType="phone-pad"
                maxLength={20}
              />

              <Text style={styles.label}>Fecha de nacimiento</Text>
              <TextInput
                value={editForm.birthdate}
                onChangeText={val =>
                  setEditForm(prev => ({...prev, birthdate: val}))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textLight}
                style={styles.input}
                keyboardType="number-pad"
                maxLength={10}
              />

              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.saveBtn, saving && styles.buttonDisabled]}
                disabled={saving}
                activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.white,
  },
  userName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  roleBadges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.inputBg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.xl,
  },
  roleBadgeAdmin: {
    backgroundColor: theme.colors.accent,
  },
  roleText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  roleTextWhite: {
    color: theme.colors.white,
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
    marginTop: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
  },
  editButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  permModule: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  permModuleLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  permList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  permChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logoutText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalBody: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});

export default ProfileScreen;
