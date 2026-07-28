import { fetchWithAuth, API_BASE_URL } from "@/services/api";

export const BASE = `${API_BASE_URL}/features-cms`;

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

export interface FeatureFormData {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  video?: string;
  imageFile?: any; // File object or picker result
  videoFile?: any; // File object or picker result
  feature_points: FeaturePoint[];
  order: number;
  status: number;
  removeImage?: boolean;
  removeVideo?: boolean;
}

export const generateFeatureSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Helper to construct FormData or JSON body for features endpoint
 */
function prepareFeaturePayload(payload: FeatureFormData | any): FormData | string {
  // If payload contains file objects (or explicit remove flags with non-JSON format), use FormData
  const hasFiles =
    payload.imageFile ||
    payload.videoFile ||
    (payload.image && typeof payload.image !== "string") ||
    (payload.video && typeof payload.video !== "string");

  if (hasFiles || payload instanceof FormData) {
    if (payload instanceof FormData) return payload;
    const fd = new FormData();
    fd.append("title", payload.title || "");
    fd.append("slug", payload.slug || "");
    if (payload.description !== undefined) {
      fd.append("description", payload.description || "");
    }
    fd.append("order", String(payload.order ?? 0));
    fd.append("status", String(payload.status ?? 1));
    fd.append("removeImage", String(payload.removeImage ?? false));
    fd.append("removeVideo", String(payload.removeVideo ?? false));
    if (payload.feature_points?.length > 0) {
      fd.append("feature_points", JSON.stringify(payload.feature_points));
    }
    if (payload.imageFile) {
      fd.append("image", payload.imageFile);
    } else if (payload.image && typeof payload.image === "object") {
      fd.append("image", payload.image);
    }
    if (payload.videoFile) {
      fd.append("video", payload.videoFile);
    } else if (payload.video && typeof payload.video === "object") {
      fd.append("video", payload.video);
    }
    return fd;
  }

  // Standard JSON payload
  return JSON.stringify({
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    image: payload.image,
    video: payload.video,
    order: Number(payload.order ?? 0),
    status: Number(payload.status ?? 1),
    removeImage: Boolean(payload.removeImage),
    removeVideo: Boolean(payload.removeVideo),
    feature_points: payload.feature_points || [],
  });
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
  const item = res?.data || res;
  if (item && !item.id && item._id) {
    item.id = item._id;
  }
  return item;
};

export const getFeature = getFeatureDetails;

export const createFeature = async (payload: FeatureFormData | any): Promise<any> => {
  const body = prepareFeaturePayload(payload);
  const isForm = body instanceof FormData;
  const res = await fetchWithAuth(`${BASE}/create`, {
    method: "POST",
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: body as any,
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create feature");
  }
  return res;
};

export const updateFeature = async (id: string, payload: FeatureFormData | any): Promise<any> => {
  const body = prepareFeaturePayload(payload);
  const isForm = body instanceof FormData;
  const res = await fetchWithAuth(`${BASE}/update/${id}`, {
    method: "PATCH",
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: body as any,
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

export const updateFeatureStatus = async (id: string, status: boolean | number): Promise<any> => {
  const statusVal = status === true || status === 1 ? 1 : 0;
  const res = await fetchWithAuth(`${BASE}/update-status/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: statusVal }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to update status");
  }
  return res;
};

export const reorderFeatures = async (orderedIds: string[]): Promise<any> => {
  const res = await fetchWithAuth(`${BASE}/reorder-statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to reorder features");
  }
  return res;
};
