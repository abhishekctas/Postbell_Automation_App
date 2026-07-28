import { createContext, useContext } from 'react';
import { StoredUser } from '@/utils/storage';

export type { StoredUser };

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: StoredUser | null;
}

export interface AuthContextType extends AuthState {
  requestOtp: (email: string, loginType?: 'user' | 'customer') => Promise<any>;
  verifyOtp: (payload: {
    email: string;
    otp: string;
    requestId: string;
    loginType: 'user' | 'customer';
  }) => Promise<any>;
  resendOtp: (payload: {
    email: string;
    loginType: 'user' | 'customer';
    requestId?: string;
  }) => Promise<any>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<StoredUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  requestOtp: async () => {},
  verifyOtp: async () => {},
  resendOtp: async () => {},
  signOut: async () => {},
  updateUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);
