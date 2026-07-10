import { fetchWithAuth, API_BASE_URL } from "@/utils/api";

const BASE = `${API_BASE_URL}/contact-us`;

export interface ContactRequest {
  _id?: string;
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  status?: string; // e.g. "pending", "in_progress", "resolved"
  priority?: string; // "low", "medium", "high"
  contact_no?: string;
  contactStatus?: number; // 0 = Pending/Unresolved, 1 = Resolved
  createdAt?: string;
}

export const listContactRequests = async (
  params = "",
): Promise<{ data: ContactRequest[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/get-contact-us-list?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch contact inquiries");
  }
  return res;
};

export const updateContactStatus = async (
  contactId: string,
  contactStatus: number,
): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-contact-status/${contactId}`, {
    method: "PUT",
    body: JSON.stringify({ contactStatus }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update inquiry status");
  }
  return res;
};

export const deleteContactRequest = async (contactId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-contact-us/${contactId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete inquiry");
  }
  return res;
};
