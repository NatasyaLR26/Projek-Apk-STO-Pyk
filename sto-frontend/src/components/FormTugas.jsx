import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PlusCircle, CheckCircle2 } from 'lucide-react';

function FormTugas() {
  const { isDark } = useTheme();
  const { createTugas, showToast } = useApp();

  const [jenisKerja, setJenisKerja] = useState('Pasang Baru');
  const [pelangganNama, setPelangganNama] = useState('');
  const [pelangganTelp, setPelangganTelp] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || { id: 1 };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPesan('');
    setSubmitting(true);

    try {
      // 1. Try sending to Backend Express API if active
      await api.post('/tugas', {
        pimpinan_id: user.id,
        teknisi_id: null,
        jenis_kerja: jenisKerja,
        pelanggan_nama: pelangganNama,
        pelanggan_telp: pelangganTelp,
        lokasi,
        keterangan,
        status: 'Open'
      });
    } catch {
      // Continue to local / Supabase sync
    }

    try {
      // 2. Sync to AppContext state and Supabase (SOP 1 - Open Pool)
      await createTugas({
        teknisi_id: null,
        jenis_kerja: jenisKerja,
        pelanggan_nama: pelangganNama || 'Pelanggan STO',
        pelanggan_telp: pelangganTelp || '0812-xxxx-xxxx',
        lokasi,
        keterangan,
        status: 'Open'
      });

      setPesan('Tiket kerja berhasil disiarkan ke seluruh armada teknisi STO Payakumbuh!');
      showToast('Tiket berhasil diumumkan ke pool teknisi!', 'success');
    } catch (err) {
      setError('Gagal menyiarkan tiket: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setSubmitting(false);
      setLokasi('');
      setPelangganNama('');
      setPelangganTelp('');
      setKeterangan('');
    }
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <div className="pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-extrabold flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
            <PlusCircle className="w-5 h-5" />
          </span>
          <span>Buat Tiket Tugas Baru (SOP 1)</span>
        </h1>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Pimpinan membuat tiket kerja lapangan, menentukan prioritas, dan menunjuk teknisi penanggung jawab.
        </p>
      </div>

      {pesan && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{pesan}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Broadcast Info Banner */}
      <div className={`p-4 rounded-2xl border mb-5 ${
        isDark ? 'bg-blue-950/30 border-blue-800/60 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
      } flex items-start gap-3 text-xs`}>
        <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0 text-base">
          📢
        </span>
        <div>
          <div className="font-bold text-sm mb-0.5">SOP Penugasan Tiket Terbuka (Open Pool)</div>
          <p className="opacity-90 leading-relaxed text-[11px]">
            Tiket kerja ini akan disiarkan ke seluruh armada teknisi STO Payakumbuh secara otomatis. 
            Teknisi yang bertugas akan menerima notifikasi dan mengambil tiket melalui portal teknisi mereka.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Jenis Pekerjaan Lapangan
            </label>
            <select
              value={jenisKerja}
              onChange={(e) => setJenisKerja(e.target.value)}
              className={`w-full p-3 rounded-2xl border outline-none transition cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            >
              <option value="Pasang Baru">Pasang Baru (PSB IndiHome)</option>
              <option value="Gangguan">Gangguan (Assurance / Repair)</option>
              <option value="ODP">ODP (Maintenance Tiang / Splitter)</option>
              <option value="Perbaikan Jaringan">Perbaikan Jaringan (Kabel Putus / Redaman)</option>
            </select>
          </div>

          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Status Penugasan
            </label>
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              <span className="font-semibold text-xs">Pool Siaran Terbuka</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Open (Menunggu Diambil)
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Nama Pelanggan / Lokasi STO
            </label>
            <input
              type="text"
              required
              value={pelangganNama}
              onChange={(e) => setPelangganNama(e.target.value)}
              placeholder="Contoh: Bpk. Kurniawan / ODP-PYK-04"
              className={`w-full p-3 rounded-2xl border outline-none transition ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            />
          </div>

          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              No. Handphone / WhatsApp Pelanggan
            </label>
            <input
              type="text"
              value={pelangganTelp}
              onChange={(e) => setPelangganTelp(e.target.value)}
              placeholder="0812-xxxx-xxxx"
              className={`w-full p-3 rounded-2xl border outline-none transition ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            />
          </div>
        </div>

        <div>
          <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Alamat Lengkap / Titik Lapangan (Payakumbuh)
          </label>
          <textarea
            rows={2}
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="Contoh: Jl. Soekarno Hatta No. 45, Koto Nan IV, Payakumbuh Barat"
            className={`w-full p-3 rounded-2xl border outline-none transition ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
            }`}
            required
          />
        </div>

        <div>
          <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Keterangan Masalah / Catatan Teknis untuk Teknisi
          </label>
          <textarea
            rows={2}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Nomor ODP, keluhan redaman tinggi, kabel putus tertabrak, atau instruksi instalasi..."
            className={`w-full p-3 rounded-2xl border outline-none transition ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-900/40 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{submitting ? 'Menyiarkan Tiket...' : '📢 Siarkan Tiket ke Seluruh Teknisi'}</span>
        </button>
      </form>
    </div>
  );
}

export default FormTugas;