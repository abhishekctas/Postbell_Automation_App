import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getCurrentUserId } from '@/utils/storage';

const getBaseUrl = () => {
  const envApiUrl = 'https://api.postbell.in/v1';
  let baseUrl = envApiUrl || 'http://localhost:4000/v1';

  if (Platform.OS !== 'web' && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.developer?.tool;
    if (hostUri && typeof hostUri === 'string') {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return baseUrl.replace(/localhost|127\.0\.0\.1/g, ip);
      }
    }
    if (Platform.OS === 'android') {
      return baseUrl.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
    }
  }

  return baseUrl;
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

export const api = {
  get: (url: string, options?: RequestInit) => fetchWithAuth(url, { ...options, method: 'GET' }),
  post: (url: string, options?: RequestInit) => fetchWithAuth(url, { ...options, method: 'POST' }),
  put: (url: string, options?: RequestInit) => fetchWithAuth(url, { ...options, method: 'PUT' }),
  delete: (url: string, options?: RequestInit) =>
    fetchWithAuth(url, { ...options, method: 'DELETE' }),
  patch: (url: string, options?: RequestInit) =>
    fetchWithAuth(url, { ...options, method: 'PATCH' }),
};

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
  profile: `${API_BASE_URL}/customers`,
  settings: `${API_BASE_URL}/general-settings`,
  festivals: `${API_BASE_URL}/festivals`,
  subscriptionPlans: `${API_BASE_URL}/subscription-plans`,
  subscriptions: `${API_BASE_URL}/subscriptions`,
  mySubscription: `${API_BASE_URL}/my-subscription`,
  systemLog: `${API_BASE_URL}/system-log`,
  featuresCms: `${API_BASE_URL}/features-cms`,
  socialAccounts: `${API_BASE_URL}/social-accounts`,
  customerDashboard: `${API_BASE_URL}/customer-dashboard`,
};

// Generic authenticated fetch helper using native fetch (compatible with React Native)
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();

  let token = await AsyncStorage.getItem('jwt_access_token');
  if (token) {
    token = String(token)
      .replace(/['"\r\n]+/g, '')
      .trim();
  }

  let loggedInUserId: string | null = null;
  try {
    loggedInUserId = await getCurrentUserId();
    if (loggedInUserId) {
      loggedInUserId = String(loggedInUserId)
        .replace(/['"\r\n]+/g, '')
        .trim();
    }
  } catch (e) {
    console.warn('Could not retrieve loggedInUserId:', e);
  }

  const authUrls = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/change-password',
    '/auth/sign-in-with-token',
    '/auth/otp/request',
    '/auth/otp/verify',
    '/auth/otp/resend',
    '/customers/login-customer',
    '/customers/customer-forgot-password',
    '/customers/reset-customer-password',
    '/customers/register-customer',
    '/customers/verify-email',
    '/customers/refresh-tokens',
    '/customers/sign-in-with-token',
    '/ai-logo',
  ];

  const skipAppendUserIdUrls = [
    ...authUrls,
    '/upload-post-image',
    '/delete-post-image',
    '/get-generated-posts',
    '/get-active-social-accounts-post',
    '/ai/',
    '/ai',
    '/generate-post',
    '/generate-marketing-image-from-reference',
  ];

  const isAuthUrl = authUrls.some((authUrl) => url.includes(authUrl));
  const shouldSkipAppend = skipAppendUserIdUrls.some((skipUrl) => url.includes(skipUrl));

  let finalUrl = url;

  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `${API_BASE_URL}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
  }

  if (Platform.OS !== 'web') {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.developer?.tool;
    const devIp =
      hostUri && typeof hostUri === 'string'
        ? hostUri.split(':')[0]
        : Platform.OS === 'android'
          ? '10.0.2.2'
          : null;
    if (devIp && devIp !== 'localhost' && devIp !== '127.0.0.1') {
      finalUrl = finalUrl.replace(/localhost|127\.0\.0\.1|192\.168\.\d+\.\d+/g, devIp);
    } else if (
      Platform.OS === 'android' &&
      (finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1'))
    ) {
      finalUrl = finalUrl.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
    }
  }

  if (loggedInUserId && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !shouldSkipAppend) {
    if (!finalUrl.includes(`/${loggedInUserId}`)) {
      if (finalUrl.includes('?')) {
        const [base, query] = finalUrl.split('?');
        finalUrl = `${base}/${loggedInUserId}?${query}`;
      } else {
        finalUrl = `${finalUrl}/${loggedInUserId}`;
      }
    }
  }

  const isFormData =
    options.body instanceof FormData ||
    (options.body &&
      typeof options.body === 'object' &&
      (options.body as any)._parts !== undefined) ||
    options.body?.constructor?.name === 'FormData';

  const reqHeaders: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(loggedInUserId && !isAuthUrl ? { 'X-User-Id': loggedInUserId } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!isFormData) {
    if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
  } else {
    delete reqHeaders['Content-Type'];
    delete reqHeaders['content-type'];
    delete reqHeaders['Content-type'];
  }

  const config: RequestInit = { ...options, headers: reqHeaders };

  try {
    const response = await fetch(finalUrl, config);

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

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return {
        success: response.ok,
        statusCode: response.status,
        message: text || response.statusText,
        data: null,
      };
    }
  } catch (err: any) {
    console.error('API Request Failed', { url: finalUrl, method, message: err?.message });

    // Fallback retry for Android Emulator or Host IP mismatch
    if (err?.message === 'Network request failed') {
      const candidates = [
        finalUrl.includes('10.0.2.2')
          ? null
          : finalUrl.replace(/http:\/\/[^/]+/, 'http://10.0.2.2:4000'),
        finalUrl.includes('localhost')
          ? null
          : finalUrl.replace(/http:\/\/[^/]+/, 'http://localhost:4000'),
      ].filter(Boolean) as string[];

      for (const altUrl of candidates) {
        try {
          console.log('Retrying with alternate host IP:', altUrl);
          const altResponse = await fetch(altUrl, config);
          if (altResponse.status === 401) {
            return { success: false, statusCode: 401, message: 'Unauthorized' };
          }
          const contentType = altResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await altResponse.json();
          }
          const text = await altResponse.text();
          try {
            return JSON.parse(text);
          } catch {
            return {
              success: altResponse.ok,
              statusCode: altResponse.status,
              message: text || altResponse.statusText,
              data: null,
            };
          }
        } catch {
          // Alt retry failed, try next candidate
        }
      }
    }

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
