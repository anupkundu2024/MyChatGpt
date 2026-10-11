import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// body-parser / http-errors failures carry a `type` and a 4xx `status`.
const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': 'Malformed JSON body',
  'entity.too.large': 'Request body is too large',
  'encoding.unsupported': 'Unsupported content encoding',
  'charset.unsupported': 'Unsupported charset',
  'request.aborted': 'Request aborted',
};

// Express identifies error handlers by their 4-argument signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.issues.map(({ path, message: msg }) => ({ path: path.join('.'), message: msg }));
  } else if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    status = 400;
    message = 'Invalid data';
  } else if (err?.code === 11000) {
    status = 409;
    message = 'Duplicate value';
  } else if (BODY_PARSER_MESSAGES[err?.type]) {
    status = err.status ?? 400;
    message = BODY_PARSER_MESSAGES[err.type];
  } else if (err?.expose && err.status >= 400 && err.status < 500) {
    // Other client errors raised by Express/http-errors with a safe message.
    status = err.status;
    message = err.message;
  }

  if (status >= 500) console.error(err);

  // Headers already sent (e.g. mid SSE stream): let Express close the connection.
  if (res.headersSent) return req.socket?.destroy();

  res.status(status).json({
    error: {
      message,
      ...(details && { details }),
      ...(env.NODE_ENV === 'development' && status >= 500 && { stack: err?.stack }),
    },
  });
}
