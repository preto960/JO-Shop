import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import theme from '@theme/styles';

const ProfileScreen = () => {
  const {user, isAdmin, hasRole, logout, fetchProfile} = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

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

  const roleNames = user?.roles?.map(r => r.name) || [];
  const permCodes = user?.permissions?.map(p => p.code) || [];

  // Agrupar permisos por módulo
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                style={[styles.roleBadge, role === 'admin' && styles.roleBadgeAdmin]}>
                <Icon
                  name={role === 'admin' ? 'shield' : 'person'}
                  size={14}
                  color={theme.colors.white}
                />
                <Text style={styles.roleText}>
                  {role === 'admin' ? 'Administrador' : role === 'editor' ? 'Editor' : 'Cliente'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="mail-outline" size={20} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="call-outline" size={20} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{user?.phone || 'No configurado'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={20} color={theme.colors.textSecondary} />
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

        {/* Permisos */}
        {Object.keys(groupedPerms).length > 0 && (
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
                      <Icon name="checkmark" size={12} color={theme.colors.success} />
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
});

export default ProfileScreen;
