import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext, AuthState, StoredUser } from './AuthContext';
import {
  setGlobalHeaders,
  removeGlobalHeaders,
  fetchWithAuth,
  AUTH_ENDPOINTS,
} from '@/services/api';
import { storeUserAfterLogin, clearSecureUserData, getSecureUserData } from '@/utils/storage';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function atobPolyfill(input: string): string {
  let str = String(input).replace(/=+$/, '');
  let output = '';
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const cleaned = token.replace(/['"]+/g, '');
    const parts = cleaned.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atobPolyfill(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp && payload.exp > now;
  } catch {
    return false;
  }
}

type AuthProviderProps = { children: React.ReactNode };

export default function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // ── Auto-login on app start ────────────────────────────────────────────────
  useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_access_token');
        const cleanedToken = token?.replace(/['"]+/g, '') ?? null;

        if (isTokenValid(cleanedToken)) {
          setGlobalHeaders({ Authorization: `Bearer ${cleanedToken}` });
          const response = await fetchWithAuth(AUTH_ENDPOINTS.signInWithToken);

          if (response?.user) {
            const localUser = await getSecureUserData();
            const resolvedLoginType = localUser?.loginType || response.user.loginType;

            // Enforce customer-only login in mobile app
            if (
              response.user.isSuperAdmin ||
              (resolvedLoginType && resolvedLoginType !== 'customer')
            ) {
              await AsyncStorage.removeItem('jwt_access_token');
              await clearSecureUserData();
              removeGlobalHeaders(['Authorization']);
              setAuthState({ isAuthenticated: false, isLoading: false, user: null });
              return;
            }

            const isSetupCompleted =
              response.user.setup_completed ??
              response.user.setupCompleted ??
              localUser?.setup_completed ??
              localUser?.setupCompleted ??
              false;

            const userData: StoredUser = {
              _id: response.user.id || response.user._id || localUser?._id,
              id: response.user.id || response.user._id || localUser?.id,
              first_name: response.user.first_name || localUser?.first_name,
              last_name: response.user.last_name || localUser?.last_name,
              email: response.user.email || localUser?.email,
              contact_no: response.user.contact_no || localUser?.contact_no,
              role_id: response.user.role_id || localUser?.role_id,
              status: response.user.status || localUser?.status,
              isSuperAdmin: response.user.isSuperAdmin || localUser?.isSuperAdmin,
              avatar: response.user.avatar || localUser?.avatar,
              role_name: response.user.role_name || localUser?.role_name,
              sectionMatrix: response.user.sectionMatrix || localUser?.sectionMatrix,
              loginType: 'customer',
              token: cleanedToken ?? undefined,
              setup_completed: isSetupCompleted,
              setupCompleted: isSetupCompleted,
            };
            await storeUserAfterLogin(userData);

            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              user: userData,
            });
            return;
          } else if (response?.statusCode !== 401) {
            // Server down or offline: load cached session
            const localUser = await getSecureUserData();
            if (localUser && localUser.loginType === 'customer' && !localUser.isSuperAdmin) {
              setAuthState({
                isAuthenticated: true,
                isLoading: false,
                user: localUser,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error('Auto-login failed:', err);
      }
      // Clear any stale tokens
      await AsyncStorage.removeItem('jwt_access_token');
      await clearSecureUserData();
      removeGlobalHeaders(['Authorization']);
      setAuthState({ isAuthenticated: false, isLoading: false, user: null });
    };

    attemptAutoLogin();
  }, []);

  // ── Request OTP ───────────────────────────────────────────────────────────
  const requestOtp = useCallback(
    async (email: string, loginType: 'user' | 'customer' = 'customer') => {
      const response = await fetchWithAuth(AUTH_ENDPOINTS.requestOtp, {
        method: 'POST',
        body: JSON.stringify({ email, loginType: 'customer' }),
      });

      const status = response?.status || response?.statusCode || response?.code;
      if (status >= 400 || response?.success === false) {
        throw { status: status || 500, message: response?.message || 'Failed to request OTP' };
      }
      return response;
    },
    []
  );

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const resendOtp = useCallback(
    async (payload: { email: string; loginType: 'user' | 'customer'; requestId?: string }) => {
      const response = await fetchWithAuth(AUTH_ENDPOINTS.resendOtp, {
        method: 'POST',
        body: JSON.stringify({ ...payload, loginType: 'customer' }),
      });

      const status = response?.status || response?.statusCode || response?.code;
      if (status >= 400 || response?.success === false) {
        throw { status: status || 500, message: response?.message || 'Failed to resend OTP' };
      }
      return response;
    },
    []
  );

  // ── Verify OTP & Sign In ──────────────────────────────────────────────────
  const verifyOtp = useCallback(
    async (payload: {
      email: string;
      otp: string;
      requestId: string;
      loginType: 'user' | 'customer';
    }) => {
      const data = await fetchWithAuth(AUTH_ENDPOINTS.verifyOtp, {
        method: 'POST',
        body: JSON.stringify({ ...payload, loginType: 'customer' }),
      });

      const status = data?.status || data?.statusCode || data?.code;
      if (status >= 400 || data?.success === false || (!data?.success && data?.message)) {
        throw new Error(data?.message || 'OTP verification failed');
      }

      if (data?.user && data?.tokens?.access?.token) {
        if (data.user.isSuperAdmin || (data.user.loginType && data.user.loginType !== 'customer')) {
          throw new Error('Access denied. Only customer accounts can log in to this app.');
        }

        const accessToken = data.tokens.access.token;
        const isSetupCompleted = data.user.setup_completed ?? data.user.setupCompleted ?? false;

        const userData: StoredUser = {
          _id: data.user.id || data.user._id,
          id: data.user.id || data.user._id,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          email: data.user.email,
          contact_no: data.user.contact_no,
          role_id: data.user.role_id,
          status: data.user.status,
          isSuperAdmin: data.user.isSuperAdmin,
          avatar: data.user.avatar,
          role_name: data.user.role_name,
          sectionMatrix: data.user.sectionMatrix,
          loginType: 'customer',
          token: accessToken,
          setup_completed: isSetupCompleted,
          setupCompleted: isSetupCompleted,
        };

        await storeUserAfterLogin(userData);
        setGlobalHeaders({ Authorization: `Bearer ${accessToken}` });

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: userData,
        });
      }

      return data;
    },
    []
  );

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await clearSecureUserData();
    removeGlobalHeaders(['Authorization']);
    setAuthState({ isAuthenticated: false, isLoading: false, user: null });
  }, []);

  // ── Update User ───────────────────────────────────────────────────────────
  const updateUser = useCallback(async (updates: Partial<StoredUser>) => {
    const current = await getSecureUserData();
    const updated = { ...current, ...updates };
    if (updates.setup_completed !== undefined && updates.setupCompleted === undefined) {
      updated.setupCompleted = updates.setup_completed;
    }
    if (updates.setupCompleted !== undefined && updates.setup_completed === undefined) {
      updated.setup_completed = updates.setupCompleted;
    }
    await storeUserAfterLogin(updated as StoredUser);
    setAuthState((prev) => ({ ...prev, user: updated as StoredUser }));
  }, []);

  const contextValue = useMemo(
    () => ({
      ...authState,
      requestOtp,
      resendOtp,
      verifyOtp,
      signOut,
      updateUser,
    }),
    [authState, requestOtp, resendOtp, verifyOtp, signOut, updateUser]
  );

  return <AuthContext value={contextValue}>{children}</AuthContext>;
}
