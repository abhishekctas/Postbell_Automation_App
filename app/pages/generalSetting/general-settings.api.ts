import { fetchWithAuth, API_ENDPOINTS } from '@/services/api';

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
