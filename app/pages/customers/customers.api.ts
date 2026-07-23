import { fetchWithAuth, API_BASE_URL } from "@/services/api";

export const BASE = `${API_BASE_URL}/customers`; // Mapped to /customers

export interface Customer {
  _id?: string;
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_no?: string | number;
  dob?: string;
  gender?: number; // 1 - MALE, 2 - FEMALE, 3 - OTHER
  status?: number; // 0 inactive, 1 active, 2 deleted
  address?: any;
  image?: string;
  is_email_verified?: boolean;
  social_media_auth?: any;
  social_accounts?: any[];
  social_accounts_count?: number;
  postUsage?: any;
  createdAt?: string;
  updatedAt?: string;
  totalPages?: number;
}

export const getCustomerAvatarUrl = (image?: string): string => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image) || image.startsWith("file://")) return image;
  return `${API_BASE_URL}/customer-profile/${encodeURIComponent(image)}`;
};

export const listCustomers = async (
  params = ""
): Promise<{ results?: Customer[]; data?: Customer[]; totalCount?: number; length?: number }> => {
  const res = await fetchWithAuth(`${BASE}/get-customers?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch customers");
  }
  return res;
};

export const getCustomerDetails = async (customerId: string): Promise<Customer> => {
  const res = await fetchWithAuth(`${BASE}/get-customer/${customerId}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch customer details");
  }
  return res?.data || res;
};

export const getCustomer = getCustomerDetails;

export const createCustomer = async (payload: Partial<Customer>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create customer");
  }
  return res;
};

export const updateCustomer = async (
  customerId: string,
  payload: Partial<Customer>
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-customer/${customerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update customer");
  }
  return res;
};

export const deleteCustomer = async (customerId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-customer/${customerId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete customer");
  }
  return res;
};
