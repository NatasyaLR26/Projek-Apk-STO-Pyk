import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

function LaporanAudit() {
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/laporan')
      .then((res) => setLaporanList(res.data.laporan))
      .catch(() => setError('Gagal mengambil data laporan'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Riwayat & Laporan Audit</h1>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400">Memuat data...</p>
      ) : laporanList.length === 0 ? (
        <p className="text-gray-400">Belum ada tugas yang selesai.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {laporanList.map((item) => (
            <div key={item.id} className="bg-bg-dark-2 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">ID Tugas: TGS-{String(item.id).padStart(3, '0')}</p>
                  <p className="text-sm text-gray-400">
                    Teknisi: {item.teknisi?.nama_lengkap} | Dibuat oleh: {item.pimpinan?.nama_lengkap}
                  </p>
                  <p className="text-sm text-gray-400">
                    {item.jenis_kerja} — {item.lokasi}
                  </p>
                </div>
                <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Material Keluar Gudang:</p>
                  <ul className="text-sm list-disc list-inside">
                    {item.material_terpakai?.flatMap((m) =>
                      m.detail_permohonan?.map((d, idx) => (
                        <li key={idx}>
                          {d.jumlah_minta} {d.barang?.satuan} — {d.barang?.nama_barang}
                        </li>
                      ))
                    )}
                    {item.material_terpakai?.length === 0 && (
                      <li className="text-gray-500 list-none">Tidak ada material tercatat</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Bukti Foto Lapangan:</p>
                  {item.foto_bukti ? (
                    <a href={item.foto_bukti} target="_blank" rel="noreferrer">
                      <img
                        src={item.foto_bukti}
                        alt="Bukti"
                        className="w-32 h-32 object-cover rounded border border-slate-700"
                      />
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">Tidak ada foto</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LaporanAudit;