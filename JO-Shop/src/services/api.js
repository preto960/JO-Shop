import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_CONFIG_KEY = '@joshop_api_config';

const defaultConfig = {
  baseUrl: '',
  timeout: 15000,
};

const getApiConfig = async () => {
  try {
    const stored = await AsyncStorage.getItem(API_CONFIG_KEY);
    if (stored) {
      return {...defaultConfig, ...JSON.parse(stored)};
    }
    return defaultConfig;
  } catch (error) {
    console.error('Error reading API config:', error);
    return defaultConfig;
  }
};

const saveApiConfig = async config => {
  try {
    await AsyncStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error saving API config:', error);
    return false;
  }
};

const clearApiConfig = async () => {
  try {
    await AsyncStorage.removeItem(API_CONFIG_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing API config:', error);
    return false;
  }
};

const createApiClient = async () => {
  const config = await getApiConfig();

  if (!config.baseUrl) {
    return null;
  }

  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Interceptor de respuesta
  client.interceptors.response.use(
    response => response.data,
    error => {
      if (error.response) {
        const message =
          error.response.data?.message || error.response.data?.error;
        throw new Error(message || `Error del servidor: ${error.response.status}`);
      } else if (error.request) {
        throw new Error('No se pudo conectar al servidor. Verifica la URL.');
      } else {
        throw new Error(error.message || 'Error inesperado');
      }
    },
  );

  return client;
};

// ==================== ENDPOINTS ====================

/**
 * Obtener productos del backend
 * GET /products
 */
const fetchProducts = async (params = {}) => {
  const api = await createApiClient();
  if (!api) {
    throw new Error('No hay URL del servidor configurada');
  }
  return api.get('/products', {params});
};

/**
 * Obtener un producto por ID
 * GET /products/:id
 */
const fetchProductById = async productId => {
  const api = await createApiClient();
  if (!api) {
    throw new Error('No hay URL del servidor configurada');
  }
  return api.get(`/products/${productId}`);
};

/**
 * Obtener categorías
 * GET /categories
 */
const fetchCategories = async () => {
  const api = await createApiClient();
  if (!api) {
    throw new Error('No hay URL del servidor configurada');
  }
  return api.get('/categories');
};

/**
 * Buscar productos
 * GET /products/search?q=query
 */
const searchProducts = async (query, params = {}) => {
  const api = await createApiClient();
  if (!api) {
    throw new Error('No hay URL del servidor configurada');
  }
  return api.get('/products/search', {
    params: {q: query, ...params},
  });
};

/**
 * Crear un pedido
 * POST /orders
 */
const createOrder = async orderData => {
  const api = await createApiClient();
  if (!api) {
    throw new Error('No hay URL del servidor configurada');
  }
  return api.post('/orders', orderData);
};

/**
 * Verificar conexión con el backend
 * GET /health o GET /
 */
const checkConnection = async baseUrl => {
  try {
    const client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });
    await client.get('/health');
    return {success: true, message: 'Conexión exitosa'};
  } catch (error) {
    try {
      // Intentar con endpoint raíz
      const client = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
      });
      await client.get('/');
      return {success: true, message: 'Conexión exitosa'};
    } catch {
      return {
        success: false,
        message: 'No se pudo conectar. Verifica la URL y que el servidor esté activo.',
      };
    }
  }
};

const apiService = {
  getApiConfig,
  saveApiConfig,
  clearApiConfig,
  createApiClient,
  fetchProducts,
  fetchProductById,
  fetchCategories,
  searchProducts,
  createOrder,
  checkConnection,
};

export default apiService;
