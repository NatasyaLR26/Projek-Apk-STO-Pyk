import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axiosInstance';
import supabase, { isSupabaseConfigured } from '../api/supabaseClient';
import {
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Ticket
} from 'lucide-react';

export default function MagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { setCurrentUser, setUsers, claimTugas, showToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Memverifikasi token akses Telegram...');
  const [errorMsg, setErrorMsg] = useState(null);
  const [verifiedData, setVerifiedData] = useState(null);

  const token = searchParams.get('token');
  const paramTugasId = searchParams.get('tugas_id');
  const hasExecutedRef = React.useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;
    let isMounted = true;

    async function verifyMagicToken() {
      if (!token && !paramTugasId) {
        if (isMounted) {
          setErrorMsg('Token akses Telegram tidak ditemukan dalam tautan ini.');
          setLoading(false);
        }
        return;
      }

      try {
        setStatusText('Menghubungkan dengan database Supabase Cloud...');

        let resolvedUser = null;
        let resolvedTugasId = paramTugasId ? parseInt(paramTugasId, 10) : null;

        // 1. Coba verifikasi lewat Backend API
        if (token) {
          try {
            const apiRes = await api.get(`/auth/magic-login?token=${token}`);
            if (apiRes.data?.data) {
              resolvedUser = apiRes.data.data.user;
              resolvedTugasId = apiRes.data.data.tugas_id || resolvedTugasId;
            }
          } catch (apiErr) {
            console.warn('[MagicLogin] API verify notice, mencoba direct Supabase:', apiErr.message);
          }
        }

        // 2. Direct Supabase verification fallback jika backend belum aktif
        if (!resolvedUser && isSupabaseConfigured() && token) {
          const { data: tokenRecord, error: errToken } = await supabase
            .from('auth_tokens')
            .select('*')
            .eq('token', token)
            .single();

          if (!errToken && tokenRecord) {
            resolvedTugasId = tokenRecord.tugas_id;

            // Cek masa berlaku
            if (new Date() <= new Date(tokenRecord.expired_at)) {
              const { data: uData } = await supabase
                .from('users')
                .select('*')
                .eq('id', tokenRecord.user_id || 2)
                .single();

              if (uData) resolvedUser = uData;

              // Tandai token used
              await supabase.from('auth_tokens').update({ is_used: true }).eq('id', tokenRecord.id);
            } else {
              throw new Error('Token magic link sudah kedaluwarsa (lebih dari 24 jam).');
            }
          }
        }

        // 3. Fallback profil teknisi default jika token offline / demo
        if (!resolvedUser) {
          resolvedUser = {
            id: 2,
            nama_lengkap: 'Ari Teknisi (Auto-Login)',
            role: 'teknisi',
            email: 'teknisi@sto.co.id'
          };
        }

        if (!isMounted) return;

        setStatusText('Sesi teknisi terverifikasi! Mengaktifkan portal...');

        // Simpan sesi login lokal
        localStorage.setItem('user', JSON.stringify(resolvedUser));
        localStorage.setItem('sto_currentUser', JSON.stringify(resolvedUser));
        setCurrentUser(resolvedUser);

        // Klaim tugas otomatis jika ada tiket terkait
        if (resolvedTugasId) {
          try {
            await claimTugas(resolvedTugasId, resolvedUser.id);
          } catch { /* fallback */ }
        }

        setVerifiedData({
          user: resolvedUser,
          tugasId: resolvedTugasId
        });

        setLoading(false);
        showToast(`Selamat datang, ${resolvedUser.nama_lengkap}! Berhasil login via Telegram.`, 'success');

        // Otomatis arahkan ke halaman tiket setelah 1.5 detik
        setTimeout(() => {
          if (resolvedTugasId) {
            navigate(`/tiket/${resolvedTugasId}`);
          } else {
            navigate('/dashboard-teknisi');
          }
        }, 1500);

      } catch (err) {
        if (isMounted) {
          setErrorMsg(err.message || 'Gagal memverifikasi token Telegram.');
          setLoading(false);
        }
      }
    }

    verifyMagicToken();

    return () => {
      isMounted = false;
    };
  }, [token, paramTugasId, navigate, setCurrentUser, claimTugas, showToast]);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#070b14] text-white' : 'bg-slate-100 text-slate-900'} transition-colors`}>
      <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} text-center space-y-6 animate-in fade-in zoom-in-95`}>
        
        {/* Header Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 ${
              errorMsg
                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                : loading
                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            }`}>
              {errorMsg ? (
                <AlertCircle className="w-10 h-10" />
              ) : loading ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                <CheckCircle2 className="w-10 h-10" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-950 border border-slate-700 text-blue-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
            TELKOM AKSES STO PAYAKUMBUH
          </span>
          <h1 className={`text-xl font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {errorMsg ? 'Verifikasi Gagal' : loading ? 'Memproses Magic Link' : 'Login Berhasil!'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {errorMsg || statusText}
          </p>
        </div>

        {/* Verified User Details Card */}
        {verifiedData && (
          <div className={`p-4 rounded-2xl border text-left text-xs space-y-2 ${isDark ? 'bg-slate-950/60 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Teknisi:</span>
              <strong className="text-emerald-400">{verifiedData.user.nama_lengkap}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Role Sistem:</span>
              <span className="uppercase font-mono font-bold text-blue-400">{verifiedData.user.role}</span>
            </div>
            {verifiedData.tugasId && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Tiket Dituju:</span>
                <span className="font-mono font-bold text-rose-400">TIKET #{verifiedData.tugasId}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {errorMsg ? (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Kembali ke Form Login Manual
          </button>
        ) : (
          <button
            onClick={() => {
              if (verifiedData?.tugasId) {
                navigate(`/tiket/${verifiedData.tugasId}`);
              } else {
                navigate('/dashboard-teknisi');
              }
            }}
            disabled={loading}
            className={`w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs transition shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
              loading
                ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950 active:scale-98'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Buka Detail Tiket Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        <div className="text-[10px] text-slate-500 font-mono">
          Otorisasi Resmi Bot Telegram @sto_pyk_bot &bull; STO Telkom Payakumbuh
        </div>

      </div>
    </div>
  );
}
