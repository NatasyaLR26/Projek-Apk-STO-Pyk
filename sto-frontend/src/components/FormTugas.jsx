import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Send,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

function FormTugas({ onCreated }) {
  const { isDark } = useTheme();
  const { createTugas, odp = [], users = [], showToast } = useApp();

  const [jenisKerja, setJenisKerja] = useState('Pasang Baru');
  const [selectedTeknisiId, setSelectedTeknisiId] = useState('99');
  const [selectedOdpId, setSelectedOdpId] = useState('');
  const [pelangganNama, setPelangganNama] = useState('');
  const [pelangganTelp, setPelangganTelp] = useState('');
  const [lokasi, setLokasi] = useState('Jl. Soekarno-Hatta, Koto Nan IV, Payakumbuh');
  const [keterangan, setKeterangan] = useState(''); // Kosongkan secara default sesuai instruksi

  const handleJenisKerjaChange = (newVal) => {
    setJenisKerja(newVal);
  };
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || { id: 1, nama_lengkap: 'Ir. Bambang Sudirman' };

  // Set default ODP jika data ODP telah termuat
  useEffect(() => {
    if (odp.length > 0 && !selectedOdpId) {
      setSelectedOdpId(String(odp[0].id));
      if (odp[0].alamat || odp[0].nama_lokasi) {
        setLokasi(odp[0].alamat || odp[0].nama_lokasi);
      }
    }
  }, [odp, selectedOdpId]);

  // Handle pergantian ODP terpilih
  const handleOdpChange = (e) => {
    const odpId = e.target.value;
    setSelectedOdpId(odpId);
    const chosenOdp = odp.find(o => String(o.id) === String(odpId));
    if (chosenOdp && (chosenOdp.alamat || chosenOdp.nama_lokasi)) {
      setLokasi(chosenOdp.alamat || chosenOdp.nama_lokasi);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Cegah double submit dari klik cepat

    setError('');
    setPesan('');
    setIsSubmitting(true);

    const targetOdp = odp.find(o => String(o.id) === String(selectedOdpId)) || {
      id: 1,
      kode_odp: 'ODP-PYK-01/04'
    };

    const assignedId = selectedTeknisiId && selectedTeknisiId !== '99' ? Number(selectedTeknisiId) : 99;
    const taskPayload = {
      pimpinan_id: user.id || 1,
      teknisi_id: assignedId,
      jenis_kerja: jenisKerja,
      pelanggan_nama: pelangganNama || 'Pelanggan IndiHome Payakumbuh',
      pelanggan_telp: pelangganTelp || '0812-6789-0123',
      lokasi,
      keterangan,
      odp_id: targetOdp.id,
      odp_kode: targetOdp.kode_odp,
      status: 'menunggu'
    };

    try {
      // Eksekusi Sekali: createTugas menangani sinkronisasi backend, Telegram, dan Supabase secara cepat
      const createdTask = await createTugas(taskPayload);

      setPesan(`Tiket #${createdTask.id} berhasil diterbitkan & disiarkan secara instan ke seluruh teknisi lapangan!`);
      showToast('Tiket Berhasil Diterbitkan & Disiarkan Realtime!', 'success');

      // Reset form
      setPelangganNama('');
      setPelangganTelp('');
      setKeterangan('');

      if (typeof onCreated === 'function') {
        onCreated(createdTask);
      }
    } catch (err) {
      setError('Gagal menyiarkan tiket: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl animate-in fade-in duration-300 space-y-4">
      {/* Success Banner */}
      {pesan && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <div className="font-extrabold text-sm">{pesan}</div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulir Penugasan */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Jenis Pekerjaan */}
          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Jenis Pekerjaan Lapangan *
            </label>
            <select
              value={jenisKerja}
              onChange={(e) => handleJenisKerjaChange(e.target.value)}
              className={`w-full p-3 rounded-2xl border outline-none transition cursor-pointer font-semibold ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            >
              <option value="Pasang Baru">Pasang Baru (PSB IndiHome Fiber)</option>
              <option value="Perbaikan Gangguan">Perbaikan Gangguan (LOS / Redaman Tinggi)</option>
              <option value="Kabel Dropcore Putus">Kabel Dropcore Putus (Trouble / Splicing)</option>
              <option value="Ganti Modem ONT">Ganti Modem ONT (Petir / Rusak)</option>
              <option value="Maintenance Jaringan">Maintenance Jaringan / ODP</option>
            </select>
          </div>

          {/* Acuan Titik ODP */}
          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Acuan Titik ODP Jaringan *
            </label>
            <select
              value={selectedOdpId}
              onChange={handleOdpChange}
              className={`w-full p-3 rounded-2xl border outline-none transition cursor-pointer font-mono font-bold ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-amber-400 focus:border-rose-500'
                  : 'bg-white border-slate-300 text-amber-600 focus:border-rose-500'
              }`}
            >
              {odp.map(o => (
                <option key={o.id} value={o.id}>
                  {o.kode_odp} - {o.alamat || o.nama_lokasi} (Sisa Port: {(Number(o.kapasitas_port) || 8) - (Number(o.port_terpakai) || 0)})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Teknisi Ditugaskan (Pilihan Terbuka / Khusus) */}
        <div>
          <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Teknisi Lapangan yang Ditugaskan *
          </label>
          <select
            value={selectedTeknisiId}
            onChange={(e) => setSelectedTeknisiId(e.target.value)}
            className={`w-full p-3 rounded-2xl border outline-none transition cursor-pointer font-semibold ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
            }`}
          >
            <option value="99">📢 Siaga Terbuka (Siapapun Teknisi Lapangan Dapat Mengambil Tiket)</option>
            {users.filter(u => u.role === 'teknisi' && Number(u.id) !== 99).map(tech => (
              <option key={tech.id} value={tech.id}>
                👷 {tech.nama_lengkap} ({tech.email})
              </option>
            ))}
          </select>
        </div>

        {/* Lokasi / Alamat */}
        <div>
          <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Lokasi / Alamat Pemasangan &bull; Payakumbuh *
          </label>
          <div className="relative">
            <textarea
              required
              rows={2}
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              placeholder="Contoh: Jl. Soekarno-Hatta No. 12, Koto Nan IV, Payakumbuh"
              className={`w-full p-3 pl-9 rounded-2xl border outline-none transition resize-none ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            />
            <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3.5" />
          </div>
        </div>

        {/* Identitas Pelanggan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Nama Lengkap Pelanggan
            </label>
            <input
              type="text"
              value={pelangganNama}
              onChange={(e) => setPelangganNama(e.target.value)}
              placeholder="Contoh: Bpk. Rian Hidayat"
              className={`w-full p-3 rounded-2xl border outline-none transition ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            />
          </div>

          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              value={pelangganTelp}
              onChange={(e) => setPelangganTelp(e.target.value)}
              placeholder="Contoh: 0812-3456-7890"
              className={`w-full p-3 rounded-2xl border outline-none transition ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            />
          </div>
        </div>

        {/* Catatan / Keterangan Penugasan */}
        <div>
          <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Instruksi / Catatan Pekerjaan Lapangan
          </label>
          <textarea
            rows={2}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Tuliskan catatan khusus pekerjaan jika ada (opsional)..."
            className={`w-full p-3 rounded-2xl border outline-none transition resize-none ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
            }`}
          />
        </div>

        {/* Tombol Terbitkan Tiket ke Telegram */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-500 text-white font-extrabold text-xs shadow-xl shadow-rose-900/30 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span>Menyimpan & Menyiarkan Tiket Realtime...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>🚀 Terbitkan Tiket (Siarkan ke Aplikasi & Telegram)</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}

export default FormTugas;
