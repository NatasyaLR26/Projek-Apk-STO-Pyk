import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';

function DashboardTeknisi() {
  const [tugasList, setTugasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user || user.role !== 'teknisi') {
      navigate('/');
      return;
    }
    fetchTugas();
  }, []);

  const fetchTugas = async () => {
    try {
      const res = await api.get(`/tugas/teknisi/${user.id}`);
      setTugasList(res.data.tugas);
    } catch (err) {
      console.error('Gagal mengambil tugas', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white p-4 max-w-md mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-gray-400 text-sm">Selamat datang,</p>
          <h1 className="text-xl font-bold text-telkom-red">{user?.nama_lengkap}</h1>
        </div>
        <button onClick={handleLogout} className="text-sm text-red-400">
          Keluar
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-3">Tugas Aktif</h2>

      {loading ? (
        <p className="text-gray-400">Memuat...</p>
      ) : tugasList.filter((t) => t.status !== 'Done').length === 0 ? (
        <p className="text-gray-400">Tidak ada tugas aktif saat ini.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tugasList
            .filter((t) => t.status !== 'Done')
            .map((t) => (
              <div key={t.id} className="bg-bg-dark-2 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs bg-info/20 text-info px-2 py-1 rounded">
                    {t.jenis_kerja}
                  </span>
                  <span className="text-xs text-gray-500">ID: TGS-{String(t.id).padStart(3, '0')}</span>
                </div>
                <p className="font-semibold">{t.lokasi}</p>
                <p className="text-sm text-gray-400 mb-3">Status: {t.status}</p>

                <div className="flex flex-col gap-2">
                  <button className="bg-slate-800 text-sm py-2 rounded font-medium">
                    📦 Request Barang ke Gudang
                  </button>
                  <button className="bg-telkom-red text-sm py-2 rounded font-medium">
                    📷 Upload Bukti Selesai
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default DashboardTeknisi;