import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'RESIDENT' | 'DELIVERY_PERSON' | 'VENDOR' | 'CONDOMINIUM_ADMIN';
  isVendor?: boolean;
  vendorId?: string | null;
  condominiumId?: string;
  condominiumName?: string | null;
  apartment?: string;
  block?: string;
  phone?: string;
  vehicleInfo?: string | null;
  personalDocument?: string | null;
}

export interface Delivery {
  id: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED';
  type?: 'PORTARIA' | 'MARKETPLACE';
  residentId: string;
  apartment: string;
  block: string;
  pickupOrigin?: string;
  orderId?: string;
  deliveryPersonId?: string;
  description?: string;
  notes?: string;
  deliveryCode?: string;
  deliveryCodeGeneratedAt?: string;
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
  order?: {
    id: string;
    source?: string;
    status?: 'PENDING' | 'ACCEPTED' | 'READY' | 'SENT' | 'COMPLETED' | 'CANCELLED';
    paymentStatus?: 'PENDING' | 'PAID';
    totalAmount?: number;
    pickupCode?: string | null;
  };
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
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

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setToken: (token) =>
        set({
          token,
        }),

      setHasHydrated: (hasHydrated) =>
        set({
          hasHydrated,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'nsp-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

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
