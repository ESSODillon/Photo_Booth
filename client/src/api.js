const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(`${API_URL}${path}`, config);
  const isJson = response.headers
    .get('content-type')
    ?.toLowerCase()
    .includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export function getHealth() {
  return request('/api/health');
}

export function getPhotos() {
  return request('/api/photos');
}

export function capturePhoto() {
  return request('/api/capture', { method: 'POST' });
}

export const PHOTO_BASE = `${API_URL}/photos`;

