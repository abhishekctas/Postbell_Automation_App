import { API_ENDPOINTS, fetchWithAuth } from '@/services/api';

export const getProfile = async (id: string) => {
  const res = await fetchWithAuth(`${API_ENDPOINTS.profile}/get-customer/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res;
};

export const updateProfile = async (id: string, data: any) => {
  const res = await fetchWithAuth(`${API_ENDPOINTS.profile}/update-customer/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return res;
};

export const uploadProfile = async (id: string, file: any) => {
  let formData: FormData;

  if (
    file &&
    typeof file === 'object' &&
    ('_parts' in file || file.constructor?.name === 'FormData')
  ) {
    formData = file;
  } else {
    formData = new FormData();
    if (file && typeof file === 'object' && file.uri) {
      const filename = file.name || file.fileName || file.uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = file.type || file.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');
      formData.append('image', {
        uri: file.uri,
        name: filename,
        type,
      } as any);
    } else {
      formData.append('image', file);
    }
  }

  const res = await fetchWithAuth(`${API_ENDPOINTS.profile}/profile/upload-profile-image/${id}`, {
    method: 'POST',
    body: formData,
  });

  return res;
};

export const deleteProfile = async (id: string) => {
  const res = await fetchWithAuth(`${API_ENDPOINTS.profile}/delete-profile-image/${id}`, {
    method: 'DELETE',
  });

  return res;
};
