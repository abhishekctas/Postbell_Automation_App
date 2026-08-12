import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const BASE = `${API_BASE_URL}/subscriptions`;

export interface Subscription {
  _id?: string;
  id?: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  customerName?: string;
  customerEmail?: string;
  customer_id?: {
    _id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
  };
  plan_name?: string;
  plan_id?: {
    _id?: string;
    name?: string;
    price_per_month?: number;
    billing_cycle?: string;
  };
  billing_cycle?: string;
  plan_price?: number;
  status?: string | number; // e.g. "active", "cancelled", "expired", 1, 0, 2
  auto_renew?: boolean;
  start_date?: string;
  starts_at?: string;
  end_date?: string;
  ends_at?: string;
  cancelled_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const listSubscriptions = async (
  params = ''
): Promise<{ data: Subscription[]; pagination?: any } | Subscription[]> => {
  const res = await fetchWithAuth(`${BASE}/admin/get-all-subscription?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch subscriptions');
  }

  let items: Subscription[] = Array.isArray(res) ? res : res?.data || [];

  // Auto-enrich customer details if missing from backend API response
  const needsCustomerFetch = items.some(
    (item: any) =>
      !item.user_name &&
      !item.customerName &&
      !(
        item.customer_id &&
        typeof item.customer_id === 'object' &&
        (item.customer_id.first_name || item.customer_id.name)
      ) &&
      !(
        item.user_id &&
        typeof item.user_id === 'object' &&
        (item.user_id.first_name || item.user_id.name)
      )
  );

  if (needsCustomerFetch) {
    try {
      const custRes = await fetchWithAuth(`${API_BASE_URL}/customers/get-customers?limit=1000`);
      const customersList: any[] = Array.isArray(custRes)
        ? custRes
        : custRes?.data || custRes?.results || [];
      const customerMap = new Map<string, any>();
      customersList.forEach((c) => {
        const cId = String(c._id || c.id || '');
        if (cId) customerMap.set(cId, c);
      });

      items = items.map((item: any) => {
        const uId = String(
          (typeof item.user_id === 'object'
            ? item.user_id?._id || item.user_id?.id
            : item.user_id) ||
            (typeof item.customer_id === 'object'
              ? item.customer_id?._id || item.customer_id?.id
              : item.customer_id) ||
            ''
        );
        const matchedCust = customerMap.get(uId);
        if (matchedCust) {
          const fn = matchedCust.first_name || matchedCust.name || '';
          const ln = matchedCust.last_name || '';
          const fullName = `${fn} ${ln}`.trim() || matchedCust.email || 'Customer';
          return {
            ...item,
            user_name: item.user_name || item.customerName || fullName,
            user_email: item.user_email || item.customerEmail || matchedCust.email,
            user_avatar: item.user_avatar || matchedCust.image || matchedCust.avatar,
            customer_id: typeof item.customer_id === 'object' ? item.customer_id : matchedCust,
          };
        }
        return item;
      });
    } catch (e) {
      console.log('Could not auto-populate customer details:', e);
    }
  }

  if (Array.isArray(res)) {
    return items;
  }

  return {
    ...res,
    data: items,
  };
};

export const cancelSubscription = async (subId: string): Promise<any> => {
  let res;
  try {
    res = await fetchWithAuth(`${BASE}/cancel/${subId}`, {
      method: 'DELETE',
    });
  } catch (e) {
    try {
      res = await fetchWithAuth(`${BASE}/admin/cancel/${subId}`, {
        method: 'DELETE',
      });
    } catch (e2) {
      res = await fetchWithAuth(`${BASE}/cancel/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }
  }

  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to cancel subscription');
  }
  return res;
};
