import { fetchWithAuth } from '@/services/api';
import { API_ENDPOINTS } from '@/services/api';

const BASE = API_ENDPOINTS.dashboard.replace('/dashboard', '');

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  partialPublishedPosts: number;
  failedPosts: number;
  userGrowth: number;
  postGrowth: number;
  platformStats: Record<string, { total: number; published: number }>;
  subscriptionStats: Record<string, number>;
}

export interface RecentPost {
  id: string;
  title: string;
  author: string;
  platform: string | string[];
  status: 'published' | 'draft' | 'scheduled' | 'partial_published' | 'failed';
  date: string;
  image_url?: string;
  hashtags: string[];
  engagement: number;
}

export interface TopUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  companyName?: string;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  failedPosts: number;
}

export interface PlatformAnalytics {
  platform: string;
  totalPosts: number;
  postedPosts: number;
  scheduledPosts: number;
  uniqueUsers: number;
  successRate: number;
}

export interface SubscriptionAnalytics {
  planDistribution: { _id: string; count: number; revenue: number }[];
  statusBreakdown: Record<string, { count: number; revenue: number }>;
}

const hasError = (res: any) =>
  res && typeof res === 'object' && 'success' in res && !res.success;

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const data = await fetchWithAuth(`${BASE}/dashboard/stats`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data;
};

export const getRecentPosts = async (limit = 10): Promise<RecentPost[]> => {
  const data = await fetchWithAuth(`${BASE}/dashboard/posts?limit=${limit}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data ?? [];
};

export const getTopUsers = async (limit = 5): Promise<TopUser[]> => {
  const data = await fetchWithAuth(`${BASE}/dashboard/users?limit=${limit}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data ?? [];
};

export const getPlatformAnalytics = async (): Promise<PlatformAnalytics[]> => {
  const data = await fetchWithAuth(`${BASE}/dashboard/platforms`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data ?? [];
};

export const getSubscriptionAnalytics = async (): Promise<SubscriptionAnalytics> => {
  const data = await fetchWithAuth(`${BASE}/dashboard/subscriptions`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data;
};
