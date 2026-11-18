export const validation = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      params : req.params,
      body:req.body,
      query : req.query,
      Headers : req.Headers
    });
    if (!result.success) {
      return next(result.error);
    }
    req.validate = result.data
    next()
  };
};
