import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModernSidebar from '../components/ModernSidebar';
import FormTugas from '../components/FormTugas';
import ApprovalMaterial from '../components/ApprovalMaterial';
import LaporanAudit from '../components/LaporanAudit';
import WebGISTracking from '../components/WebGISTracking';
import KelolaPegawai from '../components/KelolaPegawai';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Package,
  MapPin,
  ArrowRight
} from 'lucide-react';

function DashboardPimpinan() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { tugas, permohonan, barang, users, trackingGps } = useApp();

  // Proteksi sesi pimpinan
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'pimpinan') {
      navigate('/');
    }
  }, [navigate]);

  // KPI Calculations
  const totalTasks = tugas.length;
  const progressTasks = tugas.filter(t => t.status === 'Progress').length;
  const doneTasks = tugas.filter(t => t.status === 'Done').length;
  const pendingRequests = permohonan.filter(p => p.status === 'Pending').length;
  const totalBarangCount = barang.length;
  const lowStockCount = barang.filter(b => b.stok <= 20).length;
  const activeTechCount = trackingGps.length;

  return (
    <div className={`min-h-screen flex ${
      isDark ? 'bg-[#0a0f1d] text-white' : 'bg-slate-50 text-slate-900'
    } transition-colors duration-300`}>
      
      {/* Left Sidebar Layout (Persistent, Collapsible, No Blur!) */}
      <ModernSidebar activeTab={activeMenu} onTabChange={setActiveMenu} />

      {/* Main Content Area beside Sidebar */}
      <main className="flex-1 min-w-0 flex flex-col lg:pl-72 transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          
          {/* Header Banner */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-burgundy-600/20 text-burgundy-400 border border-burgundy-500/30">
                  COMMAND CENTER PIMPINAN
                </span>
                <span className="text-xs text-slate-400 font-mono">STO Telkom Payakumbuh (Koto Nan IV)</span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeMenu === 'dashboard' && 'Dashboard Lengkap & Ringkasan Operasional'}
                {activeMenu === 'tracking' && 'Pusat Kendali Pelacakan WebGIS Real-Time'}
                {activeMenu === 'approval' && 'Persetujuan (Approval) Material Teknisi'}
                {activeMenu === 'laporan-kerja' && 'Laporan Audit & Berita Acara Pekerjaan Lapangan'}
                {activeMenu === 'laporan-gudang' && 'Laporan & Pengawasan Stok Material Gudang'}
                {activeMenu === 'kelola-pegawai' && 'Kelola Akun & Hak Akses Pegawai STO'}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                Sistem Koordinasi Penugasan Teknisi, Verifikasi Logistik, dan Monitoring Lapangan.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-burgundy-600 hover:bg-burgundy-700 text-white font-bold text-xs shadow-lg shadow-burgundy-600/30 transition cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Tiket Baru (SOP 1)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: DASHBOARD LENGKAP */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* KPI Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tiket</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mt-2">{totalTasks}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Semua wilayah STO</div>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Dalam Progress</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-blue-500 mt-2">{progressTasks}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Teknisi aktif di lapangan</div>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Selesai (Done)</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-500 mt-2">{doneTasks}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tervalidasi foto bukti</div>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Approval Pending</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-500 mt-2">{pendingRequests}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Menunggu otorisasi pimpinan</div>
                </div>
              </div>

              {/* Quick Action & Field Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Live Technician Fleet Radar Card */}
                <div className={`lg:col-span-2 p-5 sm:p-6 rounded-3xl border ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Armada Teknisi Lapangan Online ({activeTechCount})
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveMenu('tracking')}
                      className="text-xs text-burgundy-500 hover:text-burgundy-400 font-bold flex items-center gap-1"
                    >
                      <span>Buka WebGIS Lengkap</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'} mt-3`}>
                    {trackingGps.map(gps => {
                      const tech = users.find(u => u.id === gps.teknisi_id);
                      const currentTask = tugas.find(t => t.id === gps.tugas_id);
                      return (
                        <div key={gps.id} className="py-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center font-bold">
                              {tech?.nama_lengkap?.charAt(0) || 'T'}
                            </div>
                            <div>
                              <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tech?.nama_lengkap}</div>
                              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Sedang mengerjakan: <span className={isDark ? 'text-slate-200' : 'text-slate-900 font-semibold'}>#{gps.tugas_id} - {currentTask?.jenis_kerja || 'Tugas'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              {gps.kecepatan}
                            </span>
                            <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 font-mono`}>
                              Akurasi: {gps.akurasi}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Warehouse Inventory Glance */}
                <div className={`p-6 rounded-3xl border transition-all ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 shadow-xl'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-500" />
                      <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Logistik Gudang
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveMenu('laporan-gudang')}
                      className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1"
                    >
                      <span>Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3 mt-4 text-xs">
                    <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} border flex items-center justify-between`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Total Jenis Barang</span>
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalBarangCount} SKU</span>
                    </div>

                    <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} border flex items-center justify-between`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Stok Kritis (≤ 20)</span>
                      <span className="font-bold text-rose-500 dark:text-rose-400">{lowStockCount} Item</span>
                    </div>

                    <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} border flex items-center justify-between`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Permohonan Pending</span>
                      <span className="font-bold text-amber-500 dark:text-amber-400">{pendingRequests} Permintaan</span>
                    </div>

                    <button
                      onClick={() => setActiveMenu('approval')}
                      className="w-full mt-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
                    >
                      Tinjau Approval Material Sekarang
                    </button>
                  </div>
                </div>

              </div>

              {/* Task Table Summary */}
              <div className={`p-6 rounded-3xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Daftar Tiket Tugas Lapangan Terkini
                  </h2>
                  <button
                    onClick={() => setActiveMenu('laporan-kerja')}
                    className="text-xs text-burgundy-500 hover:text-burgundy-400 font-bold"
                  >
                    Lihat Semua Laporan
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <thead className={`${isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
                      <tr>
                        <th className="px-3 py-2.5">ID Tiket</th>
                        <th className="px-3 py-2.5">Jenis Pekerjaan</th>
                        <th className="px-3 py-2.5">Pelanggan & Lokasi</th>
                        <th className="px-3 py-2.5">Teknisi</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {tugas.slice(0, 5).map(t => {
                        const tech = users.find(u => u.id === t.teknisi_id);
                        return (
                          <tr key={t.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-2.5 font-bold font-mono">#{t.id}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                t.jenis_kerja === 'Pasang Baru' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' :
                                t.jenis_kerja === 'Gangguan' ? 'bg-burgundy-600/20 text-burgundy-400 border-burgundy-500/30' :
                                'bg-purple-600/20 text-purple-400 border-purple-500/30'
                              }`}>
                                {t.jenis_kerja}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.pelanggan_nama}</div>
                              <div className="text-[10px] text-slate-400">{t.lokasi}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              {tech ? (
                                <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{tech.nama_lengkap}</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                  📢 Pool Terbuka
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'Done' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                t.status === 'Progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PUSAT KENDALI WEBGIS */}
          {activeMenu === 'tracking' && (
            <div className="animate-in fade-in duration-200">
              <WebGISTracking />
            </div>
          )}

          {/* TAB 3: PERMOHONAN DARI TEKNISI (APPROVAL MATERIAL) */}
          {activeMenu === 'approval' && (
            <div className="animate-in fade-in duration-200">
              <ApprovalMaterial />
            </div>
          )}

          {/* TAB 4: LAPORAN KERJA LAPANGAN */}
          {activeMenu === 'laporan-kerja' && (
            <div className="animate-in fade-in duration-200">
              <LaporanAudit />
            </div>
          )}

          {/* TAB 5: LAPORAN BARANG DARI GUDANG */}
          {activeMenu === 'laporan-gudang' && (
            <div className={`p-6 sm:p-8 rounded-3xl border ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            } space-y-6 animate-in fade-in duration-200`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Laporan Monitoring Inventaris & Logistik Gudang
                  </h2>
                  <p className="text-xs text-slate-400">
                    Pengawasan ketersediaan material jaringan fiber optik, status stok kritis, dan riwayat mutasi barang.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    Total: {barang.length} Material
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-burgundy-500/20 text-burgundy-400 text-xs font-bold border border-burgundy-500/30">
                    Kritis: {lowStockCount} Item
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <thead className={`${isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
                    <tr>
                      <th className="px-4 py-3">Kode SKU</th>
                      <th className="px-4 py-3">Nama Material</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3 text-right">Stok Fisik</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 text-center">Status Gudang</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {barang.map(item => {
                      const isCritical = item.stok <= 20;
                      return (
                        <tr key={item.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-3 font-mono text-slate-400">{item.kode || `MAT-0${item.id}`}</td>
                          <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.nama_barang}</td>
                          <td className="px-4 py-3 text-slate-400">{item.kategori}</td>
                          <td className="px-4 py-3 text-right font-bold text-sm">
                            <span className={isCritical ? 'text-rose-500' : 'text-emerald-500'}>
                              {item.stok.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{item.satuan}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {isCritical ? 'Perlu Restock' : 'Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: KELOLA AKUN & PEGAWAI */}
          {activeMenu === 'kelola-pegawai' && (
            <div className="animate-in fade-in duration-200">
              <KelolaPegawai />
            </div>
          )}

        </div>
      </main>

      {/* Modal: Buat Tiket Tugas Baru (SOP 1) */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 ${
            isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-900'
          } shadow-2xl relative`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-burgundy-500" />
                Buat & Siarkan Tiket Kerja Terbuka (SOP 1)
              </h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <FormTugas onCreated={() => setShowCreateTaskModal(false)} />
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardPimpinan;