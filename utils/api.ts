import AsyncStorage from '@react-native-async-storage/async-storage';
import ky, { KyInstance } from 'ky';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (isDev) {
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:4000/v1`;
    }
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4000/v1';
    }
  }
  return 'http://localhost:4000/v1';
};

export const API_BASE_URL = getBaseUrl();

let globalHeaders: Record<string, string> = {};

export const setGlobalHeaders = (headers: Record<string, string>) => {
  globalHeaders = { ...globalHeaders, ...headers };
};

export const removeGlobalHeaders = (headerKeys: string[]) => {
  headerKeys.forEach((key) => {
    delete globalHeaders[key];
  });
};

export const getGlobalHeaders = () => globalHeaders;

export const api: KyInstance = ky.create({
  prefixUrl: `${API_BASE_URL}/`,
  hooks: {
    beforeRequest: [
      (request) => {
        Object.entries(globalHeaders).forEach(([key, value]) => {
          request.headers.set(key, value);
        });
      },
    ],
  },
  retry: {
    limit: 1,
    methods: ['get', 'options', 'trace'],
  },
});

// Auth API endpoints
export const AUTH_ENDPOINTS = {
  requestOtp: `${API_BASE_URL}/auth/otp/request`,
  verifyOtp: `${API_BASE_URL}/auth/otp/verify`,
  resendOtp: `${API_BASE_URL}/auth/otp/resend`,
  signInWithToken: `${API_BASE_URL}/auth/sign-in-with-token`,
  forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
  resetPassword: `${API_BASE_URL}/auth/reset-password`,
};

// App API endpoints
export const API_ENDPOINTS = {
  dashboard: `${API_BASE_URL}/dashboard`,
  posts: `${API_BASE_URL}/generated-posts`,
  socialPosts: `${API_BASE_URL}/social-post`,
  users: `${API_BASE_URL}/auth`,
  profile: `${API_BASE_URL}/users`,
  settings: `${API_BASE_URL}/general-settings`,
  festivals: `${API_BASE_URL}/festivals`,
  subscriptionPlans: `${API_BASE_URL}/subscription-plans`,
  subscriptions: `${API_BASE_URL}/subscriptions`,
  mySubscription: `${API_BASE_URL}/my-subscription`,
  systemLog: `${API_BASE_URL}/system-log`,
  featuresCms: `${API_BASE_URL}/features-cms`,
  socialAccounts: `${API_BASE_URL}/social-accounts`,
};

// Generic authenticated fetch helper using native fetch (compatible with React Native)
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();

  let token = await AsyncStorage.getItem('jwt_access_token');
  if (token) {
    token = token.replace(/['"]+/g, '');
  }

  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config: RequestInit = { ...options, headers };
  console.log(config, "config");

  try {
    const response = await fetch(url, config);

    // Check for updated token in response headers
    const newToken = response.headers.get('New-Access-Token');
    if (newToken) {
      await AsyncStorage.setItem('jwt_access_token', newToken);
      setGlobalHeaders({ Authorization: `Bearer ${newToken}` });
    }

    if (response.status === 401) {
      // Token expired — caller should handle sign-out
      return { success: false, statusCode: 401, message: 'Unauthorized' };
    }

    return await response.json();
  } catch (err: any) {
    console.error('API Request Failed', { url, method, message: err?.message });
    return {
      success: false,
      statusCode: 503,
      status: 503,
      code: 503,
      message: 'Server is temporarily unavailable. Please try again later.',
      data: null,
    };
  }
}

export default api;
