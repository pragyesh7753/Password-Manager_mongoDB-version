const API_TIMEOUT_MS = 10000;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is required.');
}

const NORMALIZED_API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

const withTimeout = () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  return { controller, timeout };
};

const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    const rawText = await response.text();
    if (rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.trim().startsWith('<html')) {
      throw new Error('API URL is incorrect. Received HTML instead of JSON.');
    }
    throw new Error('Received an invalid API response format.');
  }

  return response.json();
};

const request = async (path, options = {}, getToken) => {
  const { controller, timeout } = withTimeout();

  try {
    const token = await getToken?.();

    if (!token) {
      throw new Error('Session expired. Please sign in again.');
    }

    const response = await fetch(`${NORMALIZED_API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.message);
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

const requestCsv = async (path, getToken) => {
  const { controller, timeout } = withTimeout();

  try {
    const token = await getToken?.();

    if (!token) {
      throw new Error('Session expired. Please sign in again.');
    }

    const response = await fetch(`${NORMALIZED_API_BASE_URL}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw new Error(payload.message);
    }

    const csv = await response.text();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

    return {
      csv,
      fileName: fileNameMatch?.[1] || 'passop-passwords.csv',
    };
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
  getPasswords: async (getToken, options = {}) => {
    const params = new URLSearchParams();

    if (options.limit) {
      params.set('limit', String(options.limit));
    }

    if (options.cursor) {
      params.set('cursor', options.cursor);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const payload = await request(`/api/passwords${query}`, { method: 'GET' }, getToken);

    if (Array.isArray(payload.data)) {
      return { items: payload.data, nextCursor: null };
    }

    return payload.data;
  },
  createPassword: (body, getToken) =>
    request('/api/passwords', { method: 'POST', body: JSON.stringify(body) }, getToken),
  updatePassword: (id, body, getToken) =>
    request(`/api/passwords/${id}`, { method: 'PUT', body: JSON.stringify(body) }, getToken),
  deletePassword: (id, getToken) => request(`/api/passwords/${id}`, { method: 'DELETE' }, getToken),
  revealPassword: async (id, getToken) => {
    const payload = await request(`/api/passwords/${id}/reveal`, { method: 'GET' }, getToken);
    return payload.data.password;
  },
  exportPasswordsCsv: async (getToken) => {
    try {
      return await requestCsv('/api/passwords/export.csv', getToken);
    } catch (error) {
      if (error?.message === 'Route not found') {
        return requestCsv('/api/passwords/export', getToken);
      }

      throw error;
    }
  },
  importPasswords: async (entries, getToken) => {
    const payload = await request(
      '/api/passwords/import',
      {
        method: 'POST',
        body: JSON.stringify({ entries }),
      },
      getToken
    );

    return payload.data;
  },
};
