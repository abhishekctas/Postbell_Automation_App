import { fetchWithAuth, API_ENDPOINTS, API_BASE_URL } from "@/services/api";

const BASE_USERS = API_ENDPOINTS.profile; // Mapped to /users
const BASE_ROLE = `${API_BASE_URL}/role`;

export interface User {
  _id?: string;
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_no?: string | number;
  address?: string;
  status?: number; // 0 inactive, 1 active
  role_name?: string;
  role_id?: string;
}

export interface Role {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
}

export const listUsers = async (params = ""): Promise<{ results: User[]; totalCount: number }> => {
  const res = await fetchWithAuth(`${BASE_USERS}/get-users?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch users");
  }
  return res;
};

export const createUser = async (payload: Partial<User>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_USERS}/create-user`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create user");
  }
  return res;
};

export const updateUser = async (userId: string, payload: Partial<User>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_USERS}/update-user/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update user");
  }
  return res;
};

export const deleteUser = async (userId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_USERS}/delete-user/${userId}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete user");
  }
  return res;
};

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
