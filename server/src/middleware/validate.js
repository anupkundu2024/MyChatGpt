// Validates req.body / req.params / req.query against zod schemas.
// Parsed values are stored on req.validated so controllers get typed, coerced data.
export const validate = (schemas) => (req, _res, next) => {
  req.validated = {};
  for (const key of ['body', 'params', 'query']) {
    if (schemas[key]) req.validated[key] = schemas[key].parse(req[key]);
  }
  next();
};
