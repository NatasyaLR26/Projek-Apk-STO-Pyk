import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

function FormTugas() {
  const [teknisiList, setTeknisiList] = useState([]);
  const [teknisiId, setTeknisiId] = useState('');
  const [jenisKerja, setJenisKerja] = useState('Pasang Baru');
  const [lokasi, setLokasi] = useState('');
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    api.get('/auth/teknisi').then((res) => {
      setTeknisiList(res.data.teknisi);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPesan('');

    try {
      await api.post('/tugas', {
        pimpinan_id: user.id,
        teknisi_id: teknisiId,
        jenis_kerja: jenisKerja,
        lokasi,
      });

      setPesan('Tugas berhasil dibuat!');
      setLokasi('');
      setTeknisiId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat tugas');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Buat Tiket Tugas</h1>

      <form onSubmit={handleSubmit} className="max-w-md flex flex-col gap-4">
        {pesan && <p className="text-green-400 text-sm">{pesan}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div>
          <label className="text-sm text-gray-400">Pilih Teknisi</label>
          <select
            value={teknisiId}
            onChange={(e) => setTeknisiId(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-slate-800 text-white outline-none"
            required
          >
            <option value="">-- Pilih Teknisi --</option>
            {teknisiList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama_lengkap}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-400">Jenis Pekerjaan</label>
          <select
            value={jenisKerja}
            onChange={(e) => setJenisKerja(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-slate-800 text-white outline-none"
          >
            <option value="Pasang Baru">Pasang Baru</option>
            <option value="Gangguan">Gangguan</option>
            <option value="ODP">ODP</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-400">Lokasi Pelanggan</label>
          <input
            type="text"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="Contoh: Jl. Sudirman No. 45"
            className="w-full mt-1 p-2 rounded bg-slate-800 text-white outline-none"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-telkom-red hover:opacity-90 text-white py-2 rounded font-semibold mt-2"
        >
          Buat Tugas
        </button>
      </form>
    </div>
  );
}

export default FormTugas;