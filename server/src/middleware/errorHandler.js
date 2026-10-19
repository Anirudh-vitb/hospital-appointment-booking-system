import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

export function notFound(req, res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `No API route matches ${req.method} ${req.originalUrl}.`));
}

// Centralised error handler: converts every error into the same JSON shape
// and never leaks stack traces or database internals to the client.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  let apiError = error;

  if (!(error instanceof ApiError)) {
    if (error instanceof mongoose.Error.ValidationError) {
      const details = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
      apiError = ApiError.badRequest('Some fields need attention.', details);
    } else if (error instanceof mongoose.Error.CastError) {
      apiError = ApiError.badRequest(`Invalid value for ${error.path}.`);
    } else if (error?.code === 11000) {
      apiError = ApiError.conflict('DUPLICATE', 'A record with these details already exists.');
    } else if (error?.name === 'MongoServerSelectionError' || error?.name === 'MongoNetworkError') {
      apiError = new ApiError(503, 'DATABASE_UNAVAILABLE', 'The appointment database is not reachable right now. Please try again in a minute.');
    } else if (error?.type === 'entity.parse.failed') {
      apiError = ApiError.badRequest('The request body is not valid JSON.');
    } else if (error?.type === 'entity.too.large') {
      apiError = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
    } else {
      console.error('[error]', error);
      apiError = new ApiError(500, 'INTERNAL_ERROR', 'The server could not complete this request.');
    }
  }

  const body = { success: false, error: { code: apiError.code, message: apiError.message } };
  if (apiError.details) body.error.details = apiError.details;
  if (!env.isProduction && apiError.status === 500 && error?.message) body.error.debug = error.message;
  res.status(apiError.status).json(body);
}
