import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

export const authAPI = {
  register: (email: string, password: string, name: string, apartment?: string, block?: string) =>
    api.post('/auth/register', { email, password, name, apartment, block }),
  
  registerDelivery: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name, role: 'DELIVERY_PERSON' }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const deliveriesAPI = {
  create: (apartment: string, block: string, description?: string, notes?: string) =>
    api.post('/deliveries', { apartment, block, description, notes }),

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

  getById: (id: string) =>
    api.get(`/deliveries/${id}`),

  accept: (id: string) =>
    api.patch(`/deliveries/${id}/accept`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/deliveries/${id}/status`, { status }),

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
};

export default api;
