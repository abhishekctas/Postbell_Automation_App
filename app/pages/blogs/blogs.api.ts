import { fetchWithAuth, API_BASE_URL } from "@/services/api";

const BASE = `${API_BASE_URL}/blog-post`;

export interface Tag {
  _id: string;
  id: string;
  title: string;
}

export interface BlogPost {
  _id: string;
  id: string;
  title: string;
  excerpt?: string;
  body?: string;
  slug: string;
  cover_image?: string;
  category?: string;
  status: number; // 0 Draft, 1 Published
  createdAt: string;
}

export const listBlogs = async (params = ""): Promise<{ data: BlogPost[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/get-all-blogs?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch blogs");
  }
  return res;
};

export const getBlogDetails = async (id: string): Promise<BlogPost> => {
  const res = await fetchWithAuth(`${BASE}/get-blog/${id}`);
  if (res && res.status !== 200) {
    throw new Error(res.message || "Failed to fetch blog details");
  }
  return res?.data || res;
};

export const createBlog = async (payload: Partial<BlogPost>): Promise<any> => {
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

export const updateBlog = async (id: string, payload: Partial<BlogPost>): Promise<any> => {
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

export const getAllTags = async (): Promise<Tag[]> => {
  const res = await fetchWithAuth(`${BASE}/get-all-tags`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch tags");
  }
  return res?.data || res?.results || res || [];
};
