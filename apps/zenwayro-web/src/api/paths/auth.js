/**
 * Auth HTTP paths (global prefix `/api` is applied at bootstrap).
 */
export const AUTH_PATHS = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  sync: '/api/auth/sync',
  verify: '/api/auth/verify',
  resendVerification: '/api/auth/resend-verification',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
  status: '/api/auth/status',
};
