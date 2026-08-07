import { fetchWithAuth, API_BASE_URL } from '@/services/api';
import { getCurrentUserId } from '@/utils/storage';

const BASE = `${API_BASE_URL}/blog-post`;

export const getBlogCoverImageUrl = (image?: string): string => {
  if (!image) return '';
  if (
    image.startsWith('file://') ||
    image.startsWith('content://') ||
    image.startsWith('ph://') ||
    image.startsWith('data:')
  ) {
    return image;
  }
  const staticBase = API_BASE_URL.replace(/\/v1\/?$/, '');

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
      .replace(/\/v1\/blogs\//i, '/blogs/')
      .replace(/\/v1\/blog-covers\//i, '/blog-covers/')
      .replace(/\/v1\/blog-images\//i, '/blog-images/');
  }

  let cleanPath = image.startsWith('/') ? image.slice(1) : image;

  if (cleanPath.startsWith('blogs/')) {
    return `${staticBase}/${cleanPath}`;
  }
  if (cleanPath.startsWith('blog-covers/')) {
    return `${staticBase}/${cleanPath}`;
  }
  if (cleanPath.startsWith('blog-images/')) {
    return `${staticBase}/${cleanPath}`;
  }

  return `${staticBase}/blog-covers/${cleanPath}`;
};

export const getTagImageUrl = (image?: string): string => {
  if (!image) return '';
  if (
    image.startsWith('file://') ||
    image.startsWith('content://') ||
    image.startsWith('ph://') ||
    image.startsWith('data:')
  ) {
    return image;
  }
  const staticBase = API_BASE_URL.replace(/\/v1\/?$/, '');

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image.replace(/\/v1\/blogs\//i, '/blogs/');
  }

  let cleanPath = image.startsWith('/') ? image.slice(1) : image;
  if (cleanPath.startsWith('blogs/')) {
    return `${staticBase}/${cleanPath}`;
  }

  return `${staticBase}/blogs/${cleanPath}`;
};

export const prepareTagFormData = (payload: TagFormData | any): FormData => {
  if (payload instanceof FormData) return payload;

  const formData = new FormData();

  if (payload.title) formData.append('title', (payload.title || '').trim());
  if (payload.subtitle) formData.append('subtitle', payload.subtitle);
  if (payload.is_popular !== undefined && payload.is_popular !== null) {
    formData.append('is_popular', String(payload.is_popular));
  }
  if (payload.link_url) formData.append('link_url', payload.link_url);
  if (payload.link_text) formData.append('link_text', payload.link_text);
  if (payload.blog_id) formData.append('blog_id', payload.blog_id);
  if (payload.order !== undefined && payload.order !== null) {
    formData.append('order', String(payload.order));
  }
  if (payload.status !== undefined && payload.status !== null) {
    formData.append('status', String(payload.status));
  }
  if (payload.starts_at) formData.append('starts_at', payload.starts_at);
  if (payload.ends_at) formData.append('ends_at', payload.ends_at);

  if (payload.image_urlFile) {
    const file = payload.image_urlFile;
    const filename = file.fileName || file.uri.split('/').pop() || 'tag.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = file.mimeType || file.type || (match ? `image/${match[1]}` : 'image/jpeg');
    formData.append('image_url', {
      uri: file.uri,
      name: filename,
      type,
    } as any);
  } else if (
    payload.image_url &&
    typeof payload.image_url === 'string' &&
    !payload.image_url.startsWith('file://')
  ) {
    formData.append('image_url', payload.image_url);
  }

  return formData;
};

export const prepareBlogFormData = (payload: BlogFormData | Partial<BlogPost> | any): FormData => {
  if (payload instanceof FormData) return payload;

  const formData = new FormData();

  if (payload.title) formData.append('title', (payload.title || '').trim());
  if (payload.slug) formData.append('slug', (payload.slug || '').trim().toLowerCase());
  if (payload.status !== undefined && payload.status !== null) {
    formData.append('status', String(payload.status));
  }

  if (payload.body) formData.append('body', payload.body);
  if (payload.excerpt) formData.append('excerpt', payload.excerpt);
  if (payload.author_label) formData.append('author_label', payload.author_label);
  if (payload.category) {
    const catId =
      payload.category && typeof payload.category === 'object'
        ? (payload.category as any)._id || (payload.category as any).id
        : payload.category;
    if (catId) formData.append('category', catId);
  }
  if (payload.seo_title) formData.append('seo_title', payload.seo_title);
  if (payload.seo_description) formData.append('seo_description', payload.seo_description);
  if (payload.read_time_minutes !== undefined && payload.read_time_minutes !== null) {
    formData.append('read_time_minutes', String(payload.read_time_minutes));
  }

  if (payload.cover_imageFile) {
    const file = payload.cover_imageFile;
    const filename = file.fileName || file.uri.split('/').pop() || `cover_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = file.mimeType || file.type || (match ? `image/${match[1]}` : 'image/jpeg');
    formData.append('cover_image', {
      uri: file.uri,
      name: filename,
      type,
    } as any);
  } else if (
    payload.cover_image &&
    typeof payload.cover_image === 'string' &&
    !payload.cover_image.startsWith('file://') &&
    !payload.cover_image.startsWith('content://')
  ) {
    let cleanImage = payload.cover_image;
    if (cleanImage.includes('/blogs/')) {
      cleanImage = cleanImage.split('/blogs/').pop() || cleanImage;
    } else if (cleanImage.includes('/blog-covers/')) {
      cleanImage = cleanImage.split('/blog-covers/').pop() || cleanImage;
    }
    formData.append('cover_image', cleanImage);
  }

  if (payload.tag_ids?.length) {
    const ids = payload.tag_ids
      .map((t: any) => (t && typeof t === 'object' ? t._id || t.id : t))
      .filter(Boolean);
    if (ids.length) formData.append('tag_ids', JSON.stringify(ids));
  }

  if (payload.content_tags?.length) {
    formData.append('content_tags', JSON.stringify(payload.content_tags));
  }

  if (payload.faq_ids?.length) {
    const ids = payload.faq_ids
      .map((f: any) => (f && typeof f === 'object' ? f._id || f.id : f))
      .filter(Boolean);
    if (ids.length) formData.append('faq_ids', JSON.stringify(ids));
  }

  if (payload.toc?.length) {
    formData.append('toc', JSON.stringify(payload.toc));
  }

  if (payload.seo_links?.length) {
    formData.append('seo_links', JSON.stringify(payload.seo_links));
  }

  const sc = payload.sidebar_category;
  if (sc && Object.values(sc).some((v) => v !== undefined && v !== null && v !== '')) {
    formData.append('sidebar_category', JSON.stringify(sc));
  }

  const sb = payload.shop_banner;
  if (sb && typeof sb === 'object') {
    const sbJson = JSON.stringify(sb);
    formData.append('shop_banner', sbJson);
    formData.append('sidebar_category', sbJson);
  }

  return formData;
};

export const prepareGuidesConfigFormData = (payload: GuidesConfigFormData | any): FormData => {
  if (payload instanceof FormData) return payload;

  const formData = new FormData();

  if (payload.featured_blog_id) {
    const fId =
      payload.featured_blog_id && typeof payload.featured_blog_id === 'object'
        ? payload.featured_blog_id._id || payload.featured_blog_id.id
        : payload.featured_blog_id;
    if (fId) formData.append('featured_blog_id', fId);
  }
  if (payload.featured_label) formData.append('featured_label', payload.featured_label);
  if (payload.featured_cta_text) formData.append('featured_cta_text', payload.featured_cta_text);
  if (payload.status !== undefined && payload.status !== null) {
    formData.append('status', String(payload.status));
  }

  if (payload.hero) {
    formData.append('hero', JSON.stringify(payload.hero));
  }

  if (payload.filter_tabs) {
    formData.append('filter_tabs', JSON.stringify(payload.filter_tabs));
  }

  if (payload.info_section) {
    formData.append('info_section', JSON.stringify(payload.info_section));
  }

  return formData;
};

// ─── BLOG APIS ──────────────────────────────────────────────────────────────

export const listBlogs = async (params = ''): Promise<{ data: BlogPost[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/get-all-blogs?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch blogs');
  }
  return res;
};

export const getBlog = async (id: string): Promise<BlogPost> => {
  const res = await fetchWithAuth(`${BASE}/get-blog/${id}`);
  if (res && res.status !== 200 && res.success === false) {
    throw new Error(res.message || 'Failed to fetch blog');
  }
  return res?.data || res;
};

export const getBlogDetails = getBlog;

export const createBlog = async (payload: Partial<BlogPost> | BlogFormData | any): Promise<any> => {
  const userId = await getCurrentUserId();
  const body = prepareBlogFormData(payload);
  const endpoint = userId ? `${BASE}/create-blog/${userId}` : `${BASE}/create-blog`;
  const res = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: body as any,
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to create blog');
  }
  return res;
};

export const updateBlog = async (
  id: string,
  payload: Partial<BlogPost> | BlogFormData | any
): Promise<any> => {
  const userId = await getCurrentUserId();
  const body = prepareBlogFormData(payload);
  const endpoint = userId ? `${BASE}/update-blog/${id}/${userId}` : `${BASE}/update-blog/${id}`;
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
    throw new Error(res.message || 'Failed to update blog');
  }
  return res;
};

export const deleteBlog = async (id: string): Promise<any> => {
  const userId = await getCurrentUserId();
  const endpoint = userId ? `${BASE}/delete-blog/${id}/${userId}` : `${BASE}/delete-blog/${id}`;
  const res = await fetchWithAuth(endpoint, {
    method: 'DELETE',
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to delete blog');
  }
  return res;
};

export const updateBlogStatus = async (id: string): Promise<any> => {
  const userId = await getCurrentUserId();
  const endpoint = userId
    ? `${BASE}/update-blog-status/${id}/${userId}`
    : `${BASE}/update-blog-status/${id}`;
  const res = await fetchWithAuth(endpoint, {
    method: 'POST',
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to update blog status');
  }
  return res;
};

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface Tag {
  _id: string;
  id?: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  link_url?: string;
  link_text?: string;
  blog_id?: string;
  order?: number;
  status?: number;
  is_popular?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagFormData {
  title: string;
  subtitle?: string;
  image_url?: string;
  link_url?: string;
  link_text?: string;
  blog_id?: string;
  order?: number;
  status?: number;
  is_popular?: boolean;
}

export interface FaqItem {
  _id: string;
  id?: string;
  question: string;
  answer: string;
  order?: number;
  status?: number;
  blog_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqFormData {
  question: string;
  answer: string;
  order?: number;
  status?: number;
  blog_id?: string;
}

export interface TocItem {
  label: string;
  anchor: string;
  order: number;
}

export interface SidebarCategory {
  label?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
}

export interface SeoLink {
  label?: string;
  url?: string;
  order?: number;
}

export interface ShopBanner {
  title?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
}

export interface BlogImage {
  _id: string;
  blog_id: string;
  url: string;
  alt_text?: string;
  order?: number;
  status?: number;
  createdAt?: string;
}

export interface BlogPost {
  _id: string;
  id?: string;
  title: string;
  excerpt?: string;
  body?: string;
  slug: string;
  cover_image?: string;
  category?: Tag | string;
  tag_ids?: Tag[] | string[];
  faq_ids?: FaqItem[] | string[];
  content_tags?: string[];
  read_time_minutes?: number;
  author_label?: string;
  cta_label?: string;
  cta_url?: string;
  toc?: TocItem[];
  sidebar_category?: SidebarCategory;
  seo_links?: SeoLink[];
  shop_banner?: ShopBanner;
  related_blog_ids?: BlogPost[] | string[];
  seo_title?: string;
  seo_description?: string;
  status: number; // 0 Draft, 1 Published
  published_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogFormData {
  title: string;
  excerpt?: string;
  body?: string;
  slug: string;
  cover_image?: string;
  category?: string;
  tag_ids?: string[];
  faq_ids?: string[];
  content_tags?: string[];
  read_time_minutes?: number;
  author_label?: string;
  toc?: TocItem[];
  sidebar_category?: SidebarCategory;
  seo_links?: SeoLink[];
  shop_banner?: ShopBanner;
  related_blog_ids?: string[];
  seo_title?: string;
  seo_description?: string;
  status: number;
}

export interface InfoPoint {
  title?: string;
  description?: string;
  order?: number;
}

export interface FilterTab {
  label: string;
  tag_id?: string | Tag;
  is_default: boolean;
  order: number;
}

export interface GuidesListingConfig {
  _id?: string;
  hero?: {
    badge_label?: string;
    title?: string;
    description?: string;
    image_url?: string;
    tag_pills?: string[];
  };
  featured_blog_id?: string | BlogPost;
  featured_label?: string;
  featured_cta_text?: string;
  filter_tabs?: FilterTab[];
  info_section?: {
    badge_label?: string;
    title?: string;
    description?: string;
    points?: InfoPoint[];
  };
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuidesConfigFormData {
  hero?: {
    badge_label?: string;
    title?: string;
    description?: string;
    image_url?: string;
    tag_pills?: string[];
  };
  featured_blog_id?: string;
  featured_label?: string;
  featured_cta_text?: string;
  filter_tabs?: FilterTab[];
  info_section?: {
    badge_label?: string;
    title?: string;
    description?: string;
    points?: InfoPoint[];
  };
  status?: number;
}

// ─── TAG APIS ───────────────────────────────────────────────────────────────

export const getAllTags = async (params = ''): Promise<Tag[]> => {
  const res = await fetchWithAuth(`${BASE}/get-all-tags?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch tags');
  }
  return res?.data || res?.results || (Array.isArray(res) ? res : []);
};

export const createTag = async (payload: TagFormData | any): Promise<any> => {
  const userId = await getCurrentUserId();
  const body = prepareTagFormData(payload);
  const endpoint = userId ? `${BASE}/create-tag/${userId}` : `${BASE}/create-tag`;
  const res = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: body as any,
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to create tag');
  }
  return res;
};

export const updateTag = async (
  tagId: string,
  payload: Partial<TagFormData> | any
): Promise<any> => {
  const userId = await getCurrentUserId();
  const body = prepareTagFormData(payload);
  const endpoint = userId ? `${BASE}/update-tag/${tagId}/${userId}` : `${BASE}/update-tag/${tagId}`;
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
    throw new Error(res.message || 'Failed to update tag');
  }
  return res;
};

