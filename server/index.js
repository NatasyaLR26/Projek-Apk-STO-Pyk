const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tugasRoutes = require('./routes/tugas');
const barangRoutes = require('./routes/barang');
const permohonanRoutes = require('./routes/permohonan');
const trackingRoutes = require('./routes/tracking');
const reportRoutes = require('./routes/report');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads for proof photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend STO Telkom Akses Server is running smoothly',
    timestamp: new Date()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/tugas', tugasRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/permohonan', permohonanRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/reports', reportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 STO Telkom Server running on http://localhost:${PORT}`);
});

module.exports = app;
