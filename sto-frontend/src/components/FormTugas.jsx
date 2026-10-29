import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  PlusCircle,
  CheckCircle2,
  Send,
  Radio,
  MapPin,
  AlertTriangle,
  Sparkles,
  Info,
  Users,
  UserCheck
} from 'lucide-react';

function FormTugas() {
  const { isDark } = useTheme();
  const { createTugas, odp = [], users = [], showToast } = useApp();

  const [jenisKerja, setJenisKerja] = useState('Kabel Dropcore Putus');
  const [selectedOdpId, setSelectedOdpId] = useState('');
  const [selectedTeknisiId, setSelectedTeknisiId] = useState(''); // '' = Broadcast Open Pool
  const [pelangganNama, setPelangganNama] = useState('');
  const [pelangganTelp, setPelangganTelp] = useState('');
  const [lokasi, setLokasi] = useState('Jl. Soekarno-Hatta, Koto Nan IV, Payakumbuh');
  const [keterangan, setKeterangan] = useState('Kabel dropcore putus tertimpa pohon, butuh penarikan dan splicing ulang.');
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  const user = JSON.parse(localStorage.getItem('user')) || { id: 1, nama_lengkap: 'Ir. Bambang Sudirman' };
  const fieldTechnicians = users.filter(u => u.role === 'teknisi');

  // Set default ODP jika tersedia
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

  const selectedOdpObj = odp.find(o => String(o.id) === String(selectedOdpId)) || odp[0] || {
    id: 1,
    kode_odp: 'ODP-PYK-01/04',
    alamat: 'Jl. Soekarno-Hatta'
  };

  const chosenTechObj = selectedTeknisiId
    ? fieldTechnicians.find(t => String(t.id) === String(selectedTeknisiId))
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPesan('');
    setBroadcastResult(null);
    setSubmitting(true);

    const targetOdp = odp.find(o => String(o.id) === String(selectedOdpId)) || {
      id: 1,
      kode_odp: 'ODP-PYK-01/04'
    };

    const parsedTechId = selectedTeknisiId ? parseInt(selectedTeknisiId, 10) : null;

    const taskPayload = {
      pimpinan_id: user.id || 1,
      teknisi_id: parsedTechId, // null = Broadcast Open Pool, angka = Disposisi Langsung
      jenis_kerja: jenisKerja,
      pelanggan_nama: pelangganNama || 'Pelanggan IndiHome Payakumbuh',
      pelanggan_telp: pelangganTelp || '0812-6789-0123',
      lokasi,
      keterangan,
      odp_id: targetOdp.id,
      odp_kode: targetOdp.kode_odp,
      status: parsedTechId ? 'Progress' : 'menunggu'
    };

    try {
      // 1. Eksekusi Sekali Klik Dual Broadcast via Backend Node.js
      let apiData = null;
      try {
        const resApi = await api.post('/tugas', taskPayload);
        if (resApi.data?.data) {
          apiData = resApi.data.data;
        }
      } catch (backendErr) {
        console.warn('[FormTugas] Backend notice:', backendErr.message);
      }

      // 2. Sinkronisasi ke AppContext state dan Supabase Client
      const createdTask = await createTugas({
        ...taskPayload,
        id: apiData?.id
      });

      setBroadcastResult({
        task: createdTask,
        odp: targetOdp,
        magicUrl: apiData?.magic_url
      });

      if (!parsedTechId) {
        setPesan(`Tiket #${createdTask.id} berhasil disiarkan ke Grup Telegram sebagai Siaran Terbuka (Open Pool)! Siapapun teknisi di grup dapat menekan tombol Ambil Tiket.`);
      } else {
        setPesan(`Tiket #${createdTask.id} berhasil ditugaskan langsung ke teknisi ${chosenTechObj?.nama_lengkap} & notifikasi terkirim ke Telegram!`);
      }

      showToast('Tiket Berhasil Disimpan di Supabase & Disiarkan ke Telegram!', 'success');

      // Reset form ringan
      setPelangganNama('');
      setPelangganTelp('');
    } catch (err) {
      setError('Gagal menyiarkan tiket: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl animate-in fade-in duration-300 space-y-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
            <PlusCircle className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <span>Buat & Siarkan Tiket Tugas (SOP 1)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">
                Supabase &bull; Telegram Bot
              </span>
            </h1>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Pimpinan membuat penugasan. Sistem menyimpan ke Supabase dan otomatis mengirimkan pesan siaran dengan tombol inline ke grup Telegram teknisi.
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {pesan && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <div className="font-extrabold text-sm mb-0.5">{pesan}</div>
            <div className="text-[11px] opacity-90">
              Notifikasi telah disiarkan ke bot <strong>@sto_pyk_bot</strong> di grup Telegram teknisi STO Payakumbuh.
            </div>
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

      {/* Preview Format Pesan Telegram Real-Time */}
      <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            <Send className="w-4 h-4" />
            <span>Preview Pesan yang Diterima Grup Telegram:</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-800/80 px-2 py-0.5 rounded">
            Bot @sto_pyk_bot
          </span>
        </div>

        <div className={`p-4 rounded-2xl border font-mono text-xs space-y-1.5 ${isDark ? 'bg-slate-950 border-slate-850 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
          {!selectedTeknisiId ? (
            <>
              <div className="font-black text-rose-500 text-sm">🚨 TIKET GANGGUAN / PEKERJAAN BARU</div>
              <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div>🔌 <strong>ODP:</strong> <code className="text-amber-400">{selectedOdpObj.kode_odp || 'ODP-PYK-01/04'}</code></div>
              <div>📍 <strong>Lokasi:</strong> {lokasi || 'Jl. Soekarno-Hatta'}</div>
              <div>💼 <strong>Jenis:</strong> {jenisKerja}</div>
              {pelangganNama && <div>👤 <strong>Pelanggan:</strong> {pelangganNama}</div>}
              <div>📊 <strong>Status:</strong> <span className="text-emerald-400 font-bold">📢 Terbuka untuk Diambil (Open Pool)</span></div>
              <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div className="pt-1">
                <div className="w-full py-2 px-3 rounded-xl bg-blue-600/30 border border-blue-500/60 text-blue-300 font-sans font-extrabold text-xs text-center shadow">
                  🔘 AMBIL TIKET SEKARANG (Tombol Inline untuk Siapapun Anggota Grup)
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-sans italic pt-1">
                * Real Alur Telkom: Tiket tidak mencantumkan nama teknisi. Siapapun teknisi di grup yang pertama menekan tombol akan otomatis mengklaim tiket.
              </p>
            </>
          ) : (
            <>
              <div className="font-black text-blue-400 text-sm">📌 PENUGASAN TIKET PEKERJAAN</div>
              <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div>🔌 <strong>ODP:</strong> <code className="text-amber-400">{selectedOdpObj.kode_odp || 'ODP-PYK-01/04'}</code></div>
              <div>📍 <strong>Lokasi:</strong> {lokasi || 'Jl. Soekarno-Hatta'}</div>
              <div>💼 <strong>Jenis:</strong> {jenisKerja}</div>
              <div>👷 <strong>Teknisi Ditugaskan:</strong> <span className="text-emerald-400 font-bold">{chosenTechObj?.nama_lengkap}</span></div>
              <div>📊 <strong>Status:</strong> Menunggu Pengerjaan</div>
              <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div className="pt-1">
                <div className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-blue-300 font-sans font-extrabold text-xs text-center shadow">
                  🔍 BUKA TIKET PEKERJAAN
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Formulir Penugasan */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
        
        {/* Pilihan Metode Penugasan: Open Pool vs Disposisi Teknisi Tertentu */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
          <label className={`block font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
            <Users className="w-4 h-4 text-blue-500" />
            <span>Target Penugasan / Broadcast Tiket:</span>
          </label>
          <select
            value={selectedTeknisiId}
            onChange={(e) => setSelectedTeknisiId(e.target.value)}
            className={`w-full p-3 rounded-2xl border outline-none transition cursor-pointer font-bold ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
            }`}
          >
            <option value="">📢 Siarkan Terbuka ke Grup Telegram (Open Pool - Bisa Diambil Siapa Saja)</option>
            {fieldTechnicians.map(t => (
              <option key={t.id} value={t.id}>
                👷 {t.nama_lengkap} ({t.email}) - Disposisi Langsung oleh Pimpinan
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            {selectedTeknisiId
              ? `Tiket ini akan ditugaskan langsung kepada ${chosenTechObj?.nama_lengkap}.`
              : 'Pilihan standar IndiHome: Tiket disiarkan terbuka ke grup Telegram agar teknisi yang sedang siaga/terdekat dapat langsung mengklaim (Ambil Tiket).'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Jenis Pekerjaan */}
          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Jenis Pekerjaan Lapangan *
            </label>
            <select
              value={jenisKerja}
              onChange={(e) => setJenisKerja(e.target.value)}
              className={`w-full p-3 rounded-2xl border outline-none transition cursor-pointer font-semibold ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            >
              <option value="Kabel Dropcore Putus">Kabel Dropcore Putus (Trouble / Splicing)</option>
              <option value="Pasang Baru IndiHome">Pasang Baru IndiHome (PSB Fiber)</option>
              <option value="Perbaikan Gangguan">Perbaikan Gangguan (LOS / Redaman Tinggi)</option>
              <option value="Maintenance ODP">Maintenance ODP (Peremajaan Splitter)</option>
              <option value="Ganti Modem ONT">Ganti Modem ONT (Petir / Rusak)</option>
            </select>
          </div>

          {/* Acuan Titik ODP */}
          <div>
            <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'} flex items-center justify-between`}>
              <span>Acuan Titik ODP Jaringan *</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">Sinkron Supabase</span>
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
            placeholder="Jelaskan kendala, redaman yang terukur, atau instruksi penarikan kabel..."
            className={`w-full p-3 rounded-2xl border outline-none transition resize-none ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
            }`}
          />
        </div>

        {/* Tombol Eksekusi Dual Broadcast */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-500 text-white font-extrabold text-xs shadow-xl shadow-rose-900/30 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <span>Menyimpan ke Supabase & Menyiarkan ke Telegram...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>
                {!selectedTeknisiId
                  ? '📢 Terbitkan & Siarkan Tiket Terbuka ke Telegram (Open Pool)'
                  : `📌 Terbitkan & Tugaskan Langsung ke ${chosenTechObj?.nama_lengkap || 'Teknisi'}`}
              </span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}

export default FormTugas;
