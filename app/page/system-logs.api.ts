import { fetchWithAuth, API_ENDPOINTS } from "@/utils/api";

export interface SystemLog {
  _id: string;
  operation: string;
  operation_by: string;
  key: string;
  ip_address: string;
  first_name: string;
  last_name: string;
  role_name: string;
  operation_data: any[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    length: number;
    size: number;
    page: number;
    lastPage: number;
  };
  totalCount?: number;
}

export const listSystemLogs = async (
  params = "",
): Promise<PaginatedResponse<SystemLog>> => {
  const url = `${API_ENDPOINTS.systemLog}/get-system-log?${params}`;
  const data = await fetchWithAuth(url);
  if (data && data.success === false) {
    throw new Error(data.message || "Failed to fetch system logs");
  }
  return data;
};

export const getSystemLog = async (logId: string): Promise<SystemLog> => {
  const url = `${API_ENDPOINTS.systemLog}/get-system-log-byId/${logId}`;
  const data = await fetchWithAuth(url);
  if (data && data.success === false) {
    throw new Error(data.message || "Failed to fetch system log details");
  }
  return data?.data || data;
};
