import { fetchWithAuth, API_BASE_URL } from '@/services/api';
import { getCurrentUserId } from '@/utils/storage';

export const BASE = `${API_BASE_URL}/features-cms`;
export const STATIC_BASE = API_BASE_URL.replace(/\/v1\/?$/, '');
export const MEDIA_BASE = `${STATIC_BASE}/features-cms`;

export const getFeatureMediaUrl = (path?: string): string => {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('file://') ||
    path.startsWith('content://') ||
    path.startsWith('ph://') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${MEDIA_BASE}/${cleanPath}`;
};

export interface FeaturePoint {
  _id?: string;
  point_title: string;
  point_description?: string;
  icon?: string;
}

export interface Feature {
  _id: string;
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  video?: string;
  feature_points: FeaturePoint[];
  order: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFormData {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  video?: string;
  imageFile?: any; // File object or picker result
  videoFile?: any; // File object or picker result
  feature_points: FeaturePoint[];
  order: number;
  status: number;
  removeImage?: boolean;
  removeVideo?: boolean;
}

export const generateFeatureSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Helper to construct FormData or JSON body for features endpoint matching backend Joi schema
 */
function prepareFeaturePayload(payload: FeatureFormData | any): FormData {
  if (payload instanceof FormData) return payload;

  const fd = new FormData();

  fd.append('title', (payload.title || '').trim());
  if (payload.slug) {
    fd.append('slug', payload.slug.trim().toLowerCase());
  }
  if (payload.description !== undefined && payload.description !== null) {
    fd.append('description', payload.description);
  }

  fd.append('order', String(Number(payload.order ?? 0)));

  const statusVal =
    payload.status === 1 ||
    payload.status === true ||
    payload.status === '1' ||
    payload.status === 'true'
      ? '1'
      : '0';
  fd.append('status', statusVal);
  fd.append('removeImage', String(Boolean(payload.removeImage)));
  fd.append('removeVideo', String(Boolean(payload.removeVideo)));

  const cleanedPoints =
    payload.feature_points?.map((pt: any) => ({
      point_title: (pt.point_title || '').trim(),
      point_description: (pt.point_description || '').trim(),
    })) || [];

  if (cleanedPoints.length > 0) {
    fd.append('feature_points', JSON.stringify(cleanedPoints));
  }

  if (payload.imageFile) {
    fd.append('image', payload.imageFile);
  }

  if (payload.videoFile) {
    fd.append('video', payload.videoFile);
  }

  return fd;
}

export const listFeatures = async (params = ''): Promise<{ data: Feature[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/list?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch features');
  }
  return res;
};

export const getFeatureDetails = async (id: string): Promise<Feature> => {
  const res = await fetchWithAuth(`${BASE}/details/${id}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch feature details');
  }
  const item = res?.data || res;
  if (item && !item.id && item._id) {
    item.id = item._id;
  }
  return item;
};

export const getFeature = getFeatureDetails;

export const createFeature = async (payload: FeatureFormData | any): Promise<any> => {
  const userId = await getCurrentUserId();
  const body = prepareFeaturePayload(payload);
  const endpoint = userId ? `${BASE}/create/${userId}` : `${BASE}/create`;
  const res = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: body as any,
  });
  console.log(res, 'resres-create-features');
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to create feature');
  }
  return res;
};

export const updateFeature = async (id: string, payload: FeatureFormData | any): Promise<any> => {
  const userId = await getCurrentUserId();
  const body = prepareFeaturePayload(payload);
  const endpoint = userId ? `${BASE}/update/${id}/${userId}` : `${BASE}/update/${id}`;
  const res = await fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: body as any,
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to update feature');
  }
  return res;
};

export const deleteFeature = async (id: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete/${id}`, {
    method: 'DELETE',
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to delete feature');
  }
  return res;
};

export const updateFeatureStatus = async (id: string, status: boolean | number): Promise<any> => {
  const statusVal = status === true || status === 1 ? 1 : 0;
  const res = await fetchWithAuth(`${BASE}/update-status/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: statusVal }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update status');
  }
  return res;
};

export const reorderFeatures = async (orderedIds: string[]): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/reorder-statuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to reorder features');
  }
  return res;
};
