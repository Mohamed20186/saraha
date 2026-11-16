
export default (model) => {


  const create = async ({ data }) => {
    return await model.create(data);
  };



  const find = async ({
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



  const paginate = async ({
    filter = {},
    projection = null,
    options = {},
  }) => {

    const {
      page: pageInput,
      limit: limitInput,
      ...findOptions
    } = options;

    const page = Math.max(
      Number.parseInt(pageInput, 10) || 1,
      1
    );

    const requestedLimit = Math.max(
      Number.parseInt(limitInput, 10) || 10,
      1
    );

    const limit = Math.min(requestedLimit, 100);

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      find({
        filter,
        projection,
        options: {
          ...findOptions,
          skip,
          limit,
        },
      }),

      model.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
      },
    };
  };



  const findOne = async ({
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



  const findById = async ({
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



  const updateById = async ({
    id,
    data,
    options = {},
  }) => {
    const { populate, ...updateOptions } = options;

    let query = model.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
      ...updateOptions,
    });

    if (populate) query.populate(populate);

    return await query;
  };



  const updateOne = async ({
    filter = {},
    data,
    options = {},
  }) => {
    const { populate, ...updateOptions } = options;

    let query = model.findOneAndUpdate(filter, data, {
      returnDocument: "after",
      runValidators: true,
      ...updateOptions,
    });

    if (populate) query.populate(populate);

    return await query;
  };



  const deleteById = async ({ id }) => {
    return await model.findByIdAndDelete(id);
  };


  const deleteOne = async ({ filter = {} }) => {
    return await model.deleteOne(filter);
  };


  // ==================== COUNT ====================

  const count = async ({ filter = {} }) => {
    return await model.countDocuments(filter);
  };


  // ==================== BULK ====================

  const bulk = async ({ data, options = {} }) => {
    return await model.insertMany(data, options);
  };


  const bulkWrite = async ({
    operations,
    options = {},
  }) => {
    return await model.bulkWrite(operations, options);
  };


  // ==================== EXISTS ====================

  const exists = async ({ filter = {} }) => {
    return await model.exists(filter);
  };



  return {
    create,
    find,
    paginate,
    findOne,
    findById,
    updateById,
    updateOne,
    deleteById,
    deleteOne,
    count,
    bulk,
    bulkWrite,
    exists,
  };

};
