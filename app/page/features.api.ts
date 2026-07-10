import { fetchWithAuth, API_BASE_URL } from "@/utils/api";

const BASE = `${API_BASE_URL}/features-cms`;

export interface FeaturePoint {
  _id?: string;
  point_title: string;
  point_description?: string;
  icon?: string;
}

export interface Feature {
  _id: string;
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  video?: string;
  feature_points: FeaturePoint[];
  order: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export const listFeatures = async (params = ""): Promise<{ data: Feature[]; pagination?: any }> => {
  const res = await fetchWithAuth(`${BASE}/list?${params}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch features");
  }
  return res;
};

export const getFeatureDetails = async (id: string): Promise<Feature> => {
  const res = await fetchWithAuth(`${BASE}/details/${id}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch feature details");
  }
  return res?.data || res;
};

export const createFeature = async (payload: any): Promise<any> => {
  // We can build a FormData or JSON payload. The API handles JSON if we don't upload files in this view.
  const res = await fetchWithAuth(`${BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create feature");
  }
  return res;
};

export const updateFeature = async (id: string, payload: any): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update feature");
  }
  return res;
};

export const deleteFeature = async (id: string): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/delete/${id}`, {
    method: "DELETE",
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to delete feature");
  }
  return res;
};

export const updateFeatureStatus = async (id: string, status: boolean): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/update-status/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update status");
  }
  return res;
};
