const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createTugas, getTugas, updateStatus } = require('../controllers/tugasController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `bukti-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
router.post('/', authenticate, authorizeRoles('pimpinan'), createTugas);
router.get('/', authenticate, getTugas);
router.patch('/:id/status', authenticate, authorizeRoles('teknisi', 'pimpinan'), updateStatus);
router.post('/:id/upload-bukti', authenticate, authorizeRoles('teknisi', 'pimpinan'), upload.single('foto'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File foto tidak ditemukan.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    message: 'Foto bukti berhasil diunggah.',
    url: fileUrl
  });
});

module.exports = router;
