import { fetchWithAuth, API_BASE_URL } from '@/services/api';
import { getSecureUserData } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE = `${API_BASE_URL}/generated-posts`;
const SOCIAL_BASE = `${API_BASE_URL}/social-post`;
const AI_BASE = `${API_BASE_URL}/ai`;

export interface PostContent {
  caption?: string;
  link?: string;
  comment?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    name?: string;
    size?: number;
    imagePath?: string;
  }[];
}

export interface PlatformSpecificContent {
  platform: string;
  account_id?: string;
  caption?: string;
  post_url?: string;
  media_url?: string;
  content_type?: 'image' | 'video' | 'text';
  post_id?: string;
  posted_at?: string;
  post_status?: string;
  error_message?: string;
}

export interface Post {
  _id?: string;
  id?: string;
  title?: string;
  companyName?: string;
  company_name?: string;
  companyEmail?: string;
  company_email?: string;
  company_phone?: string;
  company_website?: string;
  caption?: string;
  hashtags?: string[];
  image_url?: string;
  image_path?: string;
  generalContent?: PostContent;
  platformSpecificContent?: Record<string, PlatformSpecificContent[]> | PlatformSpecificContent[];
  selectedNetworks?: string[];
  selectedAccounts?: string[] | Record<string, string[]>;
  post_status?: string;
  scheduled_at?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  festivalName?: string;
  origin?: string;
  isFestivalGenerated?: boolean;
  isDraft?: boolean;
  isScheduled?: boolean;
}

export interface SocialAccount {
  account_id: string;
  account_name: string;
  username?: string;
  platform: string;
  page_id?: string;
  waba_id?: string;
  instagram_business_account_id?: string;
  first_name?: string;
  last_name?: string;
  is_default?: boolean;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saved?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
}

export interface PostDetails {
  id?: string;
  post_id?: string;
  post_status?: string;
  caption?: string;
  image_url?: string;
  hashtags?: string[];
  createdAt?: string;
  updatedAt?: string;
  platforms?: any[];
  summary?: {
    total_platforms?: number;
    total_likes?: number;
    total_comments?: number;
    total_shares?: number;
    total_saved?: number;
    total_interactions?: number;
    total_reach?: number;
    total_impressions?: number;
  };
}

export interface PaginatedPosts {
  data: Post[];
  pagination: {
    length: number;
    size: number;
    page: number;
    lastPage: number;
  };
}

const isApiError = (res: any) => {
  if (!res || typeof res !== 'object') return false;
  if (res.success === false) return true;
  if (res.code && res.code !== 200 && res.code !== 201 && res.code !== '200' && res.code !== '201')
    return true;
  if (res.statusCode && Number(res.statusCode) >= 400) return true;
  if (res.status && typeof res.status === 'number' && res.status >= 400) return true;
  return false;
};

// === List Posts ===
export const listPosts = async (params = ''): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/get-generated-posts?${params}`);
  if (isApiError(res)) {
    throw new Error(res.message || 'Failed to fetch posts');
  }
  return res;
};

// === Get Single Post ===
export const getPost = async (postId: string): Promise<Post> => {
  const res = await fetchWithAuth(`${BASE}/get-generated-post/${postId}`);
  if (isApiError(res)) {
    throw new Error(res.message || 'Failed to fetch post details');
  }
  return res?.data || res;
};

// === Get Post Details (Social stats & platforms) ===
export const getPostDetails = async (postId: string): Promise<PostDetails> => {
  const res = await fetchWithAuth(`${SOCIAL_BASE}/get-post-details/${postId}`);
  if (isApiError(res)) {
    throw new Error(res.message || 'Failed to fetch post details');
  }
  return res?.data || res;
};

// === Create Post ===
export const createPost = async (payload: Partial<Post>): Promise<any> => {
  const data = await fetchWithAuth(`${BASE}/create-generated-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (isApiError(data)) {
    throw new Error(data.message || 'Failed to create post');
  }
  return data;
};

