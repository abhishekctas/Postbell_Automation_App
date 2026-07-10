import { fetchWithAuth } from '@/utils/api';
import { API_ENDPOINTS } from '@/utils/api';

const BASE = API_ENDPOINTS.posts.replace('/generated-posts', '');

export interface Post {
  _id?: string;
  id?: string;
  title?: string;
  caption?: string;
  hashtags?: string[];
  image_url?: string;
  selectedNetworks?: string[];
  post_status?: string;
  scheduled_at?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  festivalName?: string;
  origin?: string;
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

export const listPosts = async (
  page = 1,
  size = 15,
  status?: string,
): Promise<PaginatedPosts> => {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    ...(status ? { post_status: status } : {}),
  });
  const data = await fetchWithAuth(
    `${BASE}/generated-posts/get-generated-posts?${params.toString()}`,
  );
  return data;
};

export const createPost = async (payload: Partial<Post>): Promise<any> => {
  const data = await fetchWithAuth(
    `${BASE}/generated-posts/create-generated-post`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (data && data.success === false) {
    throw new Error(data.message || 'Failed to create post');
  }
  return data;
};

export const updatePost = async (postId: string, payload: Partial<Post>): Promise<any> => {
  const data = await fetchWithAuth(
    `${BASE}/generated-posts/update-generated-post/${postId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (data && data.success === false) {
    throw new Error(data.message || 'Failed to update post');
  }
  return data;
};

export const deletePost = async (postId: string): Promise<void> => {
  await fetchWithAuth(`${BASE}/generated-posts/delete-generated-post/${postId}`, {
    method: 'DELETE',
  });
};

export const publishPostNow = async (postId: string): Promise<any> => {
  const data = await fetchWithAuth(
    `${BASE}/generated-posts/publish-generated-post/${postId}`,
    { method: 'POST' },
  );
  return data;
};
