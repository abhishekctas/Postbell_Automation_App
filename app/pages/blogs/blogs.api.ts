import { fetchWithAuth, API_BASE_URL } from "@/services/api";

const BASE = `${API_BASE_URL}/blog-post`;

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

// ─── BLOG APIS ──────────────────────────────────────────────────────────────

export const listBlogs = async (params = ""): Promise<{ data: BlogPost[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/get-all-blogs?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch blogs");
  }
  return res;
};

export const getBlog = async (id: string): Promise<BlogPost> => {
  const res = await fetchWithAuth(`${BASE}/get-blog/${id}`);
  if (res && res.status !== 200 && res.success === false) {
    throw new Error(res.message || "Failed to fetch blog");
  }
  return res?.data || res;
};

export const getBlogDetails = getBlog;

export const createBlog = async (payload: Partial<BlogPost> | BlogFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-blog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create blog");
  }
  return res;
};

export const updateBlog = async (id: string, payload: Partial<BlogPost> | BlogFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-blog/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update blog");
  }
  return res;
};

export const deleteBlog = async (id: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-blog/${id}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete blog");
  }
  return res;
};

export const updateBlogStatus = async (id: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-blog-status/${id}`, {
    method: "POST",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update blog status");
  }
  return res;
};

// ─── TAG APIS ───────────────────────────────────────────────────────────────

export const getAllTags = async (params = ""): Promise<Tag[]> => {
  const res = await fetchWithAuth(`${BASE}/get-all-tags?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch tags");
  }
  return res?.data || res?.results || (Array.isArray(res) ? res : []);
};

export const createTag = async (payload: TagFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-tag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create tag");
  }
  return res;
};

export const updateTag = async (tagId: string, payload: Partial<TagFormData>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-tag/${tagId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update tag");
  }
  return res;
};

export const deleteTag = async (tagId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-tag/${tagId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete tag");
  }
  return res;
};

export const updateTagStatus = async (tagId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-tag-status/${tagId}`, {
    method: "POST",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update tag status");
  }
  return res;
};

export const updateTagsOrder = async (data: { _id: string; order: number }[]): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-tags-order`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update tags order");
  }
  return res;
};

// ─── FAQ APIS ───────────────────────────────────────────────────────────────

export const getAllFaqs = async (params = ""): Promise<FaqItem[]> => {
  const res = await fetchWithAuth(`${BASE}/get-all-faqs?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch FAQs");
  }
  return res?.data || res?.results || (Array.isArray(res) ? res : []);
};

export const createFaq = async (payload: FaqFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-faq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create FAQ");
  }
  return res;
};

export const updateFaq = async (faqId: string, payload: Partial<FaqFormData>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-faq/${faqId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update FAQ");
  }
  return res;
};

export const deleteFaq = async (faqId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-faq/${faqId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete FAQ");
  }
  return res;
};

export const reorderFaqs = async (faqs: { id: string; order: number }[]): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/reorder-faqs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faqs }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to reorder FAQs");
  }
  return res;
};

// ─── GUIDES CONFIG APIS ─────────────────────────────────────────────────────

export const getGuidesConfig = async (): Promise<GuidesListingConfig> => {
  const res = await fetchWithAuth(`${BASE}/get-guides-config`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch guides config");
  }
  return res?.data || res;
};

export const updateGuidesConfig = async (payload: GuidesConfigFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-guides-config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update guides config");
  }
  return res;
};

export const CreateGuidesConfig = async (payload: GuidesConfigFormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-guides-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create guides config");
  }
  return res;
};

// ─── BLOG IMAGE APIS ────────────────────────────────────────────────────────

export const getBlogImages = async (blogId: string): Promise<BlogImage[]> => {
  const res = await fetchWithAuth(`${BASE}/get-blog-images/${blogId}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch blog images");
  }
  return res?.data || (Array.isArray(res) ? res : []);
};

export const deleteBlogImage = async (imageId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-blog-image/${imageId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete blog image");
  }
  return res;
};
