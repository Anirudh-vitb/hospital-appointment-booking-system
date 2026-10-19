import { ZodError } from 'zod';
import ApiError from '../utils/ApiError.js';

// Validates and normalises req.body / req.query / req.params with zod schemas.
// Parsed values are placed on req.valid because Express 5 makes req.query
// read-only. Unknown body fields are stripped, so a client cannot sneak in
// fields such as "role" or "status".
export default function validate(schemas) {
  return (req, res, next) => {
    try {
      req.valid = {};
      for (const part of ['params', 'query', 'body']) {
        if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return next(ApiError.badRequest('Some fields need attention.', details));
      }
      next(error);
    }
  };
}
