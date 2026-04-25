import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import apiService from '@services/api';

const SystemConfigContext = createContext(null);

export const SystemConfigProvider = ({children}) => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.fetchConfig();
      setConfig(res || {});
    } catch (err) {
      console.warn('Error loading system config:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = useCallback(async (newSettings) => {
    try {
      const res = await apiService.updateConfig(newSettings);
      if (res?.settings) {
        setConfig(prev => ({...prev, ...res.settings}));
      }
      return res;
    } catch (err) {
      throw err;
    }
  }, []);

  const isMultiStore = config?.multi_store_mode === 'true';

  return (
    <SystemConfigContext.Provider value={{config, loading, isMultiStore, loadConfig, updateConfig}}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within SystemConfigProvider');
  }
  return context;
};

export {SystemConfigContext};
