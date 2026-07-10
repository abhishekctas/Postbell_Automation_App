import { fetchWithAuth, API_BASE_URL } from "@/utils/api";

const BASE = `${API_BASE_URL}/subscriptions`;

export interface Subscription {
  _id?: string;
  id?: string;
  customerName?: string;
  customerEmail?: string;
  customer_id?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  plan_id?: {
    name: string;
    price_per_month: number;
    billing_cycle: string;
  };
  plan_price?: number;
  status?: string; // e.g. "active", "cancelled", "expired"
  starts_at?: string;
  ends_at?: string;
  createdAt?: string;
}

export const listSubscriptions = async (
  params = "",
): Promise<{ data: Subscription[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/admin/get-all-subscription?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch subscriptions");
  }
  return res;
};

export const cancelSubscription = async (subId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/cancel/${subId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to cancel subscription");
  }
  return res;
};
