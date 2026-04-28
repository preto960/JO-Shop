import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import {useConfig} from '@context/ConfigContext';
import apiService from '@services/api';
import theme from '@theme/styles';
import ENV from '@config/env';
import ConfirmModal from '@components/ConfirmModal';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const ProfileScreen = () => {
  const {user, isAdmin, hasRole, logout, fetchProfile, send2FACode, verify2FASetup} = useAuth();
  const {isMultiStore} = useConfig();
  const [loggingOut, setLoggingOut] = useState(false);

  // 2FA state machine: idle → confirming → verifying → idle
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [twoFaStep, setTwoFaStep] = useState('idle'); // 'idle' | 'confirming' | 'verifying'
  const [twoFaAction, setTwoFaAction] = useState(null); // 'enable' | 'disable'
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState('');
  const [twoFaOtp, setTwoFaOtp] = useState(['', '', '', '', '', '']);
  const [twoFaResendCooldown, setTwoFaResendCooldown] = useState(0);
  const twoFaInputRefs = useRef([]);
  const mountedRef = useRef(true);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({phone: '', birthdate: ''});
  const [saving, setSaving] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  // Address CRUD modal
  const [addrModalVisible, setAddrModalVisible] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: '',
    address: '',
    city: '',
    notes: '',
    lat: null,
    lng: null,
  });
  const [addrSaving, setAddrSaving] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);

  // Google Places
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  // ConfirmModal state
  const [modal, setModal] = useState({
    visible: false,
    type: 'alert',
    title: '',
    message: '',
    confirmText: 'Aceptar',
    onConfirm: null,
  });

  const isStaff = hasRole('admin') || hasRole('editor');
  const isCustomer = hasRole('customer');
  const isDeliveryRole = hasRole('delivery');

  // ─── Load addresses ───────────────────────────────────────────────────

  const loadAddresses = useCallback(async () => {
    try {
      setAddressesLoading(true);
      const res = await apiService.fetchAddresses();
      const list = res.data || res || [];
      setAddresses(Array.isArray(list) ? list : []);
    } catch {
      // Non-critical
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isCustomer || isDeliveryRole) {
      loadAddresses();
    }
  }, [isCustomer, isDeliveryRole, loadAddresses]);

  // Limpiar refs al desmontar
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Countdown para reenviar 2FA
  useEffect(() => {
    if (twoFaResendCooldown <= 0) return;
    const timer = setInterval(() => {
      if (mountedRef.current) {
        setTwoFaResendCooldown(prev => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [twoFaResendCooldown]);

  // Sincronizar twoFactorEnabled cuando se actualiza el perfil
  useEffect(() => {
    if (user?.twoFactorEnabled !== undefined) {
      setTwoFactorEnabled(user.twoFactorEnabled);
    }
  }, [user?.twoFactorEnabled]);

  // ─── 2FA: 3-Step Flow (idle → confirming → verifying) ──────────────

  const handle2FaStart = useCallback((action) => {
    setTwoFaAction(action);
    setTwoFaError('');
    setTwoFaOtp(['', '', '', '', '', '']);
    setTwoFaStep('confirming');
  }, []);

  const handle2FaSendCode = useCallback(async () => {
    setTwoFaLoading(true);
    setTwoFaError('');
    const result = await send2FACode(twoFaAction);
    if (result.success) {
      setTwoFaStep('verifying');
      setTwoFaResendCooldown(RESEND_COOLDOWN);
      // Enfocar primer input OTP
      setTimeout(() => twoFaInputRefs.current[0]?.focus(), 300);
    } else {
      setTwoFaError(result.error);
    }
    setTwoFaLoading(false);
  }, [twoFaAction, send2FACode]);

  const handle2FaVerify = useCallback(async () => {
    const code = twoFaOtp.join('');
    if (code.length !== OTP_LENGTH) {
      setTwoFaError('Ingresa los 6 digitos del codigo');
      return;
    }
    setTwoFaLoading(true);
    setTwoFaError('');
    const result = await verify2FASetup(code, twoFaAction);
    if (result.success) {
      setTwoFactorEnabled(result.twoFactorEnabled);
      setTwoFaStep('idle');
      setTwoFaAction(null);
      setModal({
        visible: true, type: 'alert',
        title: result.twoFactorEnabled ? '2FA Activado' : '2FA Desactivado',
        message: result.twoFactorEnabled
          ? 'Se ha activado la autenticacion en 2 pasos. A partir de ahora se te pedira un codigo al iniciar sesion.'
          : 'Se ha desactivado la autenticacion en 2 pasos.',
        confirmText: 'Aceptar', onConfirm: null,
      });
    } else {
      setTwoFaError(result.error);
      setTwoFaOtp(['', '', '', '', '', '']);
      twoFaInputRefs.current[0]?.focus();
    }
    setTwoFaLoading(false);
  }, [twoFaOtp, twoFaAction, verify2FASetup]);

  const handle2FaResend = useCallback(async () => {
    if (twoFaResendCooldown > 0) return;
    setTwoFaOtp(['', '', '', '', '', '']);
    const result = await send2FACode(twoFaAction);
    if (result.success) {
      setTwoFaResendCooldown(RESEND_COOLDOWN);
      setTwoFaError('');
      twoFaInputRefs.current[0]?.focus();
    } else {
      setTwoFaError(result.error);
    }
  }, [twoFaAction, twoFaResendCooldown, send2FACode]);

  const handle2FaCancel = useCallback(() => {
    setTwoFaStep('idle');
    setTwoFaAction(null);
    setTwoFaError('');
    setTwoFaOtp(['', '', '', '', '', '']);
    setTwoFaResendCooldown(0);
  }, []);

  const handle2FaOtpChange = useCallback((index, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length > 1) {
      const chars = numericValue.slice(0, OTP_LENGTH).split('');
      const newOtp = [...twoFaOtp];
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = char;
      });
      setTwoFaOtp(newOtp);
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      twoFaInputRefs.current[nextIndex]?.focus();
      return;
    }
    const newOtp = [...twoFaOtp];
    newOtp[index] = numericValue;
    setTwoFaOtp(newOtp);
    if (numericValue && index < OTP_LENGTH - 1) {
      twoFaInputRefs.current[index + 1]?.focus();
    }
  }, [twoFaOtp]);

  const handle2FaKeyPress = useCallback((index, key) => {
    if (key === 'Backspace' && !twoFaOtp[index] && index > 0) {
      const newOtp = [...twoFaOtp];
      newOtp[index - 1] = '';
      setTwoFaOtp(newOtp);
      twoFaInputRefs.current[index - 1]?.focus();
    }
  }, [twoFaOtp]);

  const formatCooldown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Google Places Search ─────────────────────────────────────────────

  const searchPlaces = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setPlaceResults([]);
      return;
    }
    try {
      setPlacesLoading(true);
      const apiKey = ENV.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        setPlaceResults([]);
        return;
      }
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&language=es`,
      );
      const data = await response.json();
      if (data.predictions) {
        setPlaceResults(
          data.predictions.map(p => ({
            place_id: p.place_id,
            description: p.description,
          })),
        );
      }
    } catch {
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  const selectPlace = useCallback(async (place) => {
    try {
      setPlacesLoading(true);
      const apiKey = ENV.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_address,geometry&key=${apiKey}`,
      );
      const data = await response.json();
      if (data.result) {
        setAddrForm(prev => ({
          ...prev,
          address: data.result.formatted_address || place.description,
          lat: data.result.geometry?.location?.lat || null,
          lng: data.result.geometry?.location?.lng || null,
        }));
      }
      setShowPlaceSearch(false);
      setPlaceSearchQuery('');
      setPlaceResults([]);
    } catch {
      setShowPlaceSearch(false);
    } finally {
      setPlacesLoading(false);
    }
  }, []);

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
        setModal({ visible: true, type: 'alert', title: 'Error', message: 'No hay conexión con el servidor.', confirmText: 'Aceptar', onConfirm: null });
        return;
      }
      await api.put('/auth/profile', {
        phone: editForm.phone.trim() || null,
        birthdate: editForm.birthdate.trim() || null,
      });
      await fetchProfile();
      setEditModalVisible(false);
      setModal({ visible: true, type: 'alert', title: 'Perfil actualizado', message: 'Tus datos han sido guardados.', confirmText: 'Aceptar', onConfirm: null });
    } catch (err) {
      setModal({ visible: true, type: 'alert', title: 'Error', message: err.message || 'No se pudo actualizar el perfil.', confirmText: 'Aceptar', onConfirm: null });
    } finally {
      setSaving(false);
    }
  }, [editForm, fetchProfile]);

  // ─── Address CRUD ──────────────────────────────────────────────────────

  const openAddressModal = useCallback(
    (addr = null) => {
      if (addr) {
        setEditingAddrId(addr.id);
        setAddrForm({
          label: addr.label || '',
          address: addr.address || '',
          city: addr.city || '',
          notes: addr.notes || '',
          lat: addr.lat || null,
          lng: addr.lng || null,
        });
      } else {
        setEditingAddrId(null);
        setAddrForm({
          label: '',
          address: '',
          city: '',
          notes: '',
          lat: null,
          lng: null,
        });
      }
      setShowPlaceSearch(false);
      setPlaceSearchQuery('');
      setPlaceResults([]);
      setAddrModalVisible(true);
    },
    [],
  );

  const handleSaveAddress = useCallback(async () => {
    if (!addrForm.label.trim() || !addrForm.address.trim()) {
      setModal({ visible: true, type: 'alert', title: 'Datos requeridos', message: 'Ingresa etiqueta y dirección.', confirmText: 'Aceptar', onConfirm: null });
      return;
    }

    try {
      setAddrSaving(true);

      if (editingAddrId) {
        const res = await apiService.updateAddress(editingAddrId, {
          label: addrForm.label.trim(),
          address: addrForm.address.trim(),
          city: addrForm.city.trim() || null,
          notes: addrForm.notes.trim() || null,
          lat: addrForm.lat,
          lng: addrForm.lng,
        });
        const updated = res.address || res;
        setAddresses(prev =>
          prev.map(a => (a.id === editingAddrId ? updated : a)),
        );
      } else {
        const res = await apiService.createAddress({
          label: addrForm.label.trim(),
          address: addrForm.address.trim(),
          city: addrForm.city.trim() || null,
          notes: addrForm.notes.trim() || null,
          lat: addrForm.lat,
          lng: addrForm.lng,
        });
        const newAddr = res.address || res;
        setAddresses(prev => [...prev, newAddr]);
      }

      setAddrModalVisible(false);
      setModal({ visible: true, type: 'alert', title: 'Éxito', message: editingAddrId ? 'Dirección actualizada correctamente.' : 'Dirección guardada correctamente.', confirmText: 'Aceptar', onConfirm: null });
    } catch (err) {
      setModal({ visible: true, type: 'alert', title: 'Error', message: err.message || 'No se pudo guardar la dirección.', confirmText: 'Aceptar', onConfirm: null });
    } finally {
      setAddrSaving(false);
    }
  }, [addrForm, editingAddrId]);

  const handleSetDefault = useCallback(async (addrId) => {
    try {
      await apiService.setDefaultAddress(addrId);
      setAddresses(prev =>
        prev.map(a => ({...a, isDefault: a.id === addrId})),
      );
    } catch (err) {
      setModal({ visible: true, type: 'alert', title: 'Error', message: 'No se pudo cambiar la dirección principal.', confirmText: 'Aceptar', onConfirm: null });
    }
  }, []);

  const handleDeleteAddress = useCallback(
    (addr) => {
      setModal({
        visible: true, type: 'danger', title: 'Eliminar dirección',
        message: `¿Eliminar "${addr.label}"?`,
        confirmText: 'Eliminar',
        onConfirm: async () => {
          try {
            await apiService.deleteAddress(addr.id);
            setAddresses(prev => prev.filter(a => a.id !== addr.id));
            setModal({ visible: true, type: 'alert', title: 'Eliminada', message: 'Dirección eliminada.', confirmText: 'Aceptar', onConfirm: null });
          } catch {
            setModal({ visible: true, type: 'alert', title: 'Error', message: 'No se pudo eliminar la dirección.', confirmText: 'Aceptar', onConfirm: null });
          }
        },
      });
    },
    [],
  );

  // ─── Logout ────────────────────────────────────────────────────────────

  const handleLogout = () => {
    setModal({
      visible: true, type: 'danger', title: 'Cerrar sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      confirmText: 'Cerrar sesión',
      onConfirm: () => {
        setLoggingOut(true);
        setTimeout(() => logout(), 300);
      },
    });
  };

  // ─── Data ──────────────────────────────────────────────────────────────

  const roleNames = user?.roles?.map(r => r.name) || [];

  // Permisos: solo visible para staff (no para cliente)
  const permCodes = isStaff
    ? user?.permissions?.map(p => p.code) || []
    : [];
  const moduleLabels = {
    products: 'Productos',
    categories: 'Categorías',
    orders: 'Pedidos',
    delivery: 'Delivery',
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleLogout} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="log-out-outline" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
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
                        : role === 'delivery'
                          ? 'bicycle'
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

        {/* Tiendas asignadas (solo lectura, cuando multi-store activo) */}
        {isMultiStore && user?.stores && user.stores.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.sectionHeader}>
              <Icon name="storefront-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.sectionHeaderText}>Tiendas asignadas</Text>
            </View>
            {user.stores.map(store => (
              <View key={store.id} style={styles.infoRow}>
                <Icon
                  name="storefront-outline"
                  size={18}
                  color={theme.colors.textSecondary}
                  style={{marginRight: theme.spacing.md}}
                />
                <Text style={styles.infoValue}>{store.name}</Text>
              </View>
            ))}
          </View>
        )}

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
                  <Text style={styles.infoLabel}>
                    Fecha de nacimiento
                  </Text>
                  <Text style={styles.infoValue}>{user.birthdate}</Text>
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
            <Icon
              name="create-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
        )}

        {/* ─── Security Section ──────────────────────────────────────── */}
        {!isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="shield-checkmark-outline" size={18} color={theme.colors.accent} />{' '}
              Seguridad
            </Text>

            {/* STEP: Idle - Estado actual + boton de accion */}
            {twoFaStep === 'idle' && (
              <View style={styles.securityCard}>
                <View style={styles.securityRow}>
                  <View style={styles.securityInfo}>
                    <View style={[
                      styles.securityIconWrap,
                      twoFactorEnabled && { backgroundColor: theme.colors.success + '15' },
                    ]}>
                      <Icon
                        name={twoFactorEnabled ? 'shield-checkmark' : 'shield-outline'}
                        size={22}
                        color={twoFactorEnabled ? theme.colors.success : theme.colors.textSecondary}
                      />
                    </View>
                    <View style={styles.securityTextWrap}>
                      <Text style={styles.securityLabel}>Autenticacion en 2 pasos</Text>
                      <Text style={styles.securityDescription}>
                        {twoFactorEnabled
                          ? 'Activada: se te pedira un codigo al iniciar sesion'
                          : 'Desactivada: tu sesion inicia solo con correo y contrasena'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handle2FaStart(twoFactorEnabled ? 'disable' : 'enable')}
                    style={[
                      styles.twoFaActionBtn,
                      twoFactorEnabled
                        ? { backgroundColor: '#FDE8EC', borderColor: '#FF6B6B' }
                        : { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={twoFactorEnabled ? 'close-circle-outline' : 'checkmark-circle-outline'}
                      size={18}
                      color={twoFactorEnabled ? '#FF6B6B' : '#4CAF50'}
                    />
                    <Text style={[
                      styles.twoFaActionBtnText,
                      { color: twoFactorEnabled ? '#FF6B6B' : '#4CAF50' },
                    ]}>
                      {twoFactorEnabled ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP: Confirming - Explicacion + enviar codigo */}
            {twoFaStep === 'confirming' && (
              <View style={styles.securityCard}>
                <View style={styles.twoFaConfirmHeader}>
                  <Icon
                    name={twoFaAction === 'enable' ? 'shield-checkmark-outline' : 'shield-outline'}
                    size={40}
                    color={twoFaAction === 'enable' ? theme.colors.success : '#FF6B6B'}
                  />
                  <Text style={styles.twoFaConfirmTitle}>
                    {twoFaAction === 'enable' ? 'Activar' : 'Desactivar'} autenticacion en 2 pasos
                  </Text>
                  <Text style={styles.twoFaConfirmDesc}>
                    {twoFaAction === 'enable'
                      ? 'Enviaremos un codigo de verificacion a tu correo electronico para confirmar tu identidad.'
                      : 'Enviaremos un codigo de verificacion a tu correo electronico para confirmar que deseas desactivar esta funcion.'}
                  </Text>
                </View>

                {twoFaError ? (
                  <View style={styles.errorBox}>
                    <Icon name="alert-circle" size={16} color={theme.colors.accent} />
                    <Text style={styles.errorText}>{twoFaError}</Text>
                  </View>
                ) : null}

                <View style={styles.twoFaBtnRow}>
                  <TouchableOpacity
                    onPress={handle2FaCancel}
                    style={styles.twoFaCancelBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.twoFaCancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handle2FaSendCode}
                    style={[
                      styles.twoFaSendBtn,
                      twoFaAction === 'enable'
                        ? { backgroundColor: theme.colors.success }
                        : { backgroundColor: '#FF6B6B' },
                      twoFaLoading && styles.buttonDisabled,
                    ]}
                    disabled={twoFaLoading}
                    activeOpacity={0.7}
                  >
                    {twoFaLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.white} />
                    ) : (
                      <Icon name="mail-outline" size={18} color={theme.colors.white} />
                    )}
                    <Text style={styles.twoFaSendBtnText}>
                      {twoFaLoading ? 'Enviando...' : 'Enviar codigo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP: Verifying - Ingresar OTP de 6 digitos */}
            {twoFaStep === 'verifying' && (
              <View style={styles.securityCard}>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.twoFaVerifyContent}
                >
                  <Icon
                    name="mail-open-outline"
                    size={40}
                    color={theme.colors.accent}
                    style={{ marginBottom: 12 }}
                  />
                  <Text style={styles.twoFaVerifyTitle}>Ingresa el codigo de 6 digitos</Text>
                  <Text style={styles.twoFaVerifyDesc}>
                    Enviamos un codigo a <Text style={{ fontWeight: '600', color: theme.colors.accent }}>{user?.email}</Text>
                  </Text>

                  {twoFaError ? (
                    <View style={styles.errorBox}>
                      <Icon name="alert-circle" size={16} color={theme.colors.accent} />
                      <Text style={styles.errorText}>{twoFaError}</Text>
                    </View>
                  ) : null}

                  {/* OTP Inputs */}
                  <View style={styles.twoFaOtpContainer}>
                    {twoFaOtp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={ref => twoFaInputRefs.current[index] = ref}
                        style={[
                          styles.twoFaOtpInput,
                          digit && styles.twoFaOtpInputFilled,
                        ]}
                        value={digit}
                        onChangeText={value => handle2FaOtpChange(index, value)}
                        onKeyPress={({nativeEvent}) => handle2FaKeyPress(index, nativeEvent.key)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* Boton verificar */}
                  <TouchableOpacity
                    onPress={handle2FaVerify}
                    style={[
                      styles.twoFaVerifyBtn,
                      twoFaAction === 'enable'
                        ? { backgroundColor: theme.colors.success }
                        : { backgroundColor: '#FF6B6B' },
                      (twoFaLoading || twoFaOtp.join('').length !== OTP_LENGTH) && styles.buttonDisabled,
                    ]}
                    disabled={twoFaLoading || twoFaOtp.join('').length !== OTP_LENGTH}
                    activeOpacity={0.7}
                  >
                    {twoFaLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.white} />
                    ) : (
                      <Text style={styles.twoFaVerifyBtnText}>Verificar</Text>
                    )}
                  </TouchableOpacity>

                  {/* Reenviar */}
                  <View style={styles.twoFaResendContainer}>
                    {twoFaResendCooldown > 0 ? (
                      <Text style={styles.twoFaResendCooldownText}>
                        Reenviar en {formatCooldown(twoFaResendCooldown)}
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handle2FaResend} activeOpacity={0.7}>
                        <Text style={styles.twoFaResendBtnText}>Reenviar codigo</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Cancelar */}
                  <TouchableOpacity onPress={handle2FaCancel} style={styles.twoFaCancelLink} activeOpacity={0.7}>
                    <Text style={styles.twoFaCancelLinkText}>Cancelar</Text>
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              </View>
            )}
          </View>
        )}

        {/* ─── Saved Addresses Section (client only) ──────────────── */}
        {(isCustomer || isDeliveryRole) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                <Icon
                  name="location-outline"
                  size={18}
                  color={theme.colors.accent}
                />{' '}
                Mis direcciones ({addresses.length})
              </Text>
              <TouchableOpacity
                onPress={() => openAddressModal()}
                activeOpacity={0.7}>
                <Icon
                  name="add-circle-outline"
                  size={24}
                  color={theme.colors.accent}
                />
              </TouchableOpacity>
            </View>

            {addressesLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.accent}
              />
            ) : addresses.length > 0 ? (
              addresses.map(addr => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressCardLeft}>
                    <View
                      style={[
                        styles.addressIcon,
                        addr.isDefault && styles.addressIconDefault,
                      ]}>
                      <Icon
                        name={
                          addr.isDefault
                            ? 'home'
                            : addr.label.toLowerCase().includes('oficina')
                              ? 'business'
                              : 'location'
                        }
                        size={18}
                        color={
                          addr.isDefault
                            ? theme.colors.white
                            : theme.colors.textSecondary
                        }
                      />
                    </View>
                    <View style={styles.addressCardInfo}>
                      <View style={styles.addressCardLabelRow}>
                        <Text style={styles.addressCardLabel}>
                          {addr.label}
                        </Text>
                        {addr.isDefault && (
                          <View style={styles.defaultTag}>
                            <Text style={styles.defaultTagText}>
                              Principal
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressCardText} numberOfLines={2}>
                        {addr.address}
                      </Text>
                      {addr.city && (
                        <Text style={styles.addressCardCity}>
                          {addr.city}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.addressCardActions}>
                    <TouchableOpacity
                      onPress={() => openAddressModal(addr)}
                      hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
                      <Icon
                        name="create-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {!addr.isDefault && (
                      <>
                        <TouchableOpacity
                          onPress={() => handleSetDefault(addr.id)}
                          hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
                          <Icon
                            name="star-outline"
                            size={20}
                            color={theme.colors.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteAddress(addr)}
                          hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
                          <Icon
                            name="trash-outline"
                            size={20}
                            color={theme.colors.accent}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <TouchableOpacity
                style={styles.emptyAddressCard}
                onPress={() => openAddressModal()}
                activeOpacity={0.7}>
                <Icon
                  name="add-circle-outline"
                  size={36}
                  color={theme.colors.accent}
                />
                <Text style={styles.emptyAddressText}>
                  Agrega tu primera dirección
                </Text>
                <Text style={styles.emptyAddressSubtext}>
                  Para entregas rápidas y precisas
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Permisos (solo para staff, no para cliente) */}
        {isStaff && Object.keys(groupedPerms).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon
                name="key-outline"
                size={18}
                color={theme.colors.accent}
              />{' '}
              Mis Permisos ({permCodes.length})
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
          <Icon
            name="log-out-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={styles.logoutText}>
            {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Edit Profile Modal ──────────────────────────────────────── */}
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
            <View style={styles.modalHandle} />
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

      {/* ─── Address CRUD Modal ────────────────────────────────────────── */}
      <Modal
        visible={addrModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddrModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddrModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddrId ? 'Editar dirección' : 'Nueva dirección'}
              </Text>
              <TouchableOpacity
                onPress={() => setAddrModalVisible(false)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Etiqueta</Text>
              <TextInput
                value={addrForm.label}
                onChangeText={val =>
                  setAddrForm(prev => ({...prev, label: val}))
                }
                placeholder="Ej: Casa, Oficina..."
                placeholderTextColor={theme.colors.textLight}
                style={styles.input}
              />

              <Text style={styles.label}>Dirección</Text>
              <View style={styles.placeSearchRow}>
                <TextInput
                  value={addrForm.address}
                  onChangeText={text => {
                    setAddrForm(prev => ({...prev, address: text}));
                    searchPlaces(text);
                    if (ENV.GOOGLE_PLACES_API_KEY) {
                      setShowPlaceSearch(true);
                    }
                  }}
                  placeholder="Escribe o busca dirección..."
                  placeholderTextColor={theme.colors.textLight}
                  style={[styles.input, styles.placeInput]}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {ENV.GOOGLE_PLACES_API_KEY && (
                  <TouchableOpacity
                    style={styles.searchIcon}
                    onPress={() => {
                      if (addrForm.address.length >= 3) {
                        searchPlaces(addrForm.address);
                        setShowPlaceSearch(true);
                      }
                    }}>
                    <Icon
                      name="search"
                      size={20}
                      color={theme.colors.accent}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {showPlaceSearch && placeResults.length > 0 && (
                <View style={styles.placeResults}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={{maxHeight: 180}}>
                    {placesLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.accent}
                      />
                    ) : (
                      placeResults.map(place => (
                        <TouchableOpacity
                          key={place.place_id}
                          style={styles.placeResultItem}
                          onPress={() => selectPlace(place)}>
                          <Icon
                            name="location-outline"
                            size={16}
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.placeResultText} numberOfLines={2}>
                            {place.description}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              {addrForm.lat && addrForm.lng && (
                <View style={styles.coordsRow}>
                  <Icon
                    name="checkmark-circle"
                    size={14}
                    color={theme.colors.success}
                  />
                  <Text style={styles.coordsText}>
                    Ubicación verificada en Google Maps
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Ciudad</Text>
              <TextInput
                value={addrForm.city}
                onChangeText={val =>
                  setAddrForm(prev => ({...prev, city: val}))
                }
                placeholder="Ej: Caracas"
                placeholderTextColor={theme.colors.textLight}
                style={styles.input}
              />

              <Text style={styles.label}>Notas (opcional)</Text>
              <TextInput
                value={addrForm.notes}
                onChangeText={val =>
                  setAddrForm(prev => ({...prev, notes: val}))
                }
                placeholder="Punto de referencia, apartamento, etc."
                placeholderTextColor={theme.colors.textLight}
                style={[styles.input, styles.notesInput]}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <TouchableOpacity
                onPress={handleSaveAddress}
                style={[styles.saveBtn, addrSaving && styles.buttonDisabled]}
                disabled={addrSaving}
                activeOpacity={0.8}>
                {addrSaving ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingAddrId ? 'Actualizar' : 'Guardar dirección'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{height: theme.spacing.xxl}} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ConfirmModal */}
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
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
    width: 68,
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
  headerRight: {
    width: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionHeaderText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
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
  // Section
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  // Security card
  securityCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  securityIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextWrap: {
    flex: 1,
  },
  securityLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  securityDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  securityLoader: {
    marginTop: theme.spacing.sm,
  },
  // 2FA Flow styles
  twoFaActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5,
  },
  twoFaActionBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  twoFaConfirmHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  twoFaConfirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  twoFaConfirmDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8EC',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm + 2,
    marginVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  twoFaBtnRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  twoFaCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoFaCancelBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  twoFaSendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
  },
  twoFaSendBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  twoFaVerifyContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  twoFaVerifyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  twoFaVerifyDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  twoFaOtpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 20,
  },
  twoFaOtpInput: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  twoFaOtpInputFilled: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '08',
  },
  twoFaVerifyBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoFaVerifyBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  twoFaResendContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  twoFaResendCooldownText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  twoFaResendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  twoFaCancelLink: {
    marginTop: theme.spacing.md,
    paddingVertical: 8,
  },
  twoFaCancelLinkText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Address cards
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  addressCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconDefault: {
    backgroundColor: theme.colors.accent,
  },
  addressCardInfo: {
    flex: 1,
  },
  addressCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  addressCardLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  defaultTag: {
    backgroundColor: theme.colors.accent + '18',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.sm,
  },
  defaultTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  addressCardText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  addressCardCity: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  addressCardActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  emptyAddressCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xs,
  },
  emptyAddressText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  emptyAddressSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  // Permissions
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
  // Modals
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
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
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
  notesInput: {
    textAlignVertical: 'top',
    minHeight: 56,
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
  // Google Places
  placeSearchRow: {
    position: 'relative',
  },
  placeInput: {
    paddingRight: 44,
    minHeight: 70,
  },
  searchIcon: {
    position: 'absolute',
    right: theme.spacing.md,
    top: 16,
  },
  placeResults: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  placeResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  placeResultText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  coordsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '600',
  },
});

export default ProfileScreen;
