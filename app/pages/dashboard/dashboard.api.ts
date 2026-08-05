import { fetchWithAuth, API_ENDPOINTS } from '@/services/api';

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
  partialPosts?: number;
  failedPosts: number;
  engagement?: number;
  socialMedia?: {
    facebook?: any[];
    instagram?: any[];
    whatsapp?: any[];
    [key: string]: any;
  };
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
  planDistribution: {
    _id?: string;
    name?: string;
    planName?: string;
    count?: number;
    revenue?: number;
    monthly?: number;
    annual?: number;
    monthlyRevenue?: number;
    annualRevenue?: number;
  }[];
  statusBreakdown:
    | Record<string, { count?: number; revenue?: number }>
    | { status?: string; _id?: string; count?: number; revenue?: number }[];
  summary?: {
    totalSubscribers?: number;
    activeSubscriptionCount?: number;
  };
  billingCycle?: {
    monthly?: { count?: number; revenue?: number };
    annual?: { count?: number; revenue?: number };
  };
}

export interface AIUsageStats {
  totalUsage: number;
  monthlyUsage: number;
  dailyUsage: number;
  usageByType: Record<
    string,
    {
      count: number;
      totalTokens: number;
      avgGenerationTime?: number;
    }
  >;
}

export interface WebsiteVisitorDay {
  _id: string;
  count: number;
}

const hasError = (res: any) => res && typeof res === 'object' && 'success' in res && !res.success;

export const getDashboardStats = async (params = ''): Promise<DashboardStats> => {
  const query = params ? `?${params}` : '';
  const data = await fetchWithAuth(`${BASE}/dashboard/stats${query}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data;
};

export const getRecentPosts = async (limit = 10, params = ''): Promise<RecentPost[]> => {
  const query = params ? `&${params}` : '';
  const data = await fetchWithAuth(`${BASE}/dashboard/posts?limit=${limit}${query}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data ?? [];
};

export const getTopUsers = async (limit = 5, params = ''): Promise<TopUser[]> => {
  const query = params ? `&${params}` : '';
  const data = await fetchWithAuth(`${BASE}/dashboard/users?limit=${limit}${query}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data ?? [];
};

export const getPlatformAnalytics = async (params = ''): Promise<PlatformAnalytics[]> => {
  const query = params ? `?${params}` : '';
  const data = await fetchWithAuth(`${BASE}/dashboard/platforms${query}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data ?? [];
};

export const getSubscriptionAnalytics = async (params = ''): Promise<SubscriptionAnalytics> => {
  const query = params ? `?${params}` : '';
  const data = await fetchWithAuth(`${BASE}/dashboard/subscriptions${query}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data;
};

export const getAIUsageStats = async (params = ''): Promise<AIUsageStats> => {
  const query = params ? `?${params}` : '';
  const data = await fetchWithAuth(`${BASE}/dashboard/ai-usage${query}`);
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data;
};

export const getWebsiteVisitorsCount = async (params = ''): Promise<WebsiteVisitorDay[]> => {
  const query = params ? `?${params}` : '';
  const data = await fetchWithAuth(
    `${BASE}/website-visitor/get-total-website-visitor-count${query}`
  );
  if (hasError(data)) throw new Error(data.message);
  return data?.data ?? data ?? [];
};
