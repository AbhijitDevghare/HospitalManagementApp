// ─── 1. Build pagination metadata from query params ───────────────────────────
const getPaginationParams = (query) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

// ─── 2. Build pagination metadata object for the response ─────────────────────
const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages  = Math.ceil(total / limit);
  return {
    currentPage:  page,
    totalPages,
    totalRecords: total,
    limit,
    hasNextPage:  page < totalPages,
    hasPrevPage:  page > 1,
  };
};

// ─── 3. Paginate a Mongoose query ─────────────────────────────────────────────
// Usage: const { data, pagination } = await paginateQuery(Model.find(filter), query);
const paginateQuery = async (mongooseQuery, reqQuery) => {
  const { page, limit, skip } = getPaginationParams(reqQuery);

  // Clone the query to run count without modifying the original
  const total = await mongooseQuery.model
    .countDocuments(mongooseQuery.getFilter());

  const data = await mongooseQuery.skip(skip).limit(limit);

  return {
    data,
    pagination: buildPaginationMeta({ page, limit, total }),
  };
};

// ─── 4. Paginate a plain array (in-memory) ────────────────────────────────────
const paginateArray = (array = [], reqQuery = {}) => {
  const { page, limit, skip } = getPaginationParams(reqQuery);
  const data = array.slice(skip, skip + limit);
  return {
    data,
    pagination: buildPaginationMeta({ page, limit, total: array.length }),
  };
};

module.exports = {
  getPaginationParams,
  buildPaginationMeta,
  paginateQuery,
  paginateArray,
};
