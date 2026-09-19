/**
 * Standardized API Response Helper for STO Backend
 * Ensures consistent response contract across all controllers
 * while maintaining backward compatibility with legacy keys.
 */

const successResponse = (res, statusCode = 200, message = 'Berhasil', data = null, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
};

const errorResponse = (res, statusCode = 500, message = 'Terjadi kesalahan', error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error ? (typeof error === 'string' ? error : error.message || error) : null,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
