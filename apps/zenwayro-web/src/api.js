import { apiClient } from './api/client.js';

export { API_URL, apiClient, ApiError, addRequestInterceptor } from './api/client.js';
export { authenticatedFetch, isAuthEndpoint } from './api/authenticatedFetch.js';
export { shouldRetryFailedQuery } from './api/queryRetry.js';
export {
  registerAuthSessionHandlers,
  getCachedAccessToken,
  recoverFromUnauthorized,
} from './api/sessionBridge.js';
export * from './api/paths/index.js';

export function postJson(path, body) {
  return apiClient.post(path, body);
}
