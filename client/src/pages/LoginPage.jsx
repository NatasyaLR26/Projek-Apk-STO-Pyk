import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

const LoginPage = () => {
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formik + Yup Validation (Wajib Sesuai Dokumen)
  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Format email tidak valid')
        .required('Wajib diisi'),
      password: Yup.string()
        .required('Wajib diisi')
    }),
    onSubmit: async (values) => {
      setErrorMessage('');
      setIsSubmitting(true);
      const res = await login(values.email, values.password);
      if (!res.success) {
        setErrorMessage(res.message);
        showError('Gagal Masuk', res.message || 'Email atau password salah. Silakan coba lagi.');
      } else {
        showSuccess('Login Berhasil', `Selamat datang, ${res.user.nama_lengkap}!`);
      }
      setIsSubmitting(false);
    }
  });

  // Helper demo quick-fills for testing convenience
  const handleQuickFill = (roleEmail, rolePass) => {
    formik.setFieldValue('email', roleEmail);
    formik.setFieldValue('password', rolePass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* STO Header Branding */}
      <div className="text-center mb-8 relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 mx-auto flex items-center justify-center font-black text-white text-2xl tracking-wider shadow-xl shadow-red-600/30 border border-red-400/40 mb-3">
          STO
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Portal STO Telkom Akses
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manajemen Teknisi Lapangan, Logistik Gudang & WebGIS Payakumbuh
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 backdrop-blur-md">
        <div className="mb-6 pb-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight">Masuk ke Sistem</h2>
          <p className="text-xs text-slate-400 mt-1">Silakan masukkan akun resmi pegawai STO</p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Pegawai
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nama@sto.telkom.co.id"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.email}
                className={`w-full bg-slate-950 border pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                  formik.touched.email && formik.errors.email
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-800 focus:border-red-500'
                }`}
              />
            </div>
            {formik.touched.email && formik.errors.email && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">{formik.errors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.password}
                className={`w-full bg-slate-950 border pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                  formik.touched.password && formik.errors.password
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-800 focus:border-red-500'
                }`}
              />
            </div>
            {formik.touched.password && formik.errors.password && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">{formik.errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="mt-8 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Akses Cepat Akun Demo (Kerja Praktek)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@sto.telkom.co.id', 'admin123')}
              className="px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center border border-slate-700 transition-colors"
            >
              👑 Pimpinan
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ari@sto.telkom.co.id', 'teknisi123')}
              className="px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center border border-slate-700 transition-colors"
            >
              🔧 Teknisi (Ari)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('gudang@sto.telkom.co.id', 'gudang123')}
              className="px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center border border-slate-700 transition-colors"
            >
              📦 Gudang
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        &copy; 2026 STO Telkom Akses Payakumbuh &bull; Sistem Informasi Manajemen & WebGIS
      </footer>
    </div>
  );
};

export default LoginPage;
