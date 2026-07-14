import { fetchWithAuth, API_BASE_URL } from "@/services/api";
const BASE_ROLE = `${API_BASE_URL}/role`;

export interface Role {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
}

export const getRoles = async (): Promise<Role[]> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/get-roles-list`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch roles");
  }
  return res?.results || res?.data || res || [];
};

export const createRole = async (payload: Partial<Role>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/create-role`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create role");
  }
  return res;
};

export const updateRole = async (roleId: string, payload: Partial<Role>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/update-role/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update role");
  }
  return res;
};

export const deleteRole = async (roleId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/delete-role/${roleId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete role");
  }
  return res;
};