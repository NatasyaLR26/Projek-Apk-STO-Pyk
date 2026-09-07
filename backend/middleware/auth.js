const jwt = require('jsonwebtoken');

// Cek apakah request punya token yang valid.
// Dipasang di route yang WAJIB login dulu buat akses.
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization']; // formatnya: "Bearer xxxxx.yyyyy.zzzzz"

  if (!authHeader) {
    return res.status(401).json({ message: 'Token tidak ditemukan, silakan login dulu' });
  }

  const token = authHeader.split(' ')[1]; // ambil bagian setelah kata "Bearer"
  if (!token) {
    return res.status(401).json({ message: 'Format token salah' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // isinya: { id, nik, role } sesuai yang di-generate pas login
    next(); // lanjut ke route selanjutnya
  } catch (err) {
    return res.status(403).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
  }
}

// Cek apakah role user termasuk yang diizinkan.
// Contoh pakai: authorizeRoles('pimpinan') -> cuma pimpinan yang boleh akses
// Contoh pakai: authorizeRoles('gudang', 'pimpinan') -> gudang ATAU pimpinan boleh akses
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Kamu tidak punya akses ke fitur ini' });
    }
    next();
  };
}

module.exports = { verifyToken, authorizeRoles };
