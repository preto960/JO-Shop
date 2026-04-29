import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Linking,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '@context/AuthContext';
import {useConfig} from '@context/ConfigContext';
import apiService from '@services/api';
import ENV from '@config/env';
import {normalizeUrl, isValidUrl} from '@utils/helpers';
import {launchImageLibrary} from 'react-native-image-picker';
import ConfirmModal from '@components/ConfirmModal';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {isAdmin} = useAuth();
  const { primary } = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);
  const {config, isMultiStore, updateConfig} = useConfig();
  const [baseUrl, setBaseUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const envUrl = ENV.API_URL || '';
  const [modal, setModal] = useState({visible: false, type: 'alert', title: '', message: '', confirmText: 'Aceptar', onConfirm: null});

  // State for the multi-store toggle (local optimistic)
  const [multiStoreSwitch, setMultiStoreSwitch] = useState(isMultiStore);
  const [switchLoading, setSwitchLoading] = useState(false);

  // Keep local switch in sync with config context
  useEffect(() => {
    setMultiStoreSwitch(isMultiStore);
  }, [isMultiStore]);

  // Cargar configuración guardada (puede ser override del env)
  useEffect(() => {
    const loadConfig = async () => {
      const config = await apiService.getApiConfig();
      // Mostrar la URL activa (runtime override o env default)
      const activeUrl = config.baseUrl || envUrl;
      setBaseUrl(activeUrl);
      // "saved" indica si hay un override manual activo
      const stored = await AsyncStorage.getItem('@joshop_api_config');
      const parsed = stored ? JSON.parse(stored) : null;
      setSaved(!!(parsed?.baseUrl && parsed.baseUrl.trim() !== ''));
    };
    loadConfig();
  }, []);

  const handleTestConnection = async () => {
    const url = normalizeUrl(baseUrl);
    if (!isValidUrl(url)) {
      setModal({visible: true, type: 'alert', title: 'URL inválida', message: 'Ingresa una URL válida (ej: https://mi-api.com)', confirmText: 'Aceptar', onConfirm: null});
      return;
    }

    setTesting(true);
    setConnectionStatus(null);
    const result = await apiService.checkConnection(url);
    setConnectionStatus(result);
    setTesting(false);
  };

  const handleSave = async () => {
    const url = normalizeUrl(baseUrl);
    if (!url || !isValidUrl(url)) {
      setModal({visible: true, type: 'alert', title: 'URL inválida', message: 'Ingresa una URL válida para el servidor.', confirmText: 'Aceptar', onConfirm: null});
      return;
    }

    const success = await apiService.saveApiConfig({
      ...(await apiService.getApiConfig()),
      baseUrl: url,
    });

    if (success) {
      setSaved(true);
      setModal({visible: true, type: 'alert', title: 'Guardado', message: 'Se usará esta URL como servidor.\n\nReinicia la app para aplicar los cambios completamente.', confirmText: 'Aceptar', onConfirm: null});
    } else {
      setModal({visible: true, type: 'alert', title: 'Error', message: 'No se pudo guardar la configuración.', confirmText: 'Aceptar', onConfirm: null});
    }
  };

  const handleResetToEnv = () => {
    setModal({
      visible: true,
      type: 'confirm',
      title: 'Restaurar URL por defecto',
      message: `Se eliminará la URL personalizada y se usará:\n${envUrl}`,
      confirmText: 'Restaurar',
      onConfirm: async () => {
        await apiService.clearApiConfig();
        setBaseUrl(envUrl);
        setSaved(false);
        setConnectionStatus(null);
      },
    });
  };

  // ─── Multi-Store Toggle (sin modal, Switch directo) ──────────────────────
  const handleMultiStoreToggle = async (newValue) => {
    // Optimistic update
    setMultiStoreSwitch(newValue);
    setSwitchLoading(true);

    try {
      await updateConfig({multi_store: String(newValue)});
    } catch (err) {
      // Revert on error
      setMultiStoreSwitch(!newValue);
      setModal({
        visible: true,
        type: 'alert',
        title: 'Error',
        message: 'No se pudo actualizar la configuración. Verifica tu conexión.',
        confirmText: 'Aceptar',
        onConfirm: null,
      });
    } finally {
      setSwitchLoading(false);
    }
  };

  // ─── Appearance State ────────────────────────────────────────────────
  const [shopName, setShopName] = useState(config.shop_name || 'JO-Shop');
  const [primaryColor, setPrimaryColor] = useState(config.primary_color || '#FF6B35');
  const [accentColor, setAccentColor] = useState(config.accent_color || '#E94560');
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    setShopName(config.shop_name || 'JO-Shop');
    setPrimaryColor(config.primary_color || '#FF6B35');
    setAccentColor(config.accent_color || '#E94560');
  }, [config.shop_name, config.primary_color, config.accent_color]);

  const handleSaveAppearance = useCallback(async () => {
    setSavingAppearance(true);
    try {
      await updateConfig({
        shop_name: shopName,
        primary_color: primaryColor,
        accent_color: accentColor,
      });
    } catch (err) {
      setModal({visible: true, type: 'alert', title: 'Error', message: 'No se pudo guardar la apariencia.', confirmText: 'Aceptar', onConfirm: null});
    } finally {
      setSavingAppearance(false);
    }
  }, [shopName, primaryColor, accentColor, updateConfig]);

  const handlePickLogo = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        Alert.alert('Error', 'La imagen no debe superar 2MB');
        return;
      }

      setLogoUploading(true);
      try {
        const api = await apiService.createApiClient();
        const formData = new FormData();
        const fileUri = asset.uri;
        const filename = asset.fileName || fileUri.split('/').pop() || 'logo.png';
        formData.append('file', {
          uri: fileUri,
          name: filename,
          type: asset.type || 'image/jpeg',
        });
        const res = await api.post('/config/upload-logo', formData, {
          headers: {'Content-Type': 'multipart/form-data'},
          transformRequest: (data) => data,
        });
        const logoUrl = res?.url || res?.data?.url;
        if (logoUrl) {
          await updateConfig({shop_logo_url: logoUrl});
        }
      } catch (err) {
        Alert.alert('Error', 'No se pudo subir el logo.');
      } finally {
        setLogoUploading(false);
      }
    } catch (err) {
      // Picker error
    }
  }, [updateConfig]);

  const handleDeleteLogo = useCallback(async () => {
    setModal({
      visible: true, type: 'confirm', title: 'Eliminar logo',
      message: 'Se eliminara el logo actual del sistema.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          const api = await apiService.createApiClient();
          await api.delete('/config/upload-logo');
          await updateConfig({shop_logo_url: ''});
        } catch (err) {
          Alert.alert('Error', 'No se pudo eliminar el logo.');
        }
      },
    });
  }, [updateConfig]);

  const resetAppearanceDefaults = () => {
    setShopName('JO-Shop');
    setPrimaryColor('#FF6B35');
    setAccentColor('#E94560');
  };

  // ─── Banners State (nueva API CRUD con tabla dedicada) ───────────────
  const [bannersEnabled, setBannersEnabled] = useState(
    config.banners_enabled === 'true' || config.banners_enabled === true
  );
  const [banners, setBanners] = useState([]);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerMenuId, setBannerMenuId] = useState(null);
  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [durationInput, setDurationInput] = useState('');
  const durationInputRef = useRef(null);

  useEffect(() => {
    setBannersEnabled(config.banners_enabled === 'true' || config.banners_enabled === true);
  }, [config.banners_enabled]);

  const loadBanners = useCallback(async () => {
    if (config.banners_enabled !== 'true' && config.banners_enabled !== true) {
      setBanners([]);
      return;
    }
    setBannerLoading(true);
    try {
      const api = await apiService.createApiClient();
      const res = await api.get('/banners/all');
      const list = Array.isArray(res) ? res : res?.data || [];
      setBanners(list);
    } catch {
      setBanners([]);
    } finally {
      setBannerLoading(false);
    }
  }, [config.banners_enabled]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleBannersToggle = async (value) => {
    setBannersEnabled(value);
    try {
      await updateConfig({banners_enabled: String(value)});
    } catch {
      setBannersEnabled(!value);
      setModal({visible: true, type: 'alert', title: 'Error', message: 'No se pudo actualizar la configuración.', confirmText: 'Aceptar', onConfirm: null});
    }
  };

  const handleAddBanner = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Error', 'El archivo no debe superar 5MB');
        return;
      }

      // Pedir duración al usuario
      Alert.prompt(
        'Duración del banner',
        '¿Cuántos segundos debe mostrarse cada banner antes de cambiar al siguiente? (1-30)',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => {} },
          {
            text: 'Subir',
            onPress: async (durationText) => {
              const duration = parseInt(durationText) || 4;
              setBannerUploading(true);
              try {
                const api = await apiService.createApiClient();
                const formData = new FormData();
                formData.append('file', {
                  uri: asset.uri,
                  name: asset.fileName || 'banner.jpg',
                  type: asset.type || 'image/jpeg',
                });
                formData.append('duration', String(Math.max(1, Math.min(30, duration))));
                const res = await api.post('/banners', formData, {
                  headers: {'Content-Type': 'multipart/form-data'},
                  transformRequest: (data) => data,
                });
                const newBanner = res?.banner || res?.data?.banner;
                if (newBanner) {
                  setBanners(prev => [...prev, newBanner]);
                  if (!bannersEnabled) {
                    setBannersEnabled(true);
                    await updateConfig({banners_enabled: 'true'});
                  }
                }
              } catch (err) {
                Alert.alert('Error', 'No se pudo subir el banner.');
              } finally {
                setBannerUploading(false);
              }
            },
          },
        ],
        'plain-text',
        '4',
        'number-pad',
      );
    } catch {
      // Picker error
    }
  }, [bannersEnabled, updateConfig]);

  const handleEditBannerDuration = useCallback((banner) => {
    setBannerMenuId(null);
    setEditingBanner(banner);
    setDurationInput(String(banner.duration || 4));
    setDurationModalVisible(true);
    setTimeout(() => durationInputRef.current?.focus(), 300);
  }, []);

  const handleSaveDuration = useCallback(async () => {
    const duration = parseInt(durationInput);
    if (!duration || duration < 4 || duration > 30) {
      Alert.alert('Error', 'La duración debe ser entre 4 y 30 segundos.');
      return;
    }
    try {
      const api = await apiService.createApiClient();
      const formData = new FormData();
      formData.append('duration', String(duration));
      const res = await api.put(`/banners/${editingBanner.id}`, formData, {
        headers: {'Content-Type': 'multipart/form-data'},
        transformRequest: (data) => data,
      });
      const updated = res?.banner || res?.data?.banner;
      if (updated) {
        setBanners(prev => prev.map(b => b.id === editingBanner.id ? updated : b));
      }
      setDurationModalVisible(false);
      setEditingBanner(null);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la duración.');
    }
  }, [durationInput, editingBanner]);

  const handleRemoveBanner = useCallback(async (bannerId) => {
    setBannerMenuId(null);
    setBanners(prev => prev.filter(b => b.id !== bannerId));
    try {
      const api = await apiService.createApiClient();
      await api.delete(`/banners/${bannerId}`);
    } catch {
      loadBanners();
      Alert.alert('Error', 'No se pudo eliminar el banner.');
    }
  }, [loadBanners]);

  const handleToggleBannerActive = useCallback(async (banner) => {
    const newActive = !banner.active;
    setBanners(prev => prev.map(b => b.id === banner.id ? {...b, active: newActive} : b));
    try {
      const api = await apiService.createApiClient();
      const formData = new FormData();
      formData.append('active', String(newActive));
      const res = await api.put(`/banners/${banner.id}`, formData, {
        headers: {'Content-Type': 'multipart/form-data'},
        transformRequest: (data) => data,
      });
      const updated = res?.banner || res?.data?.banner;
      if (updated) {
        setBanners(prev => prev.map(b => b.id === banner.id ? updated : b));
      }
    } catch {
      setBanners(prev => prev.map(b => b.id === banner.id ? {...b, active: !newActive} : b));
      Alert.alert('Error', 'No se pudo cambiar el estado.');
    }
  }, []);

  const openPrivacyPolicy = () => {
    Linking.openURL('https://example.com/privacy').catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Configuración</Text>
          </View>
          <View style={{width: 40}} />
        </View>

        {/* URL del entorno (embebida en compilación) — SOLO ADMIN */}
        {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servidor Backend</Text>

          {/* Tarjeta con la URL embebida */}
          <View style={styles.envCard}>
            <View style={styles.envCardHeader}>
              <Icon name="hardware-chip-outline" size={18} color={primary} />
              <Text style={styles.envCardTitle}>URL embebida (compilación)</Text>
            </View>
            <Text style={styles.envUrlText} numberOfLines={1}>
              {envUrl || 'No configurada'}
            </Text>
            <Text style={styles.envHint}>
              Definida en src/config/env.js antes de compilar
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                URL del servidor {saved ? '(personalizada)' : ''}
              </Text>
              <TextInput
                value={baseUrl}
                onChangeText={text => {
                  setBaseUrl(text);
                  setConnectionStatus(null);
                }}
                placeholder={envUrl || 'https://mi-servidor.com'}
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
              <Text style={styles.inputHint}>
                {saved
                  ? 'Usando URL personalizada. Deja vacío para volver a la embebida.'
                  : `Usando URL embebida. Escribe otra para sobreescribir.`}
              </Text>
            </View>

            {/* Estado de conexión */}
            {connectionStatus && (
              <View
                style={[
                  styles.statusBadge,
                  connectionStatus.success
                    ? styles.statusSuccess
                    : styles.statusError,
                ]}>
                <Icon
                  name={connectionStatus.success ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={
                    connectionStatus.success
                      ? theme.colors.success
                      : primary
                  }
                />
                <Text
                  style={[
                    styles.statusText,
                    connectionStatus.success
                      ? styles.statusTextSuccess
                      : styles.statusTextError,
                  ]}>
                  {connectionStatus.message}
                </Text>
              </View>
            )}

            {/* Botones de acción */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleTestConnection}
                style={[styles.actionButton, styles.testButton]}
                disabled={testing || !baseUrl.trim()}
                activeOpacity={0.8}>
                <Icon name="wifi-outline" size={18} color={theme.colors.text} />
                <Text style={styles.actionButtonText}>
                  {testing ? 'Probando...' : 'Probar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.actionButton, styles.saveButton]}
                activeOpacity={0.8}>
                <Icon name="save-outline" size={18} color={theme.colors.white} />
                <Text style={[styles.actionButtonText, {color: theme.colors.white}]}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón restaurar env */}
          {saved && (
            <TouchableOpacity
              onPress={handleResetToEnv}
              style={styles.resetButton}
              activeOpacity={0.8}>
              <Icon name="refresh-outline" size={18} color={primary} />
              <Text style={styles.resetButtonText}>
                Restaurar URL embebida
              </Text>
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* ─── Configuración de Multi-Store (solo admin) ─────────────────── */}
        {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo de Tienda</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleIconRow}>
                  <Icon name="storefront-outline" size={22} color={primary} />
                  <Text style={styles.toggleLabel}>Multi-Tienda</Text>
                </View>
                <Text style={styles.toggleDescription}>
                  {multiStoreSwitch
                    ? 'Los clientes y delivery verán filtro de tienda. Los productos se asignan a tiendas específicas.'
                    : 'Modo tienda única. No se muestra filtro de tienda ni asignación de productos por tienda.'}
                </Text>
              </View>
              <View style={styles.switchWrapper}>
                {switchLoading ? (
                  <ActivityIndicator size="small" color={primary} />
                ) : (
                  <Switch
                    value={multiStoreSwitch}
                    onValueChange={handleMultiStoreToggle}
                    trackColor={{
                      false: theme.colors.border,
                      true: primary,
                    }}
                    thumbColor={theme.colors.white}
                  />
                )}
              </View>
            </View>

            <View style={styles.modeIndicator}>
              <View style={[styles.modeDot, multiStoreSwitch ? styles.modeDotMulti : styles.modeDotSingle]} />
              <Text style={styles.modeText}>
                {multiStoreSwitch ? 'Modo Multi-Tienda activado' : 'Modo Tienda Única activado'}
              </Text>
            </View>

            <Text style={styles.configHint}>
              Los usuarios conectados detectarán el cambio automáticamente en los próximos segundos.
            </Text>
          </View>
        </View>
        )}

        {/* ─── Apariencia (solo admin) ──────────────────────────────────── */}
        {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          <View style={styles.card}>
            {/* Nombre del sistema */}
            <Text style={styles.appearanceLabel}>Nombre del sistema</Text>
            <View style={styles.appearanceInputWrap}>
              <Icon name="text-outline" size={18} color={theme.colors.textSecondary} />
              <TextInput
                value={shopName}
                onChangeText={setShopName}
                placeholder="JO-Shop"
                placeholderTextColor={theme.colors.textLight}
                style={styles.appearanceInput}
                autoCapitalize="words"
              />
            </View>

            {/* Colores */}
            <View style={styles.colorsRow}>
              <View style={styles.colorItem}>
                <Text style={styles.appearanceLabel}>Color primario</Text>
                <View style={styles.colorInputRow}>
                  <View style={[styles.colorPreview, {backgroundColor: primaryColor}]} />
                  <TextInput
                    value={primaryColor}
                    onChangeText={text => { if (/^#[0-9A-Fa-f]{0,6}$/.test(text)) setPrimaryColor(text); }}
                    placeholder="#FF6B35"
                    placeholderTextColor={theme.colors.textLight}
                    style={styles.colorTextInput}
                    maxLength={7}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.colorItem}>
                <Text style={styles.appearanceLabel}>Color secundario</Text>
                <View style={styles.colorInputRow}>
                  <View style={[styles.colorPreview, {backgroundColor: accentColor}]} />
                  <TextInput
                    value={accentColor}
                    onChangeText={text => { if (/^#[0-9A-Fa-f]{0,6}$/.test(text)) setAccentColor(text); }}
                    placeholder="#E94560"
                    placeholderTextColor={theme.colors.textLight}
                    style={styles.colorTextInput}
                    maxLength={7}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            {/* Preview */}
            <Text style={[styles.appearanceLabel, {marginTop: 4}]}>Vista previa</Text>
            <View style={[styles.previewCard, {backgroundColor: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`}]}>
              <Text style={styles.previewName}>{shopName || 'JO-Shop'}</Text>
              <Text style={styles.previewSubtext}>Tu tienda de confianza</Text>
            </View>
            <View style={styles.previewColors}>
              <View style={[styles.previewSwatch, {backgroundColor: primaryColor}]} />
              <View style={[styles.previewSwatch, {backgroundColor: accentColor}]} />
            </View>

            {/* Logo */}
            <Text style={[styles.appearanceLabel, {marginTop: 4}]}>Logo del sistema</Text>
            <View style={styles.logoRow}>
              <TouchableOpacity onPress={handlePickLogo} disabled={logoUploading} activeOpacity={0.7}>
                <View style={styles.logoPreview}>
                  {logoUploading ? (
                    <ActivityIndicator size="small" color={primary} />
                  ) : config.shop_logo_url ? (
                    <Image source={{uri: config.shop_logo_url}} style={styles.logoImage} resizeMode="cover" />
                  ) : (
                    <Icon name="image-outline" size={28} color={theme.colors.textLight} />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.logoActions}>
                <TouchableOpacity onPress={handlePickLogo} disabled={logoUploading} style={styles.logoBtn} activeOpacity={0.7}>
                  <Icon name="cloud-upload-outline" size={16} color={primary} />
                  <Text style={styles.logoBtnText}>{logoUploading ? 'Subiendo...' : 'Subir logo'}</Text>
                </TouchableOpacity>
                {config.shop_logo_url ? (
                  <TouchableOpacity onPress={handleDeleteLogo} style={styles.logoBtn} activeOpacity={0.7}>
                    <Icon name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.logoBtnText, {color: '#EF4444'}]}>Eliminar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <Text style={styles.logoHint}>Maximo 2MB. Formatos: JPG, PNG, WebP</Text>

            {/* Save / Reset */}
            <View style={styles.appearanceButtons}>
              <TouchableOpacity onPress={resetAppearanceDefaults} style={styles.appearanceResetBtn} activeOpacity={0.7}>
                <Icon name="refresh-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.appearanceResetBtnText}>Restaurar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveAppearance} disabled={savingAppearance} style={[styles.appearanceSaveBtn, savingAppearance && {opacity: 0.6}]} activeOpacity={0.7}>
                {savingAppearance ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Icon name="checkmark-outline" size={16} color={theme.colors.white} />
                )}
                <Text style={styles.appearanceSaveBtnText}>
                  {savingAppearance ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        )}

        {/* ─── Banners de Publicidad (solo admin) ───────────────────────── */}
        {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banners de Publicidad</Text>
          <View style={styles.card}>
            {/* Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleIconRow}>
                  <Icon name="images-outline" size={22} color={primary} />
                  <Text style={styles.toggleLabel}>Banners activos</Text>
                </View>
                <Text style={styles.toggleDescription}>
                  {bannersEnabled
                    ? 'Los banners se muestran en la página principal de la tienda.'
                    : 'Los banners están ocultos. Activa para mostrarlos.'}
                </Text>
              </View>
              <View style={styles.switchWrapper}>
                <Switch
                  value={bannersEnabled}
                  onValueChange={handleBannersToggle}
                  trackColor={{false: theme.colors.border, true: primary}}
                  thumbColor={theme.colors.white}
                />
              </View>
            </View>

            {bannersEnabled && (
              <>
                {/* Lista de banners */}
                {bannerLoading ? (
                  <ActivityIndicator size="small" color={primary} style={{marginVertical: 16}} />
                ) : banners.length > 0 ? (
                  <View style={styles.bannerList}>
                    {banners.map((banner) => (
                      <View key={`banner-${banner.id}`} style={[styles.bannerItem, !banner.active && styles.bannerItemInactive]}>
                        <View style={styles.bannerItemRow}>
                        <Image source={{uri: banner.imageUrl}} style={styles.bannerThumb} resizeMode="cover" />
                        <View style={styles.bannerItemInfo}>
                          <Text style={styles.bannerItemLabel}>
                            Banner {banner.sortOrder}
                            <Text style={{fontSize: 11, color: theme.colors.textLight, fontWeight: '400', marginLeft: 6}}>
                              {banner.mediaType === 'video' ? 'Video' : 'Imagen'}
                            </Text>
                            <Text style={{fontSize: 11, color: '#F39C12', fontWeight: '600', marginLeft: 6}}>
                              {banner.duration}s
                            </Text>
                          </Text>
                          {banner.link ? (
                            <Text style={styles.bannerItemUrl} numberOfLines={1}>{banner.link}</Text>
                          ) : null}
                          <Text style={{fontSize: 10, color: banner.active ? theme.colors.textLight : '#EF4444', marginTop: 2}}>
                            {banner.active ? 'Visible' : 'Inactivo'}
                          </Text>
                        </View>
                        </View>
                        {/* Three-dot menu */}
                        <TouchableOpacity
                          onPress={() => setBannerMenuId(bannerMenuId === banner.id ? null : banner.id)}
                          style={styles.bannerMoreBtn}
                          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
                          activeOpacity={0.7}>
                          <Icon name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        {bannerMenuId === banner.id && (
                          <View style={styles.bannerDropdown}>
                            <TouchableOpacity
                              onPress={() => handleEditBannerDuration(banner)}
                              style={styles.bannerDropdownItem}
                              activeOpacity={0.6}>
                              <Icon name="timer-outline" size={18} color="#F39C12" />
                              <Text style={styles.bannerDropdownText}>Editar duración</Text>
                            </TouchableOpacity>
                            <View style={styles.bannerDropdownSep} />
                            <TouchableOpacity
                              onPress={() => { handleToggleBannerActive(banner); setBannerMenuId(null); }}
                              style={styles.bannerDropdownItem}
                              activeOpacity={0.6}>
                              <Icon name={banner.active ? 'eye-off-outline' : 'eye-outline'} size={18} color={banner.active ? '#F39C12' : '#00B894'} />
                              <Text style={[styles.bannerDropdownText, {color: banner.active ? '#F39C12' : '#00B894'}]}>
                                {banner.active ? 'Desactivar' : 'Activar'}
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.bannerDropdownSep} />
                            <TouchableOpacity
                              onPress={() => handleRemoveBanner(banner.id)}
                              style={[styles.bannerDropdownItem, {borderBottomWidth: 0}]}
                              activeOpacity={0.6}>
                              <Icon name="trash-outline" size={18} color="#EF4444" />
                              <Text style={[styles.bannerDropdownText, {color: '#EF4444'}]}>Eliminar</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Botón agregar */}
                <TouchableOpacity
                  onPress={handleAddBanner}
                  disabled={bannerUploading}
                  style={[styles.addBannerBtn, bannerUploading && {opacity: 0.6}]}
                  activeOpacity={0.7}>
                  {bannerUploading ? (
                    <ActivityIndicator size="small" color={primary} />
                  ) : (
                    <Icon name="add-circle-outline" size={20} color={primary} />
                  )}
                  <Text style={styles.addBannerBtnText}>
                    {bannerUploading ? 'Subiendo banner...' : 'Agregar banner'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.logoHint}>Maximo 5MB. Imagenes o videos. Se mostrara como carrusel en el inicio.</Text>
              </>
            )}
          </View>
        </View>
        )}

        {/* Info de la app */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Icon name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutLabel}>Versión</Text>
                <Text style={styles.aboutValue}>1.0.0</Text>
              </View>
            </View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}>
              <Icon name="code-outline" size={20} color={theme.colors.textSecondary} />
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutLabel}>Desarrollado con</Text>
                <Text style={styles.aboutValue}>React Native (CLI)</Text>
              </View>
            </View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}>
              <Icon name="heart-outline" size={20} color={primary} />
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutLabel}>{config.shop_name || 'JO-Shop'}</Text>
                <Text style={styles.aboutValue}>Tu tienda favorita</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
      {/* Modal editar duración */}
      <Modal
        visible={durationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDurationModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setDurationModalVisible(false)}>
          <View style={styles.durationModalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.durationModalContent}>
                <Text style={styles.durationModalTitle}>
                  Editar duración
                </Text>
                <Text style={styles.durationModalSubtitle}>
                  Banner {editingBanner?.sortOrder} — Duración actual: {editingBanner?.duration}s
                </Text>
                <View style={styles.durationInputWrapper}>
                  <TextInput
                    ref={durationInputRef}
                    style={styles.durationInput}
                    value={durationInput}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, '');
                      if (cleaned === '' || (parseInt(cleaned) >= 0 && parseInt(cleaned) <= 30)) {
                        setDurationInput(cleaned);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                    autoFocus
                    selectTextOnFocus
                    placeholder="4"
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.durationInputSuffix}>segundos</Text>
                </View>
                <Text style={styles.durationModalHint}>Mínimo 4s — Máximo 30s</Text>
                <View style={styles.durationModalActions}>
                  <TouchableOpacity
                    style={styles.durationCancelBtn}
                    onPress={() => setDurationModalVisible(false)}
                    activeOpacity={0.7}>
                    <Text style={styles.durationCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.durationSaveBtn}
                    onPress={handleSaveDuration}
                    activeOpacity={0.7}>
                    <Text style={styles.durationSaveText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (primary) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
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
  headerRight: {
    width: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
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
  inputHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  statusSuccess: {
    backgroundColor: '#E8F8F0',
  },
  statusError: {
    backgroundColor: '#FDE8EC',
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  statusTextSuccess: {
    color: '#27AE60',
  },
  statusTextError: {
    color: primary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  testButton: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: primary,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  envCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FFD6A0',
    marginBottom: theme.spacing.sm,
  },
  envCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  envCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: '#CC7A00',
  },
  envUrlText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  envHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: primary,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    backgroundColor: '#FDE8EC',
  },
  resetButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: primary,
  },
  // ─── Toggle styles ──────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  toggleLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  toggleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  switchWrapper: {
    width: 52,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeDotSingle: {
    backgroundColor: '#3498DB',
  },
  modeDotMulti: {
    backgroundColor: primary,
  },
  modeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  configHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
  // ─── About styles ───────────────────────────────────────────────────────────
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  aboutInfo: {
    marginLeft: theme.spacing.md,
  },
  aboutLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  aboutValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 44,
  },
  bottomSpacing: {
    height: theme.spacing.xxl,
  },
  // ─── Appearance styles ────────────────────────────────────────────────────
  appearanceLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  appearanceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    marginBottom: 16,
  },
  appearanceInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    height: '100%',
    padding: 0,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  colorItem: {
    flex: 1,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    gap: 8,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  colorTextInput: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
    height: '100%',
    padding: 0,
  },
  previewCard: {
    borderRadius: theme.borderRadius.md,
    padding: 16,
    minHeight: 80,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewName: {
    color: 'white',
    fontWeight: '800',
    fontSize: 20,
  },
  previewSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  previewColors: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  previewSwatch: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoActions: {
    flex: 1,
    gap: 8,
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: primary,
  },
  logoHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginBottom: 16,
  },
  // ─── Banners ────────────────────────────────────────────────────────
  bannerList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  bannerItem: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    position: 'relative',
  },
  bannerThumb: {
    width: 64,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
  },
  bannerItemInfo: {
    flex: 1,
  },
  bannerItemLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  bannerItemUrl: {
    fontSize: 10,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  bannerItemInactive: {
    opacity: 0.5,
  },
  bannerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bannerMoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.inputBg,
  },
  bannerDropdown: {
    position: 'absolute',
    top: 32,
    right: 0,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 10,
    minWidth: 180,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  bannerDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  bannerDropdownSep: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginLeft: 42,
  },
  bannerDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  durationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  durationModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  durationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  durationModalSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 18,
  },
  durationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 14,
    height: 50,
  },
  durationInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.text,
    padding: 0,
    height: '100%',
  },
  durationInputSuffix: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  durationModalHint: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  durationModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  durationCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  durationSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  addBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderWidth: 2,
    borderColor: primary,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    backgroundColor: primary + '08',
  },
  addBannerBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: primary,
  },
  appearanceButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  appearanceResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
  },
  appearanceResetBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  appearanceSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.md,
    backgroundColor: primary,
  },
  appearanceSaveBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.white,
  },
});

export default SettingsScreen;
