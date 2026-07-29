import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const BASE = `${API_BASE_URL}/festivals`;

export interface FestivalPost {
  _id?: string;
  festivalId?: string;
  id?: string;
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
  isAutoPost?: boolean;
  post_status?: 'draft' | 'scheduled' | 'published';
}

export const getUploadBaseUrl = () => API_BASE_URL.replace(/\/v1$/, '');

export const getFestivalImageUrl = (image?: string): string => {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('blob:') || image.startsWith('file:')) {
    return image;
  }
  const cleanImage = image.replace(/^\/+/, '');
  return `${getUploadBaseUrl()}/generated-post-images/${cleanImage}`;
};

export const isPastDate = (input: Date | string): boolean => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return false;
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return target < todayStart;
};

export const normalizeFestivalPosts = (response: any): FestivalPost[] => {
  if (!response) return [];
  const payload = response?.data;
  const directPosts = Array.isArray(response?.data) ? response.data : [];
  const nestedPosts = Array.isArray(payload?.posts) ? payload.posts : [];
  const rootPosts = Array.isArray(response) ? response : [];
  const posts =
    directPosts.length > 0 ? directPosts : nestedPosts.length > 0 ? nestedPosts : rootPosts;

  return posts.map((post: any) => ({
    ...post,
    _id: post._id || post.id || post.festivalId || post.festival_id,
    id: post.id || post._id || post.festivalId || post.festival_id,
    name: post.name || post.festivalName || '',
    date: post.date || post.festivalDate || '',
    category: post.category || post.festivalCategory || '',
    status: post.status || post.festivalStatus || 'active',
    selectedFestival: Boolean(post.selectedFestival ?? post.selected ?? post.isAutoPost),
    autoGenerate: Boolean(post.autoGenerate ?? post.auto_generate ?? false),
    image: post.image || post.image_url || post.imageUrl || '',
    image_url: post.image_url || post.imageUrl || post.image || '',
    caption: post.caption || post.content || '',
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    isAutoPost: Boolean(post.isAutoPost),
    post_status: post.post_status,
  }));
};

export const listFestivalPosts = async (
  params = ''
): Promise<{ data: FestivalPost[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/get-festival-posts?${params}`);

  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch festival posts');
  }
  const normalized = normalizeFestivalPosts(res);
  return { data: normalized, pagination: res?.pagination };
};

export const updateFestivalPostSelection = async (
  festivalId: string,
  selectedFestival: boolean
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/festival-post-selection/${festivalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedFestival }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update festival selection');
  }
  return res;
};

export const updateFestivalPost = async (
  festivalId: string,
  payload: Partial<FestivalPost>
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-festival-post/${festivalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update festival post');
  }
  return res;
};

export const createFestivalPost = async (payload: Partial<FestivalPost>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-festival-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log(res, "resresresresresresresresres-create-festival-post")
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to create festival post');
  }
  return res;
};

export const sendFestivalNotifications = async (festivalName: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/send-festival-notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ festivalName }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to send notifications');
  }
  return res;
};

export const uploadFestivalImage = async (uri: string): Promise<any> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'festival.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  const res = await fetchWithAuth(`${BASE}/upload-festival-image`, {
    method: 'POST',
    body: formData,
  });

  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to upload image');
  }
  return res;
};

export const generateFestivalPostAI = async (
  provider: 'gemini' | 'openai',
  payload: { prompt: string; referenceImageUri?: string }
): Promise<any> => {
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
  const res = await fetchWithAuth(aiUrl, {
    method: 'POST',
    body: formData,
  });

  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to generate content via AI');
  }
  return res;
};
