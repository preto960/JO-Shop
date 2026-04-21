import React, {createContext, useContext, useReducer, useCallback, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '@services/api';

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
      const {user, token, refreshToken} = response;

      await saveSession({user, token, refreshToken});

      dispatch({
        type: ACTIONS.LOGIN,
        payload: {user, token, refreshToken},
      });

      return {success: true};
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Error al iniciar sesión';
      dispatch({type: ACTIONS.SET_ERROR, payload: message});
      return {success: false, error: message};
    }
  }, [saveSession]);

  // Registro
  const register = useCallback(async (name, email, password) => {
    try {
      dispatch({type: ACTIONS.SET_LOADING, payload: true});
      dispatch({type: ACTIONS.CLEAR_ERROR});

      const api = await apiService.createApiClient();
      if (!api) {
        throw new Error('Configura la URL del servidor en Ajustes');
      }

      const response = await api.post('/auth/register', {name, email, password});
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
