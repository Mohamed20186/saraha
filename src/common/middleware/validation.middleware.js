export const validation = (schemaFactory) => {
  return (req, res, next) => {
    const t = (key, options) => req.t(key, options);

    const schema = schemaFactory(t);

    const result = schema.safeParse({
      params: req.params,
      body: req.body,
      query: req.query,
      headers: req.headers,
    });

    if (!result.success) {
      return next(result.error);
    }

    req.validate = result.data;

    next();
  };
};