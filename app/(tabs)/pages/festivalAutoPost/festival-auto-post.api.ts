import { fetchWithAuth, API_BASE_URL } from "@/services/api";

const BASE = `${API_BASE_URL}/festivals`;

export interface FestivalPost {
  _id?: string;
  festivalId?: string;
  id?: string;
  name: string;
  date: string;
  category?: string;
  status: "active" | "inactive";
  selectedFestival?: boolean;
  autoGenerate?: boolean;
  image?: string;
  image_url?: string;
  caption?: string;
  hashtags?: string[];
  year?: number;
}

export const normalizeFestivalPosts = (response: any): FestivalPost[] => {
  if (!response) return [];
  const payload = response?.data;
  const directPosts = Array.isArray(response?.data) ? response.data : [];
  const nestedPosts = Array.isArray(payload?.posts) ? payload.posts : [];
  const rootPosts = Array.isArray(response) ? response : [];
  const posts = directPosts.length > 0 ? directPosts : (nestedPosts.length > 0 ? nestedPosts : rootPosts);

  return posts.map((post: any) => ({
    ...post,
    _id: post._id || post.id || post.festivalId || post.festival_id,
    id: post.id || post._id || post.festivalId || post.festival_id,
    name: post.name || post.festivalName || "",
    date: post.date || post.festivalDate || "",
    category: post.category || post.festivalCategory || "",
    status: post.status || post.festivalStatus || "active",
    selectedFestival: Boolean(post.selectedFestival ?? post.selected ?? post.isAutoPost),
    autoGenerate: Boolean(post.autoGenerate ?? post.auto_generate ?? false),
    image: post.image || post.image_url || post.imageUrl || "",
    image_url: post.image_url || post.imageUrl || post.image || "",
    caption: post.caption || post.content || "",
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
  }));
};

export const listFestivalPosts = async (
  params = "",

): Promise<{ data: FestivalPost[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/get-festival-posts?${params}`);

  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch festival posts");
  }
  const normalized = normalizeFestivalPosts(res);
  return { data: normalized, pagination: res?.pagination };
};

export const updateFestivalPostSelection = async (
  festivalId: string,
  selectedFestival: boolean,
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/festival-post-selection/${festivalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedFestival }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update festival selection");
  }
  return res;
};

export const updateFestivalPost = async (
  festivalId: string,
  payload: Partial<FestivalPost>,
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-festival-post/${festivalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update festival post");
  }
  return res;
};

export const createFestivalPost = async (payload: Partial<FestivalPost>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-festival-post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create festival post");
  }
  return res;
};

export const sendFestivalNotifications = async (festivalName: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/send-festival-notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ festivalName }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to send notifications");
  }
  return res;
};
