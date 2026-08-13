import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const BASE = `${API_BASE_URL}/users`;

export interface User {
  _id?: string;
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_no?: string | number;
  address?: string;
  status?: number; // 0 deactive, 1 active
  role_name?: string;
  role_id?: string;
}

export const listUsers = async (params = ''): Promise<{ results: User[]; totalCount: number }> => {
  const res = await fetchWithAuth(`${BASE}/get-users?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch users');
  }
  return res;
};

export const createUser = async (payload: Partial<User>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/create-user`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to create user');
  }
  return res;
};

export const updateUser = async (userId: string, payload: Partial<User>): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-user/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update user');
  }
  return res;
};

export const deleteUser = async (userId: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete-user/${userId}`, {
    method: 'DELETE',
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to delete user');
  }
  return res;
};
