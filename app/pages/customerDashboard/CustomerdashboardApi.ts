import { fetchWithAuth, API_BASE_URL } from '@/services/api';

// Base path: /v1/customer-dashboard
const BASE = `${API_BASE_URL}/customer-dashboard`;

// ─── Interfaces ────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  connectedPlatforms: number;
}

export interface SocialMediaConnection {
  platforms?: string;
  platform?: string;
  status?: string;
  accountName?: string;
  last_connected?: string;
  lastConnected?: string;
}

export interface PlatformAccount {
  accountId?: string;
  accountName?: string;
  connectionStatus?: string;
  lastConnected?: string;
}

export interface SocialMediaPlatform {
  platform: string;
  connectedAccounts: number;
  totalAccounts: number;
  accounts?: PlatformAccount[];
}

export interface CustomerDashboardSummary {
  posts: {
    total: number;
    published: number;
    scheduled: number;
    draft: number;
    failed: number;
    partial: number;
  };
  socialMedia: {
    platforms?: SocialMediaPlatform[];
    totalConnections: number;
    connections?: SocialMediaConnection[];
  };
  analytics?: {
    platformWise?: Record<
      string,
      {
        total: number;
        published: number;
      }
    >;
  };
}

export interface EngagementData {
  month: string;
  year: number;
  totalPosts: number;
  postedPosts: number;
  scheduledPosts: number;
  engagement: number;
}

export interface PlatformAnalytics {
  platform: string;
  totalPosts: number;
  postedPosts: number;
  scheduledPosts: number;
  successRate: number;
}

export interface CustomerAnalytics {
  platformWise?: Record<
    string,
    {
      total: number;
      published: number;
    }
  >;
  trends?: {
    year: number;
    month: number;
    totalPosts: number;
    publishedPosts: number;
  }[];
}

export interface RecentPost {
  id: string;
  title: string;
  platform: string;
  status: 'published' | 'draft' | 'scheduled';
  date: string;
  image_url?: string;
  hashtags: string[];
  engagement: number;
}

export interface RecentActivity {
  id: string;
  title: string;
  platform: string;
  status: string;
  date: string;
  image_url?: string;
  hashtags?: string[];
}

export interface CommonResponse<T> {
  data: T;
  success: boolean;
  message: string;
}

const hasError = <T = any>(res: unknown): res is CommonResponse<T> => {
  return (
    typeof res === 'object' &&
    res !== null &&
    'success' in res &&
    typeof (res as any).success === 'boolean' &&
    'message' in res &&
    !(res as any).success
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────

export const getMediaUrl = (imageUrl?: string): string => {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('file://')) return imageUrl;
  const staticBase = API_BASE_URL.replace(/\/v1\/?$/, '');
  return `${staticBase}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

// ─── API Calls ────────────────────────────────────────────────────────

/**
 * GET /api/v1/customer-dashboard/get-customer-summary/:userId
 */
export const getCustomerDashboardSummary = async (
  userId: string
): Promise<CustomerDashboardSummary> => {
  try {
    const data = await fetchWithAuth(`${BASE}/get-customer-summary/${userId}`, {
      method: 'GET',
    });

    if (hasError(data)) {
      throw new Error(data.message);
    }

    return (data as CommonResponse<CustomerDashboardSummary>).data ?? data;
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to fetch customer dashboard summary');
  }
};

/**
 * GET /api/v1/customer-dashboard/get-customer-analytics/:userId
 */
export const getCustomerAnalytics = async (userId: string): Promise<CustomerAnalytics> => {
  try {
    const data = await fetchWithAuth(`${BASE}/get-customer-analytics/${userId}`, {
      method: 'GET',
    });

    if (hasError(data)) {
      throw new Error(data.message);
    }

    return (data as CommonResponse<CustomerAnalytics>).data ?? data;
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to fetch customer analytics');
  }
};

/**
 * GET /api/v1/customer-dashboard/get-customer-recent-activity/:userId
 */
export const getCustomerRecentActivity = async (userId: string): Promise<RecentActivity[]> => {
  try {
    const data = await fetchWithAuth(`${BASE}/get-customer-recent-activity/${userId}`, {
      method: 'GET',
    });

    if (hasError(data)) {
      throw new Error(data.message);
    }

    const res = (data as CommonResponse<RecentActivity[]>).data ?? data ?? [];
    return Array.isArray(res) ? res : [];
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to fetch recent activity');
  }
};
