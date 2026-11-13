

export const create = async ({ model, data }) => {
  return await model.create(data);
};



export const find = async ({
  model,
  filter = {},
  projection = null,
  options = {},
}) => {
  let query = model.find(filter, projection);

  if (options.select) query.select(options.select);
  if (options.populate) query.populate(options.populate);
  if (options.sort) query.sort(options.sort);

  if (options.skip !== undefined) query.skip(options.skip);
  if (options.limit !== undefined) query.limit(options.limit);

  if (options.lean) query.lean();

  return await query;
};



export const findOne = async ({
  model,
  filter = {},
  projection = null,
  options = {},
}) => {
  let query = model.findOne(filter, projection);

  if (options.select) query.select(options.select);
  if (options.populate) query.populate(options.populate);
  if (options.sort) query.sort(options.sort);
  if (options.lean) query.lean();

  return await query;
};



export const findById = async ({
  model,
  id,
  projection = null,
  options = {},
}) => {
  let query = model.findById(id, projection);

  if (options.select) query.select(options.select);
  if (options.populate) query.populate(options.populate);
  if (options.lean) query.lean();

  return await query;
};



export const updateById = async ({
  model,
  id,
  data,
  options = {},
}) => {
  const { populate, ...updateOptions } = options;

  let query = model.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    ...updateOptions,
  });

  if (populate) query.populate(populate);

  return await query;
};


export const updateOne = async ({
  model,
  filter = {},
  data,
  options = {},
}) => {
  const { populate, ...updateOptions } = options;

  let query = model.findOneAndUpdate(filter, data, {
    new: true,
    runValidators: true,
    ...updateOptions,
  });

  if (populate) query.populate(populate);

  return await query;
};



export const deleteById = async ({ model, id }) => {
  return await model.findByIdAndDelete(id);
};



export const deleteOne = async ({
  model,
  filter = {},
}) => {
  return await model.deleteOne(filter);
};



export const count = async ({
  model,
  filter = {},
}) => {
  return await model.countDocuments(filter);
};


export const bulk = async ({
  model,
  data,
  options = {},
}) => {
  return await model.insertMany(data, options);
};



export const exists = async ({
  model,
  filter = {},
}) => {
  return await model.exists(filter);
};



export const bulkWrite = async ({
  model,
  operations,
  options = {},
}) => {
  return await model.bulkWrite(operations, options);
};
