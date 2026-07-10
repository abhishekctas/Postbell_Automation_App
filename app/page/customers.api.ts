import { fetchWithAuth, API_BASE_URL } from "@/utils/api";

const BASE = `${API_BASE_URL}/customers`; // Mapped to /customers

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
  createdAt?: string;
}

export const listCustomers = async (
  params = "",
): Promise<{ results?: Customer[]; data?: Customer[]; totalCount?: number; length?: number }> => {
  const res = await fetchWithAuth(`${BASE}/get-customers?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch customers");
  }
  return res;
};

export const createCustomer = async (payload: Partial<Customer>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-customer`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create customer");
  }
  return res;
};

export const updateCustomer = async (
  customerId: string,
  payload: Partial<Customer>,
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-customer/${customerId}`, {
    method: "PATCH",
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
