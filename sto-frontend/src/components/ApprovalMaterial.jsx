import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

function ApprovalMaterial() {
  const [permohonanList, setPermohonanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  const fetchPermohonan = async () => {
    setLoading(true);
    try {
      const res = await api.get('/permohonan/pending');
      setPermohonanList(res.data.permohonan);
    } catch (err) {
      setError('Gagal mengambil data permohonan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermohonan();
  }, []);

  const handleApprove = async (id) => {
    setPesan('');
    setError('');
    try {
      await api.patch(`/permohonan/${id}/approve`);
      setPesan(`Permohonan #${id} berhasil disetujui, stok telah diperbarui`);
      fetchPermohonan(); // refresh daftar setelah approve
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal approve permohonan');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Approval Permohonan Material</h1>

      {pesan && <p className="text-green-400 text-sm mb-3">{pesan}</p>}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400">Memuat data...</p>
      ) : permohonanList.length === 0 ? (
        <p className="text-gray-400">Tidak ada permohonan yang pending saat ini.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {permohonanList.map((p) => (
            <div key={p.id} className="bg-bg-dark-2 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">Permohonan #{p.id}</p>
                  <p className="text-sm text-gray-400">
                    Tugas ID: {p.tugas_id} — {new Date(p.waktu_request).toLocaleString('id-ID')}
                  </p>
                </div>
                <span className="text-xs bg-pending/20 text-pending px-2 py-1 rounded">
                  {p.status}
                </span>
              </div>

              <ul className="text-sm text-gray-300 mb-3 list-disc list-inside">
                {p.detail_permohonan?.map((d, idx) => (
                  <li key={idx}>
                    {d.jumlah_minta} unit — barang_id: {d.barang_id}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleApprove(p.id)}
                className="bg-success hover:opacity-90 text-white text-sm px-4 py-2 rounded font-semibold"
              >
                ✓ Setujui
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApprovalMaterial;