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

type ApiErrorPayload = {
  message?: string | string[];
};

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: ApiErrorPayload;
  };
  config?: {
    url?: string;
  };
};

function isApiErrorLike(error: unknown): error is ApiErrorLike {
  return typeof error === 'object' && error !== null;
}

function normalizeApiMessage(message?: string | string[]) {
  if (Array.isArray(message)) {
    return message
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .join(' ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return '';
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.') {
  if (!isApiErrorLike(error) || !error.response) {
    return 'Erro de rede. Verifique sua conexão e tente novamente.';
  }

  const status = error.response.status;
  const requestUrl = String(error.config?.url || '');
  const apiMessage = normalizeApiMessage(error.response.data?.message);
  const isAuthRequest = /^\/auth\/(login|register)$/.test(requestUrl);

  if (status === 401) {
    if (isAuthRequest) {
      return apiMessage || 'Email ou senha inválidos.';
    }
    return apiMessage || 'Sua sessão expirou. Faça login novamente.';
  }

  return apiMessage || fallback;
}

export type NotificationCategory =
  | 'CHAT_MESSAGE'
  | 'ORDER_UPDATE'
  | 'DELIVERY_UPDATE'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string | null;
  orderId?: string | null;
  deliveryId?: string | null;
  metadata?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    apartment?: string;
    block?: string;
    phone?: string;
    personalDocument?: string;
    residenceDocument?: string;
    communicationsConsent?: boolean;
    condominiumCode?: string;
  }) => api.post('/auth/register', data),

  registerAdmin: (email: string, password: string, name: string, condominiumName: string) =>
    api.post('/auth/register', {
      email,
      password,
      name,
      role: 'CONDOMINIUM_ADMIN',
      condominiumName,
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
    } catch (error: unknown) {
      if (isApiErrorLike(error) && error.response?.status === 404) {
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

  getMyModules: () => api.get('/users/me/modules'),

  switchActiveModule: (
    module: 'RESIDENT' | 'DELIVERY_PERSON' | 'VENDOR' | 'CONDOMINIUM_ADMIN',
  ) => api.patch('/users/me/modules/active', { module }),

  activateModule: (
    module: 'RESIDENT' | 'DELIVERY_PERSON' | 'VENDOR',
    data: {
      phone?: string;
      apartment?: string;
      block?: string;
      communicationsConsent?: boolean;
      personalDocument?: string;
      residenceDocument?: string;
      vehicleInfo?: string;
      condominiumCode?: string;
      vendorName?: string;
      vendorCategory?: string;
      vendorDescription?: string;
      vendorCnpj?: string;
      vendorCnae?: string;
      vendorLegalDocument?: string;
      vendorContactPhone?: string;
    },
  ) => api.patch('/users/me/modules/activate', { module, ...data }),

  updateMe: (data: {
    name?: string;
    phone?: string;
    apartment?: string;
    block?: string;
    vehicleInfo?: string;
    personalDocument?: string;
    residenceDocument?: string;
    communicationsConsent?: boolean;
  }) => api.patch('/users/me', data),

  updateDocuments: (data: {
    personalDocument?: string;
    vendorCnpj?: string;
    vendorCnae?: string;
    vendorLegalDocument?: string;
  }) => api.patch('/users/me/documents', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),

  linkToCondominium: (condominiumCode: string) =>
    api.patch('/users/me/condominium', { condominiumCode }),

  getCondominiumUsers: () => api.get('/users/condominium'),

  reviewResidentVerification: (
    id: string,
    status: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED',
  ) => api.patch(`/users/${id}/resident-verification`, { status }),

  toggleUserStatus: (id: string, active: boolean) =>
    api.patch(`/users/${id}/status`, { active }),
};

export const condominiumsAPI = {
  getMe: () => api.get('/condominiums/me'),

  getMyAccessCode: () => api.get('/condominiums/me/access-code'),

  resolveAccessCode: (accessCode: string) =>
    api.get(`/condominiums/access/${encodeURIComponent(accessCode)}`),

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

export const notificationsAPI = {
  list: (status: 'all' | 'unread' = 'all', limit = 60) =>
    api.get('/notifications', { params: { status, limit } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  markContextAsRead: (
    kind: 'ORDER' | 'DELIVERY',
    id: string,
    category?: NotificationCategory,
  ) => api.patch('/notifications/context/read', { kind, id, category }),
};

export default api;
