import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_CONFIG_KEY = '@joshop_api_config';
let authToken = null;

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
    return defaultConfig;
  }
};

const saveApiConfig = async config => {
  try {
    await AsyncStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
};

const clearApiConfig = async () => {
  try {
    await AsyncStorage.removeItem(API_CONFIG_KEY);
    return true;
  } catch {
    return false;
  }
};

const setAuthToken = token => {
  authToken = token;
};

const createApiClient = async () => {
  const config = await getApiConfig();

  if (!config.baseUrl) {
    return null;
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers,
  });

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

// ==================== ENDPOINTS PÚBLICOS ====================

const fetchProducts = async (params = {}) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/products', {params});
};

const fetchProductById = async productId => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get(`/products/${productId}`);
};

const fetchCategories = async () => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/categories');
};

const searchProducts = async (query, params = {}) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/products/search', {params: {q: query, ...params}});
};

const createOrder = async orderData => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.post('/orders', orderData);
};

const checkConnection = async baseUrl => {
  try {
    const client = axios.create({baseURL: baseUrl, timeout: 10000});
    await client.get('/health');
    return {success: true, message: 'Conexión exitosa'};
  } catch {
    try {
      const client = axios.create({baseURL: baseUrl, timeout: 10000});
      await client.get('/');
      return {success: true, message: 'Conexión exitosa'};
    } catch {
      return {success: false, message: 'No se pudo conectar. Verifica la URL.'};
    }
  }
};

// ==================== CRUD ADMIN ====================

// Products CRUD
const createProduct = async productData => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.post('/products', productData);
};

const updateProduct = async (productId, productData) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.put(`/products/${productId}`, productData);
};

const deleteProduct = async productId => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.delete(`/products/${productId}`);
};

// Categories CRUD
const createCategory = async categoryData => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.post('/categories', categoryData);
};

const updateCategory = async (categoryId, categoryData) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.put(`/categories/${categoryId}`, categoryData);
};

const deleteCategory = async categoryId => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.delete(`/categories/${categoryId}`);
};

// Orders management
const fetchOrders = async (params = {}) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/orders', {params});
};

const updateOrderStatus = async (orderId, status) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.put(`/orders/${orderId}/status`, {status});
};

const cancelOrder = async orderId => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.delete(`/orders/${orderId}`);
};

const fetchDashboard = async () => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/orders/stats/dashboard');
};

// ==================== ROLES Y PERMISOS ====================

const fetchPermissions = async () => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/auth/permissions');
};

const fetchRoles = async () => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/auth/roles');
};

const createRole = async (roleData) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.post('/auth/roles', roleData);
};

const updateRole = async (roleId, roleData) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.put(`/auth/roles/${roleId}`, roleData);
};

const deleteRole = async (roleId) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.delete(`/auth/roles/${roleId}`);
};

const fetchUsers = async (params = {}) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.get('/auth/users', {params});
};

const updateUserRoles = async (userId, roleIds) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.put(`/auth/users/${userId}/roles`, {roleIds});
};

const grantUserPermission = async (userId, permissionId) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.post(`/auth/users/${userId}/permissions`, {permissionId});
};

const revokeUserPermission = async (userId, permissionId) => {
  const api = await createApiClient();
  if (!api) throw new Error('No hay URL del servidor configurada');
  return api.delete(`/auth/users/${userId}/permissions/${permissionId}`);
};

const apiService = {
  getApiConfig,
  saveApiConfig,
  clearApiConfig,
  setAuthToken,
  createApiClient,
  fetchProducts,
  fetchProductById,
  fetchCategories,
  searchProducts,
  createOrder,
  checkConnection,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchOrders,
  updateOrderStatus,
  cancelOrder,
  fetchDashboard,
  // Roles y permisos
  fetchPermissions,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchUsers,
  updateUserRoles,
  grantUserPermission,
  revokeUserPermission,
};

export default apiService;
