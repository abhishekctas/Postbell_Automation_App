import { fetchWithAuth, API_BASE_URL } from "@/services/api";

const BASE_ROLE = `${API_BASE_URL}/role`;
const BASE_SECTIONS = `${API_BASE_URL}/sections`;

export interface SectionPermission {
  add?: boolean;
  create?: boolean;
  delete?: boolean;
  update?: boolean;
  view?: boolean;
  download?: boolean;
  [key: string]: boolean | undefined;
}

export interface SectionItem {
  id: string;
  name: string;
  title: string;
  status?: number;
  permissions?: SectionPermission;
  isAccessable?: boolean;
}

export interface SectionMatrixItem {
  sectionId: string;
  permissions: string[]; // ['view', 'create', 'update', 'delete', 'download']
}

export interface Role {
  _id?: string;
  id?: string;
  name?: string;
  role_name?: string;
  description?: string;
  status?: number; // 1 active, 0 inactive
  section_list?: SectionItem[];
  sectionMatrix?: SectionMatrixItem[];
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_SYSTEM_SECTIONS: SectionItem[] = [
  { id: "sec_dashboard", name: "dashboard", title: "Dashboard", status: 1 },
  { id: "sec_posts", name: "generated-posts", title: "Generated Posts", status: 1 },
  { id: "sec_social_posts", name: "social-posts", title: "Social Posts", status: 1 },
  { id: "sec_users", name: "users-management", title: "Users Management", status: 1 },
  { id: "sec_roles", name: "roles-management", title: "Roles Management", status: 1 },
  { id: "sec_customers", name: "customers-management", title: "Customer Management", status: 1 },
  { id: "sec_festivals", name: "festival-auto-post", title: "Festival Auto Post", status: 1 },
  { id: "sec_settings", name: "general-settings", title: "General Settings", status: 1 },
  { id: "sec_subscriptions", name: "subscription-plans", title: "Subscription Plans", status: 1 },
  { id: "sec_features", name: "features-cms", title: "Features CMS", status: 1 },
  { id: "sec_logs", name: "system-logs", title: "System Logs", status: 1 },
];

export const getRoles = async (): Promise<Role[]> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/get-roles-list`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch roles");
  }
  const items = res?.results || res?.data || (Array.isArray(res) ? res : []);
  return items.map((r: any) => ({
    ...r,
    id: r.id || r._id,
    name: r.name || r.role_name || "",
  }));
};

export const getRole = async (roleId: string): Promise<Role> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/get-role-by-id/${roleId}`);
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to fetch role details");
  }
  const data = res?.data || res;
  if (!data) throw new Error("No role data found");

  const sectionMatrix: SectionMatrixItem[] = data.section_list
    ? data.section_list
        .filter((sec: any) => sec.isAccessable)
        .map((sec: any) => ({
          sectionId: sec.id,
          permissions: Object.entries(sec.permissions || {})
            .filter(([_, hasAccess]) => Boolean(hasAccess))
            .map(([perm]) => (perm === "add" ? "create" : perm)),
        }))
    : data.sectionMatrix || [];

  return {
    ...data,
    id: data.id || data._id || roleId,
    name: data.name || data.role_name || "",
    role_name: data.role_name || data.name || "",
    sectionMatrix,
  };
};

export const listAllSectionsForRole = async (): Promise<SectionItem[]> => {
  try {
    const res = await fetchWithAuth(`${BASE_SECTIONS}/get-all-section-names?limit=1000&page=1`);
    if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (e) {
    console.log("Using default system sections list:", e);
  }
  return DEFAULT_SYSTEM_SECTIONS;
};

export const createRole = async (payload: Partial<Role> | any): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/create-role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || "Failed to create role");
  }
  return res;
};

export const updateRole = async (roleId: string, payload: Partial<Role> | any): Promise<any> => {
  const res = await fetchWithAuth(`${BASE_ROLE}/update-role-by-id/${roleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
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