// ─── 1. Success response ──────────────────────────────────────────────────────
const successResponse = (res, { statusCode = 200, message = "Success", data = null, meta = null }) => {
  const body = { success: true, message };
  if (data !== null) body.data  = data;
  if (meta !== null) body.meta  = meta;
  return res.status(statusCode).json(body);
};

// ─── 2. Error response ────────────────────────────────────────────────────────
const errorResponse = (res, { statusCode = 500, message = "Internal Server Error", errors = null }) => {
  const body = { success: false, statusCode, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

// ─── 3. Created response (201) ────────────────────────────────────────────────
const createdResponse = (res, message, data) =>
  successResponse(res, { statusCode: 201, message, data });

// ─── 4. No-content response (204) ────────────────────────────────────────────
const noContentResponse = (res) => res.status(204).send();

// ─── 5. Paginated list response ───────────────────────────────────────────────
const paginatedResponse = (res, { message = "Success", data, pagination }) =>
  successResponse(res, {
    statusCode: 200,
    message,
    data,
    meta: { pagination },
  });

// ─── 6. Not found response (404) ─────────────────────────────────────────────
const notFoundResponse = (res, message = "Resource not found.") =>
  errorResponse(res, { statusCode: 404, message });

// ─── 7. Unauthorized response (401) ──────────────────────────────────────────
const unauthorizedResponse = (res, message = "Unauthorized. Please log in.") =>
  errorResponse(res, { statusCode: 401, message });

// ─── 8. Forbidden response (403) ─────────────────────────────────────────────
const forbiddenResponse = (res, message = "Access denied.") =>
  errorResponse(res, { statusCode: 403, message });

// ─── 9. Validation error response (422) ──────────────────────────────────────
const validationErrorResponse = (res, errors, message = "Validation failed.") =>
  errorResponse(res, { statusCode: 422, message, errors });

// ─── 10. Conflict response (409) ──────────────────────────────────────────────
const conflictResponse = (res, message = "Resource already exists.") =>
  errorResponse(res, { statusCode: 409, message });

module.exports = {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  conflictResponse,
};
