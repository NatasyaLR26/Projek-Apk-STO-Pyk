const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const tugasRoutes = require('./routes/tugasRoutes');
const permohonanRoutes = require('./routes/permohonanRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const laporanRoutes = require('./routes/laporanRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server STO Telkom Akses jalan!');
});


app.use('/api/tracking', trackingRoutes);
app.use('/api/permohonan', permohonanRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tugas', tugasRoutes);
app.use('/api/laporan', laporanRoutes);

module.exports = app;