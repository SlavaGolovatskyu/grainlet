import { authenticatedFetch } from './authenticatedFetch.js';

function readApiUrl() {
  try {
    return import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
  } catch {
    return 'http://localhost:3001';
  }
}

export const API_URL = readApiUrl();

export class ApiError extends Error {
  constructor(status, statusText, message, data) {
    super(message ?? `${status} ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

const requestInterceptors = [];

export function addRequestInterceptor(fn) {
  requestInterceptors.push(fn);
  return () => {
    const idx = requestInterceptors.indexOf(fn);
    if (idx !== -1) requestInterceptors.splice(idx, 1);
  };
}

function isRawBody(body) {
  return (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof ReadableStream
  );
}

function messageFromErrorBody(text, statusText) {
  let errorMessage = text;
  let errorData;
  try {
    const json = JSON.parse(text);
    if (typeof json === 'object' && json !== null) {
      errorData = json;
      const rawMessage = json.message ?? json.error;
      if (typeof rawMessage === 'string') {
        errorMessage = rawMessage;
      } else if (
        typeof rawMessage === 'object' &&
        rawMessage !== null &&
        'message' in rawMessage &&
        typeof rawMessage.message === 'string'
      ) {
        errorMessage = rawMessage.message;
      } else {
        errorMessage = statusText;
      }
    }
  } catch {
    errorMessage = text || statusText;
  }
  return { errorMessage, errorData };
}

async function request(method, path, config = {}) {
  const { headers = {}, params, body, signal } = config;

  const url = new URL(path, API_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const hasBody = body !== undefined;
  const raw = hasBody && isRawBody(body);

  let init = {
    method,
    headers: {
      ...(hasBody && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: hasBody ? (raw ? body : JSON.stringify(body)) : undefined,
    signal,
  };

  for (const interceptor of requestInterceptors) {
    init = await interceptor(url.toString(), init);
  }

  const res = await authenticatedFetch(url.toString(), init);

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const { errorMessage, errorData } = messageFromErrorBody(text, res.statusText);
    throw new ApiError(res.status, res.statusText, errorMessage, errorData);
  }

  if (res.status === 204) return undefined;

  return res.json();
}

export const apiClient = {
  get(path, config) {
    return request('GET', path, config);
  },

  post(path, body, config) {
    return request('POST', path, { ...config, body });
  },

  put(path, body, config) {
    return request('PUT', path, { ...config, body });
  },

  patch(path, body, config) {
    return request('PATCH', path, { ...config, body });
  },

  delete(path, config) {
    return request('DELETE', path, config);
  },
};
