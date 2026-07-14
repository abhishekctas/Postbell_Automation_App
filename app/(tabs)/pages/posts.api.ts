import { fetchWithAuth, API_BASE_URL } from "@/services/api";

const BASE = `${API_BASE_URL}/generated-posts`;

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

export const listPosts = async (params = ""): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/get-generated-posts?${params}`);
  console.log(res, "----------resssssssssssss---post--------------post-----------")
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch posts");  
  }
  return res;
};

export const createPost = async (payload: Partial<Post>): Promise<any> => {
  const data = await fetchWithAuth(
    `${BASE}/create-generated-post`,
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
    `${BASE}/update-generated-post/${postId}`,
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
  await fetchWithAuth(`${BASE}/delete-generated-post/${postId}`, {
    method: 'DELETE',
  });
};

export const publishPostNow = async (postId: string): Promise<any> => {
  const data = await fetchWithAuth(
    `${BASE}/publish-generated-post/${postId}`,
    { method: 'POST' },
  );
  return data;
};
