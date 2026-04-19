import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import {ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService from '@services/api';
import {normalizeUrl, isValidUrl} from '@utils/helpers';
import theme from '@theme/styles';

const SettingsScreen = () => {
  const [baseUrl, setBaseUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Cargar configuración guardada
  useEffect(() => {
    const loadConfig = async () => {
      const config = await apiService.getApiConfig();
      setBaseUrl(config.baseUrl || '');
      setSaved(!!config.baseUrl);
    };
    loadConfig();
  }, []);

  const handleTestConnection = async () => {
    const url = normalizeUrl(baseUrl);
    if (!isValidUrl(url)) {
      Alert.alert('URL inválida', 'Ingresa una URL válida (ej: https://mi-api.com)');
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
      Alert.alert('URL inválida', 'Ingresa una URL válida para el servidor.');
      return;
    }

    const success = await apiService.saveApiConfig({
      ...((await apiService.getApiConfig()) || {}),
      baseUrl: url,
    });

    if (success) {
      setSaved(true);
      Alert.alert('Guardado', 'La configuración del servidor se guardó correctamente.\n\nVuelve a la pantalla de inicio para ver los productos.');
    } else {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  const handleClearConfig = () => {
    Alert.alert(
      'Limpiar configuración',
      '¿Estás seguro de que deseas eliminar la configuración del servidor?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            await apiService.clearApiConfig();
            setBaseUrl('');
            setSaved(false);
            setConnectionStatus(null);
          },
        },
      ],
    );
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
          <Text style={styles.headerTitle}>Ajustes</Text>
          <Text style={styles.headerSubtitle}>Configuración del servidor y preferencias</Text>
        </View>

        {/* Configuración del servidor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servidor Backend</Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL del servidor</Text>
              <TextInput
                value={baseUrl}
                onChangeText={text => {
                  setBaseUrl(text);
                  setConnectionStatus(null);
                }}
                placeholder="https://mi-servidor.com"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
              <Text style={styles.inputHint}>
                Ingresa la URL base de tu API (sin / al final)
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
                  {testing ? 'Probando...' : 'Probar conexión'}
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
        </View>

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

        {/* Limpiar config */}
        {saved && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={handleClearConfig}
              style={styles.dangerButton}
              activeOpacity={0.8}>
              <Icon name="trash-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.dangerButtonText}>
                Limpiar configuración del servidor
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacing} />
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
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: 4,
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
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  dangerButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.accent,
  },
  bottomSpacing: {
    height: theme.spacing.xxl,
  },
});

export default SettingsScreen;
