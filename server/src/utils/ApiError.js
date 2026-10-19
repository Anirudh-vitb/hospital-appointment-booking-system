// Errors thrown on purpose by controllers and services. The error middleware
// turns them into the standard JSON error response.
export default class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Please sign in to continue.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'Your account does not have access to this action.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'The requested record was not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(code, message) {
    return new ApiError(409, code, message);
  }
}
