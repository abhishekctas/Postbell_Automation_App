import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const BASE = `${API_BASE_URL}/festivals`;

// Helper function to check if response contains an error (matching control panel)
export const hasError = (response: any): boolean => {
  if (!response) return true;

  if (typeof response.status === 'number') {
    return response.status < 200 || response.status >= 400;
  }

  if (response.success === false) {
    return true;
  }

  return false;
};

export interface FestivalData {
  festivalId?: string;
  id?: string;
  name: string;
  date: string;
  category?: string;
  status: 'active' | 'inactive';
  autoGenerate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FestivalGeneratedPost {
  _id?: string;
  festivalId: string;
  id: string;
  name: string;
  date: string;
  category?: string;
  status: 'active' | 'inactive';
  selectedFestival?: boolean;
  autoGenerate?: boolean;
  image?: string;
  image_url?: string;
  caption?: string;
  hashtags?: string[];
  year?: number;
  language?: string;
  isAutoPost?: boolean;
  autoPostType?: string;
  post_status?: 'draft' | 'scheduled' | 'published';
  scheduled_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Backward compatibility alias
export type FestivalPost = FestivalGeneratedPost;

export interface FestivalListParams {
  customerId?: string;
  lookupByCustomerId?: boolean;
  currentMonth?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FestivalNotificationResponse {
  success: boolean;
  message: string;
  sent?: number;
  failed?: number;
}

export interface UpdateFestivalPostPayload {
  name?: string;
  date?: string;
  category?: string;
  status?: 'active' | 'inactive';
  selectedFestival?: boolean;
  autoGenerate?: boolean;
  caption?: string;
  hashtags?: string[];
  image?: string;
}

export interface CreateFestivalPostPayload {
  festivalId?: string;
  name: string;
  date: string;
  category?: string;
  status?: 'active' | 'inactive';
  selectedFestival?: boolean;
  autoGenerate?: boolean;
  caption?: string;
  hashtags?: string[];
  image?: string;
}

export const getUploadBaseUrl = () => API_BASE_URL.replace(/\/v1$/, '');

export const getFestivalImageUrl = (image?: string): string => {
  if (!image) return '';
  if (
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('blob:') ||
    image.startsWith('file:') ||
    image.startsWith('data:')
  ) {
    return image;
  }
  const cleanImage = image.replace(/^\/+/, '');
  return `${getUploadBaseUrl()}/generated-post-images/${cleanImage}`;
};

export const normalizeFestivalPosts = (response: any): FestivalGeneratedPost[] => {
  if (!response) return [];
  const payload = response?.data;
  const directPosts = Array.isArray(response?.data) ? response.data : [];
  const nestedPosts = Array.isArray(payload?.posts) ? payload.posts : [];
  const rootPosts = Array.isArray(response) ? response : [];
  const posts =
    directPosts.length > 0 ? directPosts : nestedPosts.length > 0 ? nestedPosts : rootPosts;

  return posts.map((post: any) => {
    const rawId =
      post.id || post._id || post.festivalId || post.festival_id || String(Math.random());
    const rawFestivalId = post.festivalId || post.id || post._id || post.festival_id || rawId;
    const img = post.image || post.image_url || post.imageUrl || '';

    return {
      ...post,
      _id: String(rawId),
      id: String(rawId),
      festivalId: String(rawFestivalId),
      name: post.name || post.festivalName || '',
      date: post.date || post.festivalDate || '',
      category: post.category || post.festivalCategory || '',
      status: (post.status || post.festivalStatus || 'active') as 'active' | 'inactive',
      selectedFestival: Boolean(post.selectedFestival ?? post.selected ?? post.isAutoPost),
      autoGenerate:
        post.autoGenerate !== undefined
          ? Boolean(post.autoGenerate)
          : post.auto_generate !== undefined
            ? Boolean(post.auto_generate)
            : false,
      image: img,
      image_url: img,
      caption: post.caption || post.content || '',
      hashtags: Array.isArray(post.hashtags)
        ? post.hashtags
        : typeof post.hashtags === 'string'
          ? post.hashtags
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
      isAutoPost: Boolean(post.isAutoPost),
      post_status: post.post_status,
      year: post.year,
      language: post.language,
      scheduled_at: post.scheduled_at,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  });
};

export const getFestivalPosts = async (
  params: string | FestivalListParams = ''
): Promise<{ data: FestivalGeneratedPost[]; pagination?: any }> => {
  const queryParams =
    typeof params === 'string'
      ? params
      : new URLSearchParams(
          Object.entries(params).reduce(
            (acc, [key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
                acc[key] = String(value);
              }
              return acc;
            },
            {} as Record<string, string>
          )
        ).toString();

  const url = `${BASE}/get-festival-posts?${queryParams}`;
  const data = await fetchWithAuth(url);

  if (hasError(data)) {
    throw new Error(data?.message || 'Failed to fetch festival posts');
  }

  const normalizedPosts = normalizeFestivalPosts(data);
  return { data: normalizedPosts, pagination: data?.pagination || data?.data?.pagination };
};

// Backward compatibility alias
export const listFestivalPosts = getFestivalPosts;

export const sendFestivalNotifications = async (
  festivalName: string
): Promise<FestivalNotificationResponse> => {
  const response = await fetchWithAuth(`${BASE}/send-festival-notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ festivalName }),
  });

  if (hasError(response) || response?.success === false) {
    throw new Error(response?.message || 'Failed to send festival notifications');
  }

  return response as FestivalNotificationResponse;
};

export const updateFestivalPostSelection = async (
  festivalId: string,
  selectedFestival: boolean
): Promise<{ success: boolean; message: string; data?: FestivalGeneratedPost }> => {
  const response = await fetchWithAuth(`${BASE}/festival-post-selection/${festivalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedFestival }),
  });

  if (hasError(response) || response?.success === false) {
    throw new Error(response?.message || 'Failed to update festival post selection');
  }

  return response as { success: boolean; message: string; data?: FestivalGeneratedPost };
};

export const updateFestivalPost = async (
  festivalId: string,
  payload: UpdateFestivalPostPayload
): Promise<{ success: boolean; message: string; data?: FestivalGeneratedPost }> => {
  const response = await fetchWithAuth(`${BASE}/update-festival-post/${festivalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (hasError(response) || response?.success === false) {
    throw new Error(response?.message || 'Failed to update festival post');
  }

  return response as { success: boolean; message: string; data?: FestivalGeneratedPost };
};

export const createFestivalPost = async (
  payload: CreateFestivalPostPayload
): Promise<{ success: boolean; message: string; data?: FestivalGeneratedPost }> => {
  const response = await fetchWithAuth(`${BASE}/create-festival-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (hasError(response) || response?.success === false) {
    throw new Error(response?.message || 'Failed to create festival post');
  }

  return response as { success: boolean; message: string; data?: FestivalGeneratedPost };
};

export const uploadFestivalImage = async (
  uri: string
): Promise<{ success: boolean; message: string; data?: { url: string } }> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'festival.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  const response = await fetchWithAuth(`${BASE}/upload-festival-image`, {
    method: 'POST',
    body: formData,
  });

  if (hasError(response) || response?.success === false) {
    throw new Error(response?.message || 'Failed to upload image');
  }

  return response as { success: boolean; message: string; data?: { url: string } };
};

export const generateFestivalPostAI = async (
  provider: 'gemini' | 'openai',
  payload: { prompt: string; referenceImageUri?: string }
): Promise<{ success: boolean; message: string; data?: any }> => {
  const formData = new FormData();
  formData.append('prompt', payload.prompt);

  if (payload.referenceImageUri) {
    const uri = payload.referenceImageUri;
    const filename = uri.split('/').pop() || 'reference.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('reference_image', {
      uri,
      name: filename,
      type,
    } as any);
  }

  const aiUrl = `${API_BASE_URL}/ai/generate-post/${provider}`;
  const response = await fetchWithAuth(aiUrl, {
    method: 'POST',
    body: formData,
  });

  if (hasError(response) || response?.success === false) {
    throw new Error(response?.message || 'Failed to generate content via AI');
  }

  return response as { success: boolean; message: string; data?: any };
};
