import { useState } from 'react';
import api from '../api/axiosInstance';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Camera, Upload, X, CheckCircle2 } from 'lucide-react';

const SAMPLE_FIELD_PHOTOS = [
  { label: 'Instalasi ONT Baru', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80' },
  { label: 'Perapihan ODP Tiang', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80' },
  { label: 'Splicing Kabel FO', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80' },
];

function UploadBuktiModal({ tugasId, onClose, onSuccess }) {
  const { isDark } = useTheme();
  const { finishTugas } = useApp();

  const [preview, setPreview] = useState(SAMPLE_FIELD_PHOTOS[0].url);
  const [file, setFile] = useState(null);
  const [catatan, setCatatan] = useState('Redaman optik normal (-18.5 dBm), koneksi stabil, pelanggan puas.');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
  };

  const handleChooseSample = (url) => {
    setPreview(url);
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!preview) {
      setError('Pilih atau unggah foto bukti pekerjaan');
      return;
    }

    setSubmitting(true);
    setError('');

    if (file) {
      const formData = new FormData();
      formData.append('foto', file);
      try {
        await api.patch(`/tugas/${tugasId}/selesai`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch {
        // Offline fallback
      }
    }

    // Always update AppContext state (SOP 6)
    finishTugas(tugasId, preview, catatan);
    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className={`rounded-3xl p-6 w-full max-w-md border shadow-2xl transition-all ${
        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">Upload Bukti Kerja Selesai (SOP 6)</h2>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tiket Tugas #{tugasId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs mb-3 font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          {/* Photo Preview Card */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Foto Bukti Lapangan:</label>
            <div className={`border-2 border-dashed rounded-2xl overflow-hidden relative ${
              isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-slate-50'
            }`}>
              {preview ? (
                <div className="relative h-44 w-full">
                  <img src={preview} alt="Bukti" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] text-white font-mono flex items-center gap-1">
                    <Camera className="w-3 h-3 text-emerald-400" />
                    <span>Kamera STO</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-400 text-xs">Klik untuk pilih foto kamera/file</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Presets for easy demo */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Contoh Dokumentasi STO Cepat:
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              {SAMPLE_FIELD_PHOTOS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChooseSample(sample.url)}
                  className={`p-1.5 rounded-xl border truncate transition cursor-pointer text-center ${
                    preview === sample.url
                      ? 'bg-rose-600 text-white border-rose-500 font-bold'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* File Input */}
          <label className={`block py-2 px-3 rounded-xl border text-center cursor-pointer transition ${
            isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}>
            <span className="font-semibold text-xs">Pilih Foto Sendiri dari Perangkat</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          </label>

          {/* Completion Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Catatan Hasil Penanganan:</label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Pengukuran dBm, status lampu modem, konfirmasi pelanggan..."
              className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950 transition cursor-pointer active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Menyimpan...' : 'Selesaikan Tugas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadBuktiModal;