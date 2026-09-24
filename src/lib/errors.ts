/**
 * The only error type route handlers should throw. Anything else that escapes a
 * handler is treated as a bug and reported as a 500 with no detail.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'bad_request', message, details);
  }

  static unauthorized(message = 'Sign in to continue.') {
    return new ApiError(401, 'unauthorized', message);
  }

  static forbidden(message = 'You do not have access to this.') {
    return new ApiError(403, 'forbidden', message);
  }

  static notFound(message = 'Not found.') {
    return new ApiError(404, 'not_found', message);
  }

  static conflict(code: string, message: string, details?: unknown) {
    return new ApiError(409, code, message, details);
  }

  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, 'unprocessable', message, details);
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
