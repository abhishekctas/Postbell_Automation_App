import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const CUSTOMER_SETUP_BASE = `${API_BASE_URL}/customer-setup`;
const META_OAUTH_BASE = `${API_BASE_URL}/meta-oauth`;

export interface CustomerSetupConfig {
  company_name: string;
  company_website: string;
  company_email: string;
  company_phone: string;
  company_logo: string;
  company_address?: string;
  social_media_auth: Record<
    string,
    | {
        connection_status?: string;
        connected_account_name?: string;
        auth_status?: string;
        reconnect_status?: string;
        account_id?: string;
        username?: string;
        page_id?: string;
        page_name?: string;
        [key: string]: any;
      }
    | any
  >;
  social_links: {
    instagram_url: string;
    facebook_url: string;
    whatsapp_number: string;
    linkedin_url?: string;
    twitter_url?: string;
  };
  branding_preferences: {
    primary_color: string;
    secondary_color: string;
    content_language: string;
    brand_tone: string;
    default_cta: string;
    default_hashtags: string[];
  };
  ai_config: {
    gemini_api_key: string;
    openai_api_key: string;
    gemini_model?: string;
    openai_model?: string;
  };
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

/**
 * Fetch customer setup configuration
 */
export const getCustomerConfig = async (): Promise<any> => {
  try {
    const response = await fetchWithAuth(`${CUSTOMER_SETUP_BASE}/get-customer-configuration`);
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to fetch customer configuration',
    };
  }
};

/**
 * Build FormData from setupData.
 * - Appends company_logo as a file if company_logo_file exists.
 * - Strips local-only preview fields before sending.
 * - Sends remaining data as JSON string in a 'data' field.
 */
const buildFormData = (data: any): FormData => {
  const formData = new FormData();

  if (data?.company_logo_file) {
    formData.append('company_logo', data.company_logo_file as any);
  }

  const { company_logo_file, company_logo_preview, ...rest } = data || {};
  formData.append('data', JSON.stringify(rest));

  return formData;
};

/**
 * Save current step progress
 */
export const saveCurrentStep = async (step: number, data: any): Promise<any> => {
  try {
    const formData = buildFormData(data);
    formData.append('step', String(step));

    const response = await fetchWithAuth(`${CUSTOMER_SETUP_BASE}/save-customer-configuration`, {
      method: 'POST',
      body: formData,
    });
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to save current step',
    };
  }
};

/**
 * Update complete customer setup configuration
 */
export const updateCustomerConfig = async (data: any): Promise<any> => {
  try {
    const formData = buildFormData(data);
    const response = await fetchWithAuth(`${CUSTOMER_SETUP_BASE}/save-customer-configuration`, {
      method: 'POST',
      body: formData,
    });
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to update customer configuration',
    };
  }
};

/**
 * Complete & activate workspace
 */
export const activeWorkspace = async (data: any): Promise<any> => {
  try {
    const formData = buildFormData(data);
    const response = await fetchWithAuth(`${CUSTOMER_SETUP_BASE}/complete-customer-setup`, {
      method: 'POST',
      body: formData,
    });
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to activate workspace',
    };
  }
};

/**
 * Update social connection platform
 */
export const updateSocialConnection = async (platform: string, data: any): Promise<any> => {
  try {
    const response = await fetchWithAuth(
      `${CUSTOMER_SETUP_BASE}/update-social-media-connection/${platform}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || `Failed to update ${platform} connection`,
    };
  }
};

// ── Meta & External OAuth APIs ──────────────────────────────────────────────────────────

const EXTERNAL_PLATFORMS = ['twitter', 'snapchat', 'google_business', 'linkedin', 'pinterest'];

export type SocialMediaPlatform =
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'twitter'
  | 'snapchat'
  | 'google_business'
  | 'linkedin'
  | 'pinterest'
  | string;

export const getOAuthUrl = async (
  platform: SocialMediaPlatform,
  source: string = 'setup-wizard'
): Promise<any> => {
  try {
    const url = EXTERNAL_PLATFORMS.includes(platform)
      ? `${API_BASE_URL}/auth/${platform}?source=${encodeURIComponent(source)}`
      : `${META_OAUTH_BASE}/auth-url/${platform}?source=${encodeURIComponent(source)}`;
    const response = await fetchWithAuth(url);
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to get OAuth URL',
    };
  }
};

export const getConnectionStatus = async (platform: SocialMediaPlatform): Promise<any> => {
  try {
    const response = await fetchWithAuth(`${META_OAUTH_BASE}/status/${platform}`);
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to get connection status',
    };
  }
};

export const disconnectAccount = async (platform: SocialMediaPlatform): Promise<any> => {
  try {
    const response = await fetchWithAuth(`${META_OAUTH_BASE}/disconnect/${platform}`, {
      method: 'POST',
    });
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || `Failed to disconnect ${platform}`,
    };
  }
};
