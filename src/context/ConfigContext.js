import React, {createContext, useContext, useState, useEffect, useCallback, useRef} from 'react';
import {AppState} from 'react-native';
import apiService from '@services/api';

const ConfigContext = createContext(null);

// Polling interval: 30 seconds
const POLL_INTERVAL = 30000;

export const ConfigProvider = ({children}) => {
  const [config, setConfig] = useState({
    multi_store: 'false', // default: single store mode
  });
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);
  const pollTimerRef = useRef(null);
  const lastConfigRef = useRef(null);

  const loadConfig = useCallback(async () => {
    try {
      const data = await apiService.fetchSystemConfig();
      // data is a flat object { multi_store: "true", ... }
      const newConfig = {
        multi_store: data?.multi_store || 'false',
        ...data,
      };
      lastConfigRef.current = newConfig;
      setConfig(newConfig);
    } catch (err) {
      console.warn('[Config] Error loading config:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (settings) => {
    try {
      const result = await apiService.updateSystemConfig(settings);
      // Immediately update local state
      setConfig(prev => ({...prev, ...settings}));
      lastConfigRef.current = {...lastConfigRef.current, ...settings};
      return result;
    } catch (err) {
      console.error('[Config] Error updating config:', err.message);
      throw err;
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    loadConfig();

    pollTimerRef.current = setInterval(() => {
      loadConfig();
    }, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [loadConfig]);

  // Also refresh when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        loadConfig();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [loadConfig]);

  // Computed values
  const isMultiStore = config.multi_store === 'true' || config.multi_store === true;

  const value = {
    config,
    loading,
    isMultiStore,
    loadConfig,
    updateConfig,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe usarse dentro de un ConfigProvider');
  }
  return context;
};

export default ConfigContext;
