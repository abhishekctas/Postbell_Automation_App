import React, { createContext, useContext } from 'react';

export interface StoredUser {
  _id?: string;
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  contact_no?: string | number;
  role_id?: string;
  status?: number;
  isSuperAdmin?: boolean;
  avatar?: string;
  role_name?: string;
  sectionMatrix?: any[];
  token?: string;
  loginType?: string;
  preferred_language?: 'en' | 'hi' | 'gu';
}

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
