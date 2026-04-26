import React, {useState, useEffect} from 'react';
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
import ConfirmModal from '@components/ConfirmModal';
import theme from '@theme/styles';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {isAdmin} = useAuth();
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
              <Icon name="hardware-chip-outline" size={18} color={theme.colors.accent} />
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
                      : theme.colors.accent
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
              <Icon name="refresh-outline" size={18} color={theme.colors.accent} />
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
                  <Icon name="storefront-outline" size={22} color={theme.colors.accent} />
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
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Switch
                    value={multiStoreSwitch}
                    onValueChange={handleMultiStoreToggle}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.accent,
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
              <Icon name="heart-outline" size={20} color={theme.colors.accent} />
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutLabel}>JO-Shop</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
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
    color: theme.colors.accent,
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
    backgroundColor: theme.colors.accent,
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
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    backgroundColor: '#FDE8EC',
  },
  resetButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.accent,
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
    backgroundColor: theme.colors.accent,
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
});

export default SettingsScreen;
