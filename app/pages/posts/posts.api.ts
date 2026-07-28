import { fetchWithAuth, API_BASE_URL } from "@/services/api";

const BASE = `${API_BASE_URL}/generated-posts`;
const SOCIAL_BASE = `${API_BASE_URL}/social-post`;
const AI_BASE = `${API_BASE_URL}/ai`;

export interface PostContent {
  caption?: string;
  link?: string;
  comment?: string;
  media?: {
    type: "image" | "video";
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
  content_type?: "image" | "video" | "text";
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
  companyEmail?: string;
  caption?: string;
  hashtags?: string[];
  image_url?: string;
  generalContent?: PostContent;
  platformSpecificContent?: Record<string, PlatformSpecificContent[]> | PlatformSpecificContent[];
  selectedNetworks?: string[];
  selectedAccounts?: string[];
  post_status?: string;
  scheduled_at?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  festivalName?: string;
  origin?: string;
  isFestivalGenerated?: boolean;
}

export interface SocialAccount {
  account_id: string;
  account_name: string;
  username: string;
  platform: string;
  page_id?: string;
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

// === List Posts ===
export const listPosts = async (params = ""): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/get-generated-posts?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch posts");
  }
  return res;
};

// === Get Single Post ===
export const getPost = async (postId: string): Promise<Post> => {
  const res = await fetchWithAuth(`${BASE}/get-generated-post/${postId}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch post details");
  }
  return res?.data || res;
};

// === Get Post Details (Social stats & platforms) ===
export const getPostDetails = async (postId: string): Promise<PostDetails> => {
  const res = await fetchWithAuth(`${SOCIAL_BASE}/get-post-details/${postId}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch post details");
  }
  return res?.data || res;
};

// === Create Post ===
export const createPost = async (payload: Partial<Post>): Promise<any> => {
  const data = await fetchWithAuth(`${BASE}/create-generated-post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (data && data.success === false) {
    throw new Error(data.message || "Failed to create post");
  }
  return data;
};

// === Update Post ===
export const updatePost = async (postId: string, payload: Partial<Post>): Promise<any> => {
  const data = await fetchWithAuth(`${BASE}/update-generated-post/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (data && data.success === false) {
    throw new Error(data.message || "Failed to update post");
  }
  return data;
};

// === Delete Post ===
export const deletePost = async (postId: string): Promise<void> => {
  const res = await fetchWithAuth(`${BASE}/delete-generated-post/${postId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete post");
  }
};

// === Publish Post Now ===
export const publishPostNow = async (postId: string): Promise<any> => {
  const data = await fetchWithAuth(`${BASE}/publish-generated-post/${postId}`, {
    method: "POST",
  });
  if (data && data.success === false) {
    throw new Error(data.message || "Failed to publish post");
  }
  return data;
};

// === Get Active Social Accounts ===
export const getAllSocialAccountsForPost = async (): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/get-active-social-accounts-post`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch social accounts");
  }
  return res?.data || res;
};

// === Upload Post Image ===
export const uploadPostImage = async (formData: FormData): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/upload-post-image`, {
    method: "POST",
    body: formData,
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to upload image");
  }
  return res;
};

// === Generate AI Post ===
export const generateSocialMediaPost = async (
  payload: {
    prompt: string;
    provider?: string;
    platform?: string;
    tone?: string;
  }
): Promise<any> => {
  const path = payload.provider === "gemini" ? "generate-post/gemini" : payload.provider === "openai" ? "generate-post/openai" : "generate-post";
  const res = await fetchWithAuth(`${AI_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "AI Post generation failed");
  }
  return res?.data || res;
};
