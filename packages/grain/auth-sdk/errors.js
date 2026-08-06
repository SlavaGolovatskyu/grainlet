import { AuthError } from '../auth/errors.js';

export class AuthSdkError extends AuthError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code ?? 'AuthSdkError',
      status: options.status,
      recoverable: options.recoverable,
      cause: options.cause,
    });
    this.name = 'AuthSdkError';
    this.details = options.details;
  }
}

export function toAuthSdkError(error, fallbackMessage, code) {
  if (error instanceof AuthSdkError) return error;
  return new AuthSdkError(
    error instanceof Error ? error.message : fallbackMessage,
    { code, cause: error }
  );
}
