import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const BASE_URL = `${API_BASE_URL}/my-subscription`;

export interface PlanSnapshot {
  name: string;
  price: number;
  posts_per_month: number;
  posts_per_day: number;
  ai_content_generation_limit: number;
  features: string[];
}

export interface ActiveSubscription {
  _id: string;
  plan_id: any;
  plan_snapshot: PlanSnapshot;
  billing_cycle: 'monthly' | 'annual';
  status: number;
  start_date: string;
  end_date: string;
  next_billing_date: string;
  auto_renew: boolean;
  posts_used_this_month: number;
  posts_used_today: number;
  ai_content_used_today: number;
  payment: {
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

export interface SubscriptionHistoryItem {
  _id: string;
  plan_id: any;
  plan_snapshot: PlanSnapshot;
  billing_cycle: string;
  status: number;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
  payment: { provider: string; amount: number; status: string };
  usage: {
    posts_used_this_month: number;
    posts_used_today: number;
    ai_content_used_today: number;
  };
  is_active: boolean;
  days_remaining: number;
  usage_percentage: number;
  createdAt: string;
}

export const getMyActiveSubscription = async (): Promise<{
  data: ActiveSubscription | null;
  message?: string;
}> => {
  const res = await fetchWithAuth(`${BASE_URL}/active`);
  if (res && res.success === false) throw new Error(res.message);
  return res;
};

export const getMySubscriptionHistory = async (): Promise<{
  data: SubscriptionHistoryItem[];
}> => {
  const res = await fetchWithAuth(`${BASE_URL}/history`);
  if (res && res.success === false) throw new Error(res.message);
  return res;
};

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
