const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const tugasRoutes = require('./routes/tugasRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server STO Telkom Akses jalan!');
});

app.use('/api/auth', authRoutes);
app.use('/api/tugas', tugasRoutes);

module.exports = app;