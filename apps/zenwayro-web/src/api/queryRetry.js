import { ApiError } from './client.js';

export function shouldRetryFailedQuery(failureCount, error) {
  if (error instanceof ApiError && error.status === 401) {
    return false;
  }

  if (error != null && error.status === 401) {
    return false;
  }

  return failureCount < 1;
}