// === Update Post ===
export const updatePost = async (postId: string, payload: Partial<Post>): Promise<any> => {
  const data = await fetchWithAuth(`${BASE}/update-generated-post/${postId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (isApiError(data)) {
    throw new Error(data.message || 'Failed to update post');
  }
  return data;
};

// === Delete Post ===
export const deletePost = async (postId: string): Promise<void> => {
  const res = await fetchWithAuth(`${BASE}/delete-generated-post/${postId}`, {
    method: 'DELETE',
  });
  if (isApiError(res)) {
    throw new Error(res.message || 'Failed to delete post');
  }
};

// === Publish Post Now ===
export const publishPostNow = async (postId: string): Promise<any> => {
  const data = await fetchWithAuth(`${BASE}/publish-generated-post/${postId}`, {
    method: 'POST',
  });
  if (isApiError(data)) {
    throw new Error(data.message || 'Failed to publish post');
  }
  return data;
};

// === Get Active Social Accounts ===
export const getAllSocialAccountsForPost = async (loginTypeParam?: string): Promise<any> => {
  try {
    let loginType = loginTypeParam;
    if (!loginType) {
      const user = await getSecureUserData();
      const rawLoginType = await AsyncStorage.getItem('loginType');
      loginType = user?.loginType || rawLoginType || 'customer';
    }

    let res = await fetchWithAuth(`${BASE}/get-active-social-accounts-post?loginType=${loginType}`);
    let dataList = res?.data || res;

    // Fallback: If empty array returned, attempt alternate loginType ('user' vs 'customer')
    if ((!Array.isArray(dataList) || dataList.length === 0) && !loginTypeParam) {
      const fallbackType = loginType === 'customer' ? 'user' : 'customer';
      try {
        const fallbackRes = await fetchWithAuth(
          `${BASE}/get-active-social-accounts-post?loginType=${fallbackType}`
        );
        const fallbackData = fallbackRes?.data || fallbackRes;
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          return fallbackData;
        }
      } catch {
        // Ignore fallback error
      }
    }

    return dataList;
  } catch (err) {
    if (!loginTypeParam) {
      try {
        const fallbackType = 'user';
        const fallbackRes = await fetchWithAuth(
          `${BASE}/get-active-social-accounts-post?loginType=${fallbackType}`
        );
        return fallbackRes?.data || fallbackRes;
      } catch {
        // Return empty or original error
      }
    }
    throw err;
  }
};

// === Helper for Image URL resolution ===
export const getImageUrl = (url?: string): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  const serverHost = API_BASE_URL.replace(/\/v1\/?$/, '');
  if (trimmed.startsWith('/')) {
    return `${serverHost}${trimmed}`;
  }
  if (trimmed.startsWith('generated-post-images/')) {
    return `${serverHost}/${trimmed}`;
  }
  return `${serverHost}/generated-post-images/${trimmed}`;
};

// === Upload Post Image ===
export const uploadPostImage = async (
  fileUriOrFormData: string | FormData,
  fileName?: string,
  mimeType?: string
): Promise<any> => {
  let body: any;
  if (typeof fileUriOrFormData === 'string') {
    body = new FormData();
    const name = fileName || `post-${Date.now()}.jpg`;
    const type = mimeType || 'image/jpeg';

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(fileUriOrFormData);
        const blob = await response.blob();
        const file = new File([blob], name, { type: blob.type || type });
        body.append('file', file);
      } catch {
        body.append('file', {
          uri: fileUriOrFormData,
          name,
          type,
        } as any);
      }
    } else {
      body.append('file', {
        uri: fileUriOrFormData,
        name,
        type,
      } as any);
    }
  } else {
    body = fileUriOrFormData;
  }

  const res = await fetchWithAuth(`${BASE}/upload-post-image`, {
    method: 'POST',
    body,
  });
  if (res && (res.success === false || (res.statusCode && res.statusCode >= 400))) {
    throw new Error(res.message || 'Failed to upload image');
  }
  return res;
};

// === Generate AI Post ===
export const generateSocialMediaPost = async (payload: {
  prompt: string;
  provider?: string;
  platform?: string;
  tone?: string;
}): Promise<any> => {
  const path =
    payload.provider === 'gemini'
      ? 'generate-post/gemini'
      : payload.provider === 'openai'
        ? 'generate-post/openai'
        : 'generate-post';
  const res = await fetchWithAuth(`${AI_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (isApiError(res)) {
    throw new Error(res.message || 'AI Post generation failed');
  }
  return res?.data || res;
};

export interface ReferenceDetectedObject {
  id: string;
  label: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description?: string;
}

// === Generate Marketing Image From Reference ===
export const generateMarketingImageFromReference = async (
  fileUri: string,
  options: {
    prompt?: string;
    platform?: string;
    company_name?: string;
    company_website?: string;
    company_email?: string;
    provider?: 'auto' | 'gemini' | 'openai';
    reference_objects?: ReferenceDetectedObject[] | string;
  } = {}
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: `ref-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  if (options.prompt) formData.append('prompt', options.prompt);
  if (options.platform) formData.append('platform', options.platform);
  if (options.company_name) formData.append('company_name', options.company_name);
  if (options.company_website) formData.append('company_website', options.company_website);
  if (options.company_email) formData.append('company_email', options.company_email);
  if (options.provider) formData.append('provider', options.provider);
  if (options.reference_objects) {
    formData.append(
      'reference_objects',
      typeof options.reference_objects === 'string'
        ? options.reference_objects
        : JSON.stringify(options.reference_objects)
    );
  }

  const res = await fetchWithAuth(`${BASE}/generate-marketing-image-from-reference`, {
    method: 'POST',
    body: formData,
  });

  if (isApiError(res)) {
    throw new Error(res.message || 'Failed to generate marketing image from reference');
  }
  return res?.data || res;
};

// === Analyze Reference Media ===
export const analyzeReferenceMedia = async (fileUri: string): Promise<any> => {
  const formData = new FormData();
  formData.append('reference_image', {
    uri: fileUri,
    name: `ref-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  const res = await fetchWithAuth(`${AI_BASE}/reference-media/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (isApiError(res)) {
    throw new Error(res.message || 'Failed to analyze reference media');
  }
  return res?.data || res;
};
