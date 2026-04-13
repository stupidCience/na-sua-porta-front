import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'RESIDENT' | 'DELIVERY_PERSON';
  condominiumId?: string;
  apartment?: string;
  block?: string;
  phone?: string;
}

export interface Delivery {
  id: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED';
  residentId: string;
  apartment: string;
  block: string;
  deliveryPersonId?: string;
  description?: string;
  notes?: string;
  rating?: number;
  ratingComment?: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  resident?: {
    id: string;
    name: string;
    email: string;
  };
  deliveryPerson?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

interface DeliveryStore {
  deliveries: Delivery[];
  availableDeliveries: Delivery[];
  selectedDelivery: Delivery | null;
  loading: boolean;
  error: string | null;
  setDeliveries: (deliveries: Delivery[]) => void;
  setAvailableDeliveries: (deliveries: Delivery[]) => void;
  addDelivery: (delivery: Delivery) => void;
  updateDelivery: (delivery: Delivery) => void;
  setSelectedDelivery: (delivery: Delivery | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setToken: (token) =>
    set({
      token,
    }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    }),
}));

export const useDeliveryStore = create<DeliveryStore>((set) => ({
  deliveries: [],
  availableDeliveries: [],
  selectedDelivery: null,
  loading: false,
  error: null,

  setDeliveries: (deliveries) => set({ deliveries }),
  setAvailableDeliveries: (availableDeliveries) => set({ availableDeliveries }),

  addDelivery: (delivery) =>
    set((state) => ({
      deliveries: [delivery, ...state.deliveries],
    })),

  updateDelivery: (delivery) =>
    set((state) => ({
      deliveries: state.deliveries.map((d) => (d.id === delivery.id ? delivery : d)),
      availableDeliveries: state.availableDeliveries.filter((d) => d.id !== delivery.id),
    })),

  setSelectedDelivery: (delivery) => set({ selectedDelivery: delivery }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
