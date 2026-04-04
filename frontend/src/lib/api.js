const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const API_TIMEOUT_MS = 10000;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

const withTimeout = () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  return { controller, timeout };
};

const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const rawText = await response.text();
    if (rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.trim().startsWith('<html')) {
      throw new Error('API URL is incorrect. Received HTML instead of JSON.');
    }
    throw new Error('Received an invalid API response format.');
  }

  return response.json();
};

const request = async (path, options = {}) => {
  const { controller, timeout } = withTimeout();

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload?.message || 'Request failed');
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const apiClient = {
  getPasswords: async () => {
    const payload = await request('/api/passwords', { method: 'GET' });
    return payload.data || [];
  },
  createPassword: (body) => request('/api/passwords', { method: 'POST', body: JSON.stringify(body) }),
  updatePassword: (id, body) =>
    request(`/api/passwords/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePassword: (id) => request(`/api/passwords/${id}`, { method: 'DELETE' }),
};
