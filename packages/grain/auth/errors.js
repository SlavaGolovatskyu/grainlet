export class AuthError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'AuthError';
    this.code = options.code ?? 'AuthError';
    this.status = options.status;
    this.recoverable = options.recoverable;
  }
}

export function toAuthError(error, fallbackCode = 'AuthError') {
  if (error instanceof AuthError) return error;
  return new AuthError(
    error instanceof Error ? error.message : 'An authentication error occurred',
    {
      code: fallbackCode,
      cause: error,
      status:
        error && typeof error === 'object' && typeof error.status === 'number'
          ? error.status
          : undefined,
    }
  );
}
