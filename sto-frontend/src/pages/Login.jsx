import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import ParticleBackground from '../components/ParticleBackground';
import BrandLogo from '../components/BrandLogo';
import api from '../api/axiosInstance';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

export default function Login({ onTriggerSplash }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Login Form States - Clean production state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Form States (strictly matching Supabase users table: nama_lengkap, email, password, role)
  const [regNama, setRegNama] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regToken, setRegToken] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const regRole = 'teknisi'; // Strictly Teknisi! Pimpinan and Gudang cannot be self-registered

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [particleColor, setParticleColor] = useState('burgundy');

  const { toggleTheme, isDark } = useTheme();
  const { users, currentUser, setCurrentUser, addUser, showToast } = useApp();
  const navigate = useNavigate();

  // Auto-redirect jika pengguna SUDAH login (mencegah tombol Back browser kembali ke form login tanpa logout)
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user');
      const activeUser = currentUser || (rawUser ? JSON.parse(rawUser) : null);
      if (activeUser && activeUser.role) {
        const dest =
          activeUser.role === 'teknisi'
            ? '/dashboard-teknisi'
            : activeUser.role === 'gudang'
            ? '/dashboard-gudang'
            : '/dashboard-pimpinan';
        navigate(dest, { replace: true });
      }
    } catch {}
  }, [currentUser, navigate]);

  // Handle Automatic Role-Based Login via Backend Controller
  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loggedInUser = null;
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanPassword = (password || '').trim();

      // 1. Verifikasi Cepat di Memori / Cache Lokal (Seketika < 5ms tanpa delay jaringan)
      const localFound = users.find(
        (u) => u.email?.toLowerCase().trim() === cleanEmail
      );

      if (localFound && String(localFound.password).trim() === cleanPassword) {
        loggedInUser = localFound;
      }

      // 2. Jika belum cocok langsung (misal kata sandi ter-hash di backend), coba API dengan timeout gesit (800ms)
      if (!loggedInUser) {
        try {
          const response = await api.post('/auth/login', {
            email: cleanEmail,
            password: cleanPassword
          }, { timeout: 800 });

          if (response.data?.success && (response.data?.data?.user || response.data?.user)) {
            loggedInUser = response.data?.data?.user || response.data?.user;
          }
        } catch (backendErr) {
          if (backendErr.response) {
            const status = backendErr.response.status;
            const msg = backendErr.response.data?.message;
            if (status === 401) {
              setError(msg || 'Kata sandi yang Anda masukkan salah!');
              setLoading(false);
              return;
            }
            if (status === 404) {
              setError(msg || 'Email tidak ditemukan di sistem STO.');
              setLoading(false);
              return;
            }
            if (status === 400) {
              setError(msg || 'Email dan kata sandi wajib diisi.');
              setLoading(false);
              return;
            }
          }
        }
      }

      // 3. Fallback evaluasi password lokal jika user ada
      if (!loggedInUser && localFound) {
        if (String(localFound.password).trim() === cleanPassword) {
          loggedInUser = localFound;
        } else {
          setError('Kata sandi yang Anda masukkan salah!');
          setLoading(false);
          return;
        }
      }

      // 3. Evaluasi Hasil Autentikasi
      if (!loggedInUser) {
        setError('Akun dengan email tersebut belum terdaftar di sistem STO.');
        setLoading(false);
        return;
      }

      // Validasi Status Otorisasi / Approval Pegawai Baru
      if (loggedInUser.status_verifikasi === 'Pending Approval') {
        setError('⚠️ Akun Anda sedang menunggu persetujuan (approval) Pimpinan STO Telkom Akses Payakumbuh. Hubungi Pimpinan untuk mengaktifkan akun Anda.');
        setLoading(false);
        return;
      }

      // 4. Save Session & Auto Route by Database Role
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setCurrentUser(loggedInUser);

      // Bersihkan tab historis sesi lama agar saat pertama login SELALU membuka Dashboard utama
      localStorage.removeItem('sto_active_tab_pimpinan');
      localStorage.removeItem('sto_active_tab_teknisi');
      localStorage.removeItem('sto_active_tab_gudang');
      sessionStorage.removeItem('sto_active_tab_pimpinan');
      sessionStorage.removeItem('sto_active_tab_teknisi');
      sessionStorage.removeItem('sto_active_tab_gudang');

      showToast(`Selamat datang, ${loggedInUser.nama_lengkap}! Masuk sebagai ${loggedInUser.role.toUpperCase()}`, 'success');

      // Validasi redirect dari Link Pesan Bot Telegram (/tiket/:id)
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect') || sessionStorage.getItem('sto_redirect_after_login');

      if (redirectUrl) {
        sessionStorage.removeItem('sto_redirect_after_login');
        navigate(redirectUrl, { replace: true });
        return;
      }

      if (loggedInUser.role === 'pimpinan') {
        navigate('/dashboard-pimpinan', { replace: true });
      } else if (loggedInUser.role === 'teknisi') {
        navigate('/dashboard-teknisi', { replace: true });
      } else if (loggedInUser.role === 'gudang') {
        navigate('/dashboard-gudang', { replace: true });
      } else {
        navigate('/dashboard-pimpinan', { replace: true });
      }
    } catch (err) {
      setError('Terjadi kendala saat memproses login. Silakan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Technician Registration (strictly role: 'teknisi' per business policy)
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!regNama.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Harap lengkapi nama, email, dan kata sandi.');
      return;
    }

    setLoading(true);

    try {
      // Check existing email
      const existing = users.find(u => u.email?.toLowerCase().trim() === regEmail.toLowerCase().trim());
      if (existing) {
        setError('Email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk.');
        setLoading(false);
        return;
      }

      const isTokenValid = regToken.trim().toUpperCase() === 'STO-PYK-2026';

      const created = await addUser({
        nama_lengkap: regNama.trim(),
        email: regEmail.toLowerCase().trim(),
        password: regPassword,
        role: regRole, // Strictly Teknisi Lapangan! Pimpinan & Gudang are managed internally
        status_verifikasi: isTokenValid ? 'Verified' : 'Pending Approval',
        kode_otorisasi: regToken.trim() || '-'
      });

      if (isTokenValid) {
        showToast(`Pendaftaran berhasil dengan Kode Otorisasi Korporat! Akun Teknisi ${created.nama_lengkap} langsung aktif.`, 'success');
        setEmail(regEmail);
        setPassword(regPassword);
        setAuthMode('login');
      } else {
        showToast(`Pendaftaran diajukan! Akun Anda sedang menunggu persetujuan Pimpinan STO Payakumbuh.`, 'info');
        setAuthMode('login');
        setError('Pendaftaran berhasil! Akun Anda berstatus "Pending Approval" dan memerlukan persetujuan dari Pimpinan STO sebelum dapat login.');
      }
    } catch (err) {
      setError('Gagal mendaftarkan akun. Silakan periksa koneksi data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#0a0f1d] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Interactive Canvas Particle Background with Compact Dropdown Color Switcher */}
      <ParticleBackground
        activeColor={particleColor}
        onColorChange={(newCol) => setParticleColor(newCol)}
        showSelector={true}
      />

      {/* Top Left Theme & Splash Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-2xl border transition shadow-lg cursor-pointer ${
            isDark
              ? 'bg-slate-900/80 border-slate-700 text-amber-400 hover:bg-slate-800'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Ganti Tema Dark / Light Mode"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {onTriggerSplash && (
          <button
            onClick={onTriggerSplash}
            className={`px-3 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-lg cursor-pointer ${
              isDark
                ? 'bg-slate-900/80 border-slate-700 text-rose-300 hover:bg-slate-800'
                : 'bg-white/90 border-slate-200 text-rose-700 hover:bg-slate-100'
            }`}
            title="Putar Ulang Animasi Splash Screen"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Lihat Splash</span>
          </button>
        )}
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-300 my-8">
        <div
          className={`rounded-3xl p-7 sm:p-9 shadow-2xl border transition-all duration-300 ${
            isDark
              ? 'bg-slate-900/85 border-slate-700/80 backdrop-blur-2xl shadow-rose-950/20'
              : 'bg-white/95 border-slate-200 backdrop-blur-2xl shadow-slate-300/50'
          }`}
        >
          {/* Header Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <BrandLogo size="lg" className="mb-2 justify-center" />
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mt-1`}>
              Fiber Ops
            </h1>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center justify-center gap-1.5 mt-0.5`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>STO PAYAKUMBUH</span>
            </p>
          </div>

          {/* Tab Switcher: Masuk vs Registrasi Teknisi */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-2xl mb-6 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Sistem</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Teknisi</span>
            </button>
          </div>

          {/* Error Message if any */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs text-center font-medium animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* MODE 1: LOGIN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Email Pegawai Telkom
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className={`w-full pl-10 pr-3.5 py-3 rounded-2xl text-xs font-medium border outline-none transition ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-700 text-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-3 rounded-2xl text-xs font-medium border outline-none transition ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-700 text-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer p-1"
                    title={showLoginPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi"}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-600 text-white font-extrabold text-xs shadow-xl shadow-rose-900/40 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Memverifikasi Akun...</span>
                ) : (
                  <>
                    <span>Masuk ke Sistem STO</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Belum memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(''); }}
                    className="text-rose-500 font-bold hover:underline cursor-pointer"
                  >
                    Daftar Akun Baru
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER FORM */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 animate-in fade-in duration-200">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-medium border outline-none transition ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-700 text-white focus:border-rose-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-medium border outline-none transition ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-700 text-white focus:border-rose-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-medium border outline-none transition ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-700 text-white focus:border-rose-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer p-1"
                    title={showRegPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi"}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Autentikasi
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regToken}
                    onChange={(e) => setRegToken(e.target.value.toUpperCase())}
                    placeholder="Kode Autentikasi"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider border outline-none transition ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-700 text-white focus:border-rose-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 mt-2 rounded-2xl bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-600 text-white font-extrabold text-xs shadow-xl shadow-rose-900/40 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? <span>Mendaftarkan Akun...</span> : <span>Daftar Akun Baru</span>}
              </button>

              <div className="pt-2 text-center">
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(''); }}
                    className="text-rose-500 font-bold hover:underline cursor-pointer"
                  >
                    Masuk ke Sistem
                  </button>
                </span>
              </div>
            </form>
          )}

        </div>

        {/* Footer Info */}
        <p className="text-center text-[10px] text-slate-500 mt-4">
          PT Telkom Akses • Sentral Telepon Otomatis (STO) Payakumbuh
        </p>
      </div>

    </div>
  );
}