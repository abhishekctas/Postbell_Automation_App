import { fetchWithAuth, API_ENDPOINTS, API_BASE_URL } from '@/services/api';

const BASE = API_ENDPOINTS.settings;

export interface GeneralSettings {
  _id?: string;
  id?: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address?: string;
  website?: string;
  logo_url?: string;
  social_links?: {
    facebook_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    linkedin_url?: string;
  };
  default_hashtags?: string[];
  about_text?: string;
  copyright?: string;
  working_time?: string;
  contact_address?: string;
  contact_no?: string;
  email_address?: string;
  location_address?: string;
  whatsapp_no?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
  company_name_footer?: string;
}

export const getCompanyLogoUrl = (filename?: string | null): string => {
  if (!filename) return '';
  if (
    /^https?:\/\//i.test(filename) ||
    filename.startsWith('data:') ||
    filename.startsWith('file://')
  ) {
    return filename;
  }
  const staticBase = API_BASE_URL.replace(/\/v1\/?$/, '');
  if (filename.startsWith('/')) {
    return `${staticBase}${filename}`;
  }
  return `${staticBase}/company-logos/${filename}`;
};

export const getGeneralSettings = async (): Promise<GeneralSettings> => {
  const res = await fetchWithAuth(`${BASE}/get-general-settings`);
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch settings');
  }
  return res?.data || res;
};

export const createOrUpdateGeneralSettings = async (
  payload: Partial<GeneralSettings>
): Promise<GeneralSettings> => {
  const res = await fetchWithAuth(`${BASE}/add-update-general-settings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to save settings');
  }
  return res?.data || res;
};

export const uploadLogo = async (fileObj: any): Promise<any> => {
  const formData = new FormData();
  if (fileObj && typeof fileObj === 'object' && fileObj.uri) {
    const filename = fileObj.fileName || fileObj.uri.split('/').pop() || 'logo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = fileObj.mimeType || fileObj.type || (match ? `image/${match[1]}` : 'image/jpeg');
    formData.append('logo', {
      uri: fileObj.uri,
      name: filename,
      type,
    } as any);
  } else {
    formData.append('logo', fileObj);
  }

  const res = await fetchWithAuth(`${BASE}/upload-logo`, {
    method: 'POST',
    body: formData,
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to upload logo');
  }
  return res?.data || res;
};

export const deleteLogo = async (filename: string): Promise<any> => {
  const cleanFilename = filename.split('/').pop() || filename;
  const res = await fetchWithAuth(`${BASE}/logo/${cleanFilename}`, {
    method: 'DELETE',
  });
  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to delete logo');
  }
  return res?.data || res;
};
