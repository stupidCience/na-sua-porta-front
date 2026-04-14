import axios from 'axios';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      localStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: any, fallback = 'Ocorreu um erro inesperado.') {
  if (!error?.response) {
    return 'Erro de rede. Verifique sua conexão e tente novamente.';
  }

  const normalizeMessage = (message: any) => {
    if (Array.isArray(message)) {
      return message.filter(Boolean).join(' ');
    }
    if (typeof message === 'string') {
      return message;
    }
    return '';
  };

  const status = error.response?.status;
  const requestUrl = String(error?.config?.url || '');
  const apiMessage = normalizeMessage(error.response?.data?.message);
  const isAuthRequest = /^\/auth\/(login|register)$/.test(requestUrl);

  if (status === 401) {
    if (isAuthRequest) {
      return apiMessage || 'Email ou senha inválidos.';
    }
    return apiMessage || 'Sua sessão expirou. Faça login novamente.';
  }

  return apiMessage || fallback;
}

export const authAPI = {
  register: (
    email: string,
    password: string,
    name: string,
    apartment?: string,
    block?: string,
    condominiumId?: string,
  ) => api.post('/auth/register', { email, password, name, apartment, block, condominiumId }),
  
  registerDelivery: (
    email: string,
    password: string,
    name: string,
    condominiumId: string,
    personalDocument: string,
  ) =>
    api.post('/auth/register', {
      email,
      password,
      name,
      role: 'DELIVERY_PERSON',
      condominiumId,
      personalDocument,
    }),

  registerAdmin: (email: string, password: string, name: string, condominiumName: string) =>
    api.post('/auth/register', {
      email,
      password,
      name,
      role: 'CONDOMINIUM_ADMIN',
      condominiumName,
    }),

  registerVendor: (
    email: string,
    password: string,
    ownerName: string,
    condominiumId: string,
    vendorName: string,
    vendorCnpj: string,
    vendorCnae: string,
    vendorLegalDocument: string,
    vendorCategory?: string,
    vendorDescription?: string,
    vendorContactPhone?: string,
  ) =>
    api.post('/auth/register', {
      email,
      password,
      name: ownerName,
      role: 'VENDOR',
      condominiumId,
      vendorName,
      vendorCnpj,
      vendorCnae,
      vendorLegalDocument,
      vendorCategory,
      vendorDescription,
      vendorContactPhone,
    }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const deliveriesAPI = {
  create: (apartment: string, block: string, description?: string, notes?: string, externalPlatform?: string, externalCode?: string) =>
    api.post('/deliveries', { apartment, block, description, notes, externalPlatform, externalCode }),

  getAll: (status?: string) =>
    api.get('/deliveries', { params: { status } }),

  getAvailable: () =>
    api.get('/deliveries/available'),

  getMyDeliveries: () =>
    api.get('/deliveries/my-deliveries'),

  getHistory: () =>
    api.get('/deliveries/history'),

  getStats: () =>
    api.get('/deliveries/stats'),

  getAdminOverview: () =>
    api.get('/deliveries/admin/overview'),

  getById: (id: string) =>
    api.get(`/deliveries/${id}`),

  accept: (id: string) =>
    api.patch(`/deliveries/${id}/accept`),

  updateStatus: (id: string, status: string, deliveryCode?: string) =>
    api.patch(`/deliveries/${id}/status`, { status, deliveryCode }),

  cancel: async (id: string) => {
    try {
      return await api.patch(`/deliveries/${id}/cancel`);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return api.patch(`/deliveries/cancel/${id}`);
      }
      throw error;
    }
  },

  rate: (id: string, rating: number, comment?: string) =>
    api.patch(`/deliveries/${id}/rate`, { rating, comment }),

  exportCsv: () =>
    api.get('/deliveries/export', { responseType: 'blob' }),
};

export const ordersAPI = {
  create: (data: {
    customerName?: string;
    apartment: string;
    block?: string;
    description: string;
    vendorId?: string;
    vendorName?: string;
    paymentStatus?: 'PENDING' | 'PAID';
  }) => api.post('/orders', data),

  getAll: () => api.get('/orders'),

  getChats: () => api.get('/orders/chats'),

  getById: (id: string) => api.get(`/orders/${id}`),

  getMessages: (id: string, kind: 'ORDER' | 'DELIVERY' = 'ORDER') =>
    api.get(`/orders/${id}/messages`, { params: { kind } }),

  sendMessage: (id: string, content: string, kind: 'ORDER' | 'DELIVERY' = 'ORDER') =>
    api.post(`/orders/${id}/messages`, { content }, { params: { kind } }),

  createExternal: (data: {
    name: string;
    apartment: string;
    description: string;
    block?: string;
  }) => api.post('/external/orders', data),
};

export const usersAPI = {
  getMe: () => api.get('/users/me'),

  updateMe: (data: {
    name?: string;
    phone?: string;
    apartment?: string;
    block?: string;
    vehicleInfo?: string;
    personalDocument?: string;
  }) => api.patch('/users/me', data),

  updateDocuments: (data: {
    personalDocument?: string;
    vendorCnpj?: string;
    vendorCnae?: string;
    vendorLegalDocument?: string;
  }) => api.patch('/users/me/documents', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),

  linkToCondominium: (condominiumId: string) =>
    api.patch('/users/me/condominium', { condominiumId }),

  getCondominiumUsers: () => api.get('/users/condominium'),

  toggleUserStatus: (id: string, active: boolean) =>
    api.patch(`/users/${id}/status`, { active }),
};

export const condominiumsAPI = {
  getMe: () => api.get('/condominiums/me'),

  updateMe: (data: {
    name?: string;
    address?: string;
    operatingHours?: string;
    maxActiveDeliveries?: number;
  }) => api.patch('/condominiums/me', data),
};

export const vendorsAPI = {
  list: () => api.get('/vendors'),
  getById: (id: string) => api.get(`/vendors/${id}`),
  createOrder: (vendorId: string, data: {
    items: Array<{ menuItemId: string; quantity: number }>;
    notes?: string;
    apartment: string;
    block?: string;
  }) => api.post(`/vendors/${vendorId}/orders`, data),
  getMe: () => api.get('/vendors/me'),
  updateMe: (data: {
    name?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    bannerUrl?: string;
    aboutText?: string;
    contactPhone?: string;
    estimatedTimeMinutes?: number;
    minOrderValue?: number;
  }) => api.patch('/vendors/me', data),
  addMenuItem: (data: {
    name: string;
    description?: string;
    price: number;
    category?: string;
    imageUrl?: string;
    available?: boolean;
  }) => api.post('/vendors/me/menu-items', data),
  updateMenuItem: (itemId: string, data: {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string;
    available?: boolean;
  }) => api.patch(`/vendors/me/menu-items/${itemId}`, data),
  deleteMenuItem: (itemId: string) => api.delete(`/vendors/me/menu-items/${itemId}`),
  getMyOrders: () => api.get('/vendors/me/orders'),
  getMyOrdersHistory: () => api.get('/vendors/me/orders/history'),
  updateMyOrderStatus: (orderId: string, status: 'ACCEPTED' | 'READY' | 'SENT', pickupCode?: string) =>
    api.patch(`/vendors/me/orders/${orderId}/status`, { status, pickupCode }),
  cancelMyOrder: (orderId: string, reason?: string) =>
    api.patch(`/vendors/me/orders/${orderId}/cancel`, { reason }),
  getOrderMessages: (orderId: string) => api.get(`/vendors/me/orders/${orderId}/messages`),
  sendOrderMessage: (orderId: string, content: string) =>
    api.post(`/vendors/me/orders/${orderId}/messages`, { content }),
  getDashboard: () => api.get('/vendors/me/dashboard'),
};

export default api;