export const deleteTag = async (tagId: string): Promise<any> => {
  const userId = await getCurrentUserId();
  const endpoint = userId ? `${BASE}/delete-tag/${tagId}/${userId}` : `${BASE}/delete-tag/${tagId}`;
  const res = await fetchWithAuth(endpoint, {
    method: 'DELETE',
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to delete tag');
  }
  return res;
};

export const updateTagStatus = async (tagId: string): Promise<any> => {
  const userId = await getCurrentUserId();
  const endpoint = userId
    ? `${BASE}/update-tag-status/${tagId}/${userId}`
    : `${BASE}/update-tag-status/${tagId}`;
  const res = await fetchWithAuth(endpoint, {
    method: 'POST',
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to update tag status');
  }
  return res;
};

export const updateTagsOrder = async (data: { _id: string; order: number }[]): Promise<any> => {
  const userId = await getCurrentUserId();
  const endpoint = userId ? `${BASE}/update-tags-order/${userId}` : `${BASE}/update-tags-order`;
  const res = await fetchWithAuth(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (
    res &&
    (res.success === false ||
      (typeof res.status === 'number' && res.status >= 400) ||
      (typeof res.statusCode === 'number' && res.statusCode >= 400) ||
      (typeof res.code === 'number' && res.code >= 400))
  ) {
    throw new Error(res.message || 'Failed to update tags order');
  }
  return res;
};

// ─── FAQ APIS ───────────────────────────────────────────────────────────────

export const getAllFaqs = async (params = ''): Promise<FaqItem[]> => {
  const res = await fetchWithAuth(`${BASE}/get-all-faqs?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch FAQs');
  }
  return res?.data || res?.results || (Array.isArray(res) ? res : []);
};

export const createFaq = async (payload: FaqFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-faq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to create FAQ');
  }
  return res;
};

export const updateFaq = async (faqId: string, payload: Partial<FaqFormData>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-faq/${faqId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update FAQ');
  }
  return res;
};

export const deleteFaq = async (faqId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-faq/${faqId}`, {
    method: 'DELETE',
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to delete FAQ');
  }
  return res;
};

export const reorderFaqs = async (faqs: { id: string; order: number }[]): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/reorder-faqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ faqs }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to reorder FAQs');
  }
  return res;
};

// ─── GUIDES CONFIG APIS ─────────────────────────────────────────────────────

export const getGuidesConfig = async (): Promise<GuidesListingConfig> => {
  const res = await fetchWithAuth(`${BASE}/get-guides-config`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch guides config');
  }
  return res?.data || res;
};

export const updateGuidesConfig = async (payload: GuidesConfigFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-guides-config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update guides config');
  }
  return res;
};

export const CreateGuidesConfig = async (payload: GuidesConfigFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-guides-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to create guides config');
  }
  return res;
};

// ─── BLOG IMAGE APIS ────────────────────────────────────────────────────────

export const getBlogImages = async (blogId: string): Promise<BlogImage[]> => {
  const res = await fetchWithAuth(`${BASE}/get-blog-images/${blogId}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch blog images');
  }
  return res?.data || (Array.isArray(res) ? res : []);
};

export const deleteBlogImage = async (imageId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-blog-image/${imageId}`, {
    method: 'DELETE',
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to delete blog image');
  }
  return res;
};
