import { fetchWithAuth, API_BASE_URL } from "@/services/api";

const BASE = `${API_BASE_URL}/subscription-plans`;

export interface SubscriptionPlan {
  _id?: string;
  id?: string;
  name: string;
  billing_cycle: "monthly" | "annual";
  price_per_month: number;
  price_per_year?: number;
  annual_discount_percentage: number;
  posts_per_month: number;
  posts_per_day: number;
  ai_content_generation_limit: number;
  features: string[];
  description?: string;
  status: number; // 0 - INACTIVE, 1 - ACTIVE, 2 - DELETE
  is_popular_monthly: boolean;
  is_popular_annual: boolean;
  sort_order: number;
}

export const listSubscriptionPlans = async (params = ""): Promise<{ data: SubscriptionPlan[] }> => {
  const res = await fetchWithAuth(`${BASE}/admin/plans?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch plans");
  }
  return res;
};

export const createSubscriptionPlan = async (payload: Partial<SubscriptionPlan>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/admin/plans`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create plan");
  }
  return res;
};

export const updateSubscriptionPlan = async (
  planId: string,
  payload: Partial<SubscriptionPlan>,
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/admin/plan/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update plan");
  }
  return res;
};

export const deleteSubscriptionPlan = async (planId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/admin/plan/${planId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete plan");
  }
  return res;
};

export const updateStatusPlan = async (planId: string, status: number): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-status-plan/${planId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update status plan");
  }
  return res;
};
