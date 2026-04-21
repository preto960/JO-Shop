import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import ENV from '@config/env';
import theme from '@theme/styles';

const LoginScreen = ({navigation}) => {
  const {login, isLoading, error, clearError} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    setLocalError('');

    if (!email.trim()) {
      setLocalError('Ingresa tu correo electrónico');
      return;
    }
    if (!password.trim()) {
      setLocalError('Ingresa tu contraseña');
      return;
    }

    const result = await login(email.trim().toLowerCase(), password);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const errorMessage = localError || error;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Icon name="storefront" size={40} color={theme.colors.white} />
            </View>
            <Text style={styles.logoText}>JO-Shop</Text>
            <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
          </View>

          {/* Error */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle" size={18} color={theme.colors.accent} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => {setLocalError(''); clearError();}}>
                <Icon name="close" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputContainer}>
              <Icon name="mail-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                value={email}
                onChangeText={text => {setEmail(text); setLocalError(''); clearError();}}
                placeholder="tu@correo.com"
                placeholderTextColor={theme.colors.textLight}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Icon name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                value={password}
                onChangeText={text => {setPassword(text); setLocalError(''); clearError();}}
                placeholder="Tu contraseña"
                placeholderTextColor={theme.colors.textLight}
                style={styles.input}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              disabled={isLoading}
              activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}>
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Demo credentials */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Credenciales de prueba:</Text>
            <TouchableOpacity
              onPress={() => {setEmail(ENV.DEMO_ADMIN_EMAIL); setPassword(ENV.DEMO_ADMIN_PASSWORD);}}
              style={styles.demoButton}
              activeOpacity={0.7}>
              <Icon name="shield-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.demoText}>Admin: {ENV.DEMO_ADMIN_EMAIL}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {setEmail(ENV.DEMO_CLIENT_EMAIL); setPassword(ENV.DEMO_CLIENT_PASSWORD);}}
              style={styles.demoButton}
              activeOpacity={0.7}>
              <Icon name="person-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.demoText}>Cliente: {ENV.DEMO_CLIENT_EMAIL}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
    marginBottom: theme.spacing.md,
  },
  logoText: {
    fontSize: theme.fontSize.hero,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8EC',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  form: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 52,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    height: '100%',
  },
  loginButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md + 4,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  registerText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  registerLink: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  demoContainer: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
  },
  demoTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  demoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

export default LoginScreen;
