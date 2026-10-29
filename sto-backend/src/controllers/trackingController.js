const { successResponse } = require('../utils/responseHelper');

// GPS tracking dinonaktifkan sesuai kebutuhan operasional produksi
exports.updateTracking = async (req, res) => {
  return successResponse(res, 200, 'Fitur GPS tracking telah dinonaktifkan', { active: false });
};

exports.getTrackingByTugas = async (req, res) => {
  return successResponse(res, 200, 'Fitur GPS tracking telah dinonaktifkan', { active: false });
};
