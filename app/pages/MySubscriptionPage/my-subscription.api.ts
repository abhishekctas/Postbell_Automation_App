import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const BASE_URL = `${API_BASE_URL}/my-subscription`;

export interface PlanSnapshot {
  name: string;
  price?: number;
  posts_per_month: number;
  posts_per_day: number;
  ai_content_generation_limit: number;
  features: string[];
}

export interface ActiveSubscription {
  _id: string;
  plan_id: any;
  plan_snapshot: PlanSnapshot;
  billing_cycle: 'monthly' | 'annual' | 'yearly' | string;
  status: number;
  start_date: string;
  end_date: string;
  next_billing_date: string;
  auto_renew: boolean;
  posts_used_this_month: number;
  posts_used_today: number;
  ai_content_used_today: number;
  payment: {
    payment_id?: string;
    order_id?: string;
    provider: string;
    amount: number;
    status: string;
  };
  days_remaining: number;
  usage_percentage: number;
  ai_usage_percentage: number;
  remaining_posts_this_month: number;
  remaining_posts_today: number;
  remaining_ai_today: number;
  createdAt: string;
}

export interface UsageStats {
  subscription_id: string;
  plan_name: string;
  billing_cycle: string;
  status: number | string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  posts: {
    used_this_month: number;
    limit_per_month: number;
    remaining_this_month: number;
    used_today: number;
    limit_per_day: number;
    remaining_today: number;
    usage_percentage: number;
  };
  ai_content: {
    used_today: number;
    limit_per_day: number;
    remaining_today: number;
    usage_percentage: number;
  };
  last_daily_reset: string;
  last_monthly_reset: string;
}

export interface SubscriptionHistoryItem {
  _id: string;
  plan_id: any;
  plan_snapshot: PlanSnapshot;
  billing_cycle: string;
  status: number;
  start_date: string;
  end_date: string;
  next_billing_date?: string;
  auto_renew: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
  payment: { provider: string; amount: number; status: string };
  usage?: {
    posts_used_this_month: number;
    posts_used_today: number;
    ai_content_used_today: number;
  };
  is_active: boolean;
  days_remaining?: number;
  usage_percentage?: number;
  createdAt: string;
}

/** GET /v1/my-subscription/active */
export const getMyActiveSubscription = async (): Promise<{
  data: ActiveSubscription | null;
  message?: string;
}> => {
  const res = await fetchWithAuth(`${BASE_URL}/active`);
  if (res && res.success === false) throw new Error(res.message);
  return res;
};

/** GET /v1/my-subscription/usage */
export const getMyUsageStats = async (): Promise<{
  data: UsageStats | null;
}> => {
  const res = await fetchWithAuth(`${BASE_URL}/usage`);
  if (res && res.success === false) throw new Error(res.message);
  return res;
};

/** GET /v1/my-subscription/history */
export const getMySubscriptionHistory = async (): Promise<{
  data: SubscriptionHistoryItem[];
}> => {
  const res = await fetchWithAuth(`${BASE_URL}/history`);
  if (res && res.success === false) throw new Error(res.message);
  return res;
};

/** GET /v1/my-subscription/all */
export const getMyAllSubscriptions = async (): Promise<{
  data: SubscriptionHistoryItem[];
}> => {
  const res = await fetchWithAuth(`${BASE_URL}/all`);
  if (res && res.success === false) throw new Error(res.message);
  return res;
};

/** PATCH /v1/my-subscription/auto-renew */
export const updateAutoRenew = async (
  autoRenew: boolean
): Promise<{ data: any; message: string }> => {
  const res = await fetchWithAuth(`${BASE_URL}/auto-renew`, {
    method: 'PATCH',
    body: JSON.stringify({ auto_renew: autoRenew }),
  });
  if (res && res.success === false) throw new Error(res.message);
  return res;
};

/** PATCH /v1/my-subscription/cancel */
export const cancelMySubscription = async (
  cancellationReason?: string
): Promise<{ data: any; message: string }> => {
  const res = await fetchWithAuth(`${BASE_URL}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ cancellation_reason: cancellationReason || '' }),
  });
  if (res && res.success === false) throw new Error(res.message);
  return res;
};
