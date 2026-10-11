import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Not found: ${req.method} ${req.originalUrl}`));
}
