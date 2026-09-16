import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import FormTugas from '../components/FormTugas';
import ApprovalMaterial from '../components/ApprovalMaterial';

const menuItems = [
  { key: 'tracking', label: 'WebGIS Tracking' },
  { key: 'tugas', label: 'Tiket Tugas Baru' },
  { key: 'approval', label: 'Approval Material' },
  { key: 'laporan', label: 'Laporan Audit' },
];

function DashboardPimpinan() {
  const [activeMenu, setActiveMenu] = useState('tracking');
  const navigate = useNavigate();

  // proteksi sederhana: kalau belum login atau role bukan pimpinan, lempar ke login
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'pimpinan') {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-bg-dark text-white">
      <Sidebar
        menuItems={menuItems}
        activeMenu={activeMenu}
        onMenuClick={setActiveMenu}
        roleName="Pimpinan STO"
      />

      <div className="flex-1 p-6">
        {activeMenu === 'tracking' && (
          <div>
            <h1 className="text-xl font-bold mb-4">Live Tracking Teknisi</h1>
            <p className="text-gray-400">Peta WebGIS akan ditampilkan di sini.</p>
          </div>
        )}

        {activeMenu === 'tugas' && <FormTugas />}

        {activeMenu === 'approval' && <ApprovalMaterial />} 

        {activeMenu === 'laporan' && (
          <div>
            <h1 className="text-xl font-bold mb-4">Laporan Audit</h1>
            <p className="text-gray-400">Daftar laporan akan ditampilkan di sini.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPimpinan;