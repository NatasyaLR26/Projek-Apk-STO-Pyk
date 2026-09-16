import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

function RequestBarangModal({ tugasId, onClose, onSuccess }) {
  const [barangList, setBarangList] = useState([]);
  const [selectedBarang, setSelectedBarang] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [keranjang, setKeranjang] = useState([]); // daftar barang yang mau diminta
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/barang').then((res) => setBarangList(res.data.barang));
  }, []);

  const handleTambah = () => {
    if (!selectedBarang || !jumlah || Number(jumlah) <= 0) {
      setError('Pilih barang dan isi jumlah yang valid');
      return;
    }

    const barang = barangList.find((b) => b.id === Number(selectedBarang));

    setKeranjang([
      ...keranjang,
      { barang_id: barang.id, nama_barang: barang.nama_barang, satuan: barang.satuan, jumlah_minta: Number(jumlah) },
    ]);
    setSelectedBarang('');
    setJumlah('');
    setError('');
  };

  const handleHapusItem = (idx) => {
    setKeranjang(keranjang.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (keranjang.length === 0) {
      setError('Tambahkan minimal 1 barang');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/permohonan', {
        tugas_id: tugasId,
        barang: keranjang.map((k) => ({ barang_id: k.barang_id, jumlah_minta: k.jumlah_minta })),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim permohonan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-dark-2 rounded-xl p-5 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Request Barang ke Gudang</h2>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 mb-3">
          <select
            value={selectedBarang}
            onChange={(e) => setSelectedBarang(e.target.value)}
            className="flex-1 p-2 rounded bg-slate-800 text-white text-sm outline-none"
          >
            <option value="">-- Pilih Barang --</option>
            {barangList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama_barang} (stok: {b.stok} {b.satuan})
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Jml"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="w-16 p-2 rounded bg-slate-800 text-white text-sm outline-none"
          />
          <button
            onClick={handleTambah}
            className="bg-slate-700 text-sm px-3 rounded"
          >
            +
          </button>
        </div>

        {keranjang.length > 0 && (
          <ul className="mb-4 text-sm">
            {keranjang.map((k, idx) => (
              <li key={idx} className="flex justify-between items-center py-1 border-b border-slate-700">
                <span>
                  {k.jumlah_minta} {k.satuan} — {k.nama_barang}
                </span>
                <button onClick={() => handleHapusItem(idx)} className="text-red-400 text-xs">
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded bg-slate-700 text-sm font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 rounded bg-telkom-red text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Mengirim...' : 'Kirim Permohonan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestBarangModal;