import React, {createContext, useContext, useReducer, useCallback, useEffect, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '@services/api';
import pushNotifications from '@services/notifications';

const AUTH_KEY = '@joshop_auth';

const AuthContext = createContext(null);

const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESTORE_SESSION: 'RESTORE_SESSION',
};

const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {...state, isLoading: action.payload};
    case ACTIONS.SET_USER:
      return {...state, user: action.payload, isLoading: false};
    case ACTIONS.LOGIN:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };
    case ACTIONS.UPDATE_PROFILE:
      return {...state, user: {...state.user, ...action.payload}};
    case ACTIONS.SET_ERROR:
      return {...state, error: action.payload, isLoading: false};
    case ACTIONS.CLEAR_ERROR:
      return {...state, error: null};
    case ACTIONS.RESTORE_SESSION:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: !!action.payload.token,
        isLoading: false,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({children}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const saveSession = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  const clearSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
    } catch {}
  }, []);

  // Restaurar sesión al iniciar
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          dispatch({
            type: ACTIONS.RESTORE_SESSION,
            payload: {
              user: parsed.user,
              token: parsed.token,
              refreshToken: parsed.refreshToken,
            },
          });
        } else {
          dispatch({type: ACTIONS.SET_LOADING, payload: false});
        }
      } catch {
        dispatch({type: ACTIONS.SET_LOADING, payload: false});
      }
    };
    restoreSession();
  }, []);

  // Login
  const login = useCallback(async (email, password) => {
    try {
      dispatch({type: ACTIONS.SET_LOADING, payload: true});
      dispatch({type: ACTIONS.CLEAR_ERROR});

      const api = await apiService.createApiClient();
      if (!api) {
        throw new Error('Configura la URL del servidor en Ajustes');
      }

      const response = await api.post('/auth/login', {email, password});

      // Verificar si se requiere 2FA (OTP)
      if (response.requiresOtp) {
        dispatch({type: ACTIONS.SET_LOADING, payload: false});
        return {
          success: false,
          requiresOtp: true,
          email: response.email,
          otpCode: response.code,
        };
      }

      const {user, token, refreshToken} = response;

      await saveSession({user, token, refreshToken});

      dispatch({
        type: ACTIONS.LOGIN,
        payload: {user, token, refreshToken},
      });

      return {success: true};
    } catch (err) {
      let message = 'Error al iniciar sesión';
      if (err.response?.data) {
        const data = err.response.data;
        message = typeof data.error === 'string' ? data.error : (data.message || message);
      } else if (err.message) {
        message = err.message;
      }
      dispatch({type: ACTIONS.SET_ERROR, payload: message});
      return {success: false, error: message};
    }
  }, [saveSession]);

  // Login con OTP (2FA)
  const loginWithOtp = useCallback(async (email, otpCode) => {
    try {
      dispatch({type: ACTIONS.SET_LOADING, payload: true});
      dispatch({type: ACTIONS.CLEAR_ERROR});

      const api = await apiService.createApiClient();
      if (!api) {
        throw new Error('Configura la URL del servidor en Ajustes');
      }

      const response = await api.post('/auth/login-verify', {
        email,
        code: otpCode,
      });
      const {user, token, refreshToken} = response;

      await saveSession({user, token, refreshToken});

      dispatch({
        type: ACTIONS.LOGIN,
        payload: {user, token, refreshToken},
      });

      return {success: true};
    } catch (err) {
      let message = 'Error al verificar el código';
      if (err.response?.data) {
        const data = err.response.data;
        message = typeof data.error === 'string' ? data.error : (data.message || message);
      } else if (err.message) {
        message = err.message;
      }
      dispatch({type: ACTIONS.SET_ERROR, payload: message});
      return {success: false, error: message};
    }
  }, [saveSession]);

  // Registro
  const register = useCallback(async (name, email, password, role = 'customer') => {
    try {
      dispatch({type: ACTIONS.SET_LOADING, payload: true});
      dispatch({type: ACTIONS.CLEAR_ERROR});

      const api = await apiService.createApiClient();
      if (!api) {
        throw new Error('Configura la URL del servidor en Ajustes');
      }

      const response = await api.post('/auth/register', {name, email, password, role});
      const {user, token, refreshToken} = response;

      await saveSession({user, token, refreshToken});

      dispatch({
        type: ACTIONS.LOGIN,
        payload: {user, token, refreshToken},
      });

      return {success: true};
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Error al registrar';
      dispatch({type: ACTIONS.SET_ERROR, payload: message});
      return {success: false, error: message};
    }
  }, [saveSession]);

  // Logout
  const logout = useCallback(async () => {
    // Desregistrar token FCM antes de cerrar sesion
    pushNotifications.unregisterPushToken().catch(() => {});
    await clearSession();
    dispatch({type: ACTIONS.LOGOUT});
  }, [clearSession]);

  // Refrescar token
  const refreshAccessToken = useCallback(async () => {
    try {
      const api = await apiService.createApiClient();
      if (!api || !state.refreshToken) return false;

      const response = await api.post('/auth/refresh', {
        refreshToken: state.refreshToken,
      });

      const {token, refreshToken} = response;
      const newSession = {
        user: state.user,
        token,
        refreshToken,
      };

      await saveSession(newSession);
      dispatch({
        type: ACTIONS.RESTORE_SESSION,
        payload: newSession,
      });

      return true;
    } catch {
      return false;
    }
  }, [state.refreshToken, state.user, saveSession]);

  // Obtener perfil actualizado
  const fetchProfile = useCallback(async () => {
    try {
      const api = await apiService.createApiClient();
      if (!api) return;

      const profile = await api.get('/auth/me');
      dispatch({type: ACTIONS.SET_USER, payload: profile});

      // Actualizar sesión persistida
      await saveSession({
        user: profile,
        token: state.token,
        refreshToken: state.refreshToken,
      });
    } catch {}
  }, [state.token, state.refreshToken, saveSession]);

  // Actualizar token en headers del apiService
  useEffect(() => {
    if (state.token) {
      apiService.setAuthToken(state.token);
    } else {
      apiService.setAuthToken(null);
    }
  }, [state.token]);

  // Registrar token FCM al iniciar sesion / restaurar sesion
  const tokenRegisteredRef = useRef(false);
  const registerFcmWithRetry = useCallback(async (retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await pushNotifications.registerPushToken();
        if (result) {
          console.log('[Auth] Token FCM registrado exitosamente');
          return;
        }
      } catch (err) {
        console.warn(`[Auth] Intento ${i + 1}/${retries} registro FCM fallo:`, err.message);
      }
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * (i + 1)));
      }
    }
    console.error('[Auth] No se pudo registrar token FCM despues de', retries, 'intentos');
  }, []);

  useEffect(() => {
    if (state.isAuthenticated && !tokenRegisteredRef.current) {
      tokenRegisteredRef.current = true;
      // Registrar despues de un breve delay para asegurar que el authToken este configurado
      const timer = setTimeout(() => {
        registerFcmWithRetry();
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (!state.isAuthenticated) {
      tokenRegisteredRef.current = false;
    }
  }, [state.isAuthenticated, registerFcmWithRetry]);

  // Escuchar refresh del token FCM y registrar el nuevo en el backend
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const unsubscribe = pushNotifications.onTokenRefresh((newToken) => {
      console.log('[Auth] Token FCM refrescado, registrando en backend:', newToken?.substring(0, 20) + '...');
      // Registrar el nuevo token inmediatamente
      pushNotifications.registerPushToken().catch(err => {
        console.error('[Auth] Error registrando token FCM refrescado:', err.message);
      });
    });
    return unsubscribe;
  }, [state.isAuthenticated]);

  // ─── Helpers de permisos ───────────────────────────────────────────────────

  const permissionCodes = state.user?.permissions?.map(p => p.code) || [];
  const roleNames = state.user?.roles?.map(r => r.name) || [];

  const hasPermission = useCallback((code) => {
    return permissionCodes.includes(code);
  }, [permissionCodes]);

  const hasAnyPermission = useCallback((codes) => {
    return codes.some(c => permissionCodes.includes(c));
  }, [permissionCodes]);

  const hasRole = useCallback((roleName) => {
    return roleNames.includes(roleName);
  }, [roleNames]);

  const isAdmin = roleNames.includes('admin');

  // Obtener permisos de un módulo específico
  const getModulePermissions = useCallback((moduleName) => {
    return permissionCodes.filter(code => code.startsWith(`${moduleName}.`));
  }, [permissionCodes]);

  // Verificar si puede ver un módulo en el menú
  const canViewModule = useCallback((moduleName) => {
    return permissionCodes.includes(`${moduleName}.view_menu`);
  }, [permissionCodes]);

  const value = {
    ...state,
    login,
    loginWithOtp,
    register,
    logout,
    refreshAccessToken,
    fetchProfile,
    isAdmin,
    hasPermission,
    hasAnyPermission,
    hasRole,
    getModulePermissions,
    canViewModule,
    clearError: () => dispatch({type: ACTIONS.CLEAR_ERROR}),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
