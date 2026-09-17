import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModernSidebar from '../components/ModernSidebar';
import InputBarangGudang from '../components/InputBarangGudang';
import CetakSuratJalan from '../components/CetakSuratJalan';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  CheckCircle2,
  Edit2,
  Trash2,
  Search,
  TrendingDown,
  Send,
  Boxes,
  ClipboardCheck
} from 'lucide-react';

export default function GudangDashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const {
    barang,
    permohonan,
    detailPermohonan,
    tugas,
    users,
    releaseMaterial,
    updateBarang,
    deleteBarang,
    showToast
  } = useApp();

  const user = JSON.parse(localStorage.getItem('user')) || { id: 4, nama_lengkap: 'Siti Rahmawati', role: 'gudang' };

  const [activeMenu, setActiveMenu] = useState('output-barang'); // 'input-barang' | 'output-barang' | 'laporan-detail' | 'cetak-surat-jalan'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [editingItem, setEditingItem] = useState(null);

  // Form State for Add / Edit
  const [barangForm, setBarangForm] = useState({
    nama_barang: '',
    stok: 10,
    satuan: 'pcs',
    kategori: 'Aksesoris',
    kode: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'gudang') {
      navigate('/');
    }
  }, [navigate]);

  // Approved Permohonan awaiting release from warehouse (SOP 4)
  const approvedRequests = permohonan.filter(p => p.status === 'Approved').map(p => {
    const parentTask = tugas.find(t => t.id === p.tugas_id);
    const tech = users.find(u => u.id === parentTask?.teknisi_id);
    const details = detailPermohonan.filter(d => d.permohonan_id === p.id).map(d => {
      const item = barang.find(b => b.id === d.barang_id);
      return {
        ...d,
        item,
        isStockEnough: item ? item.stok >= d.jumlah_minta : false
      };
    });

    const canRelease = details.every(d => d.isStockEnough);

    return {
      ...p,
      parentTask,
      tech,
      details,
      canRelease
    };
  });

  // Released history
  const releasedRequests = permohonan.filter(p => p.status === 'Released').map(p => {
    const parentTask = tugas.find(t => t.id === p.tugas_id);
    const tech = users.find(u => u.id === parentTask?.teknisi_id);
    const details = detailPermohonan.filter(d => d.permohonan_id === p.id).map(d => {
      const item = barang.find(b => b.id === d.barang_id);
      return { ...d, item };
    });

    return { ...p, parentTask, tech, details };
  });

  // KPI calculations
  const totalItemCount = barang.length;
  const lowStockItems = barang.filter(b => b.stok <= 20).length;
  const pendingReleaseCount = approvedRequests.length;
  const totalReleasedCount = releasedRequests.length;

  // Filtered inventory
  const filteredBarang = barang.filter(b => {
    const matchQuery = b.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       b.kode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || b.kategori === categoryFilter;
    return matchQuery && matchCat;
  });

  const categories = [
    'all',
    'Kabel & Serat Optik',
    'Perangkat Aktif',
    'Perangkat Pasif',
    'Aksesoris Indoor',
    'Consumable',
    'Aksesoris'
  ];

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    updateBarang(editingItem.id, barangForm);
    setEditingItem(null);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setBarangForm({
      nama_barang: item.nama_barang,
      stok: item.stok,
      satuan: item.satuan,
      kategori: item.kategori || 'Umum',
      kode: item.kode || ''
    });
  };

  const handleRelease = (reqId) => {
    releaseMaterial(reqId);
    showToast('Barang berhasil dirilis & stok gudang otomatis terpotong!', 'success');
  };

  return (
    <div className={`min-h-screen flex ${
      isDark ? 'bg-[#0a0f1d] text-white' : 'bg-slate-50 text-slate-900'
    } transition-colors duration-300`}>
      
      {/* Left Sidebar Layout */}
      <ModernSidebar activeTab={activeMenu} onTabChange={setActiveMenu} />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col lg:pl-72 transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          
          {/* Header Banner */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600/20 text-amber-400 border border-amber-500/30">
                  PORTAL GUDANG & LOGISTIK
                </span>
                <span className="text-xs text-slate-400 font-mono">Petugas: {user.nama_lengkap}</span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeMenu === 'input-barang' && 'Input Barang (Pengadaan & Registrasi Masuk)'}
                {activeMenu === 'output-barang' && 'Output Barang (Rilis & Serah Terima ke Teknisi)'}
                {activeMenu === 'laporan-detail' && 'Laporan Barang Detail & Katalog Master Stok'}
                {activeMenu === 'cetak-surat-jalan' && 'Cetak Surat Jalan & Bukti Serah Terima Material'}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                Sistem Logistik Sentral STO Telkom Akses: Verifikasi Fisik, Rilis, dan Pemotongan Stok Otomatis.
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex items-center justify-between`}>
              <div>
                <div className="text-[11px] text-amber-500 font-semibold uppercase">Siap Rilis (SOP 4)</div>
                <div className="text-2xl font-extrabold text-amber-500 mt-1">{pendingReleaseCount}</div>
                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>Disetujui pimpinan</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
            </div>

            <div className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex items-center justify-between`}>
              <div>
                <div className="text-[11px] text-emerald-500 font-semibold uppercase">Total Jenis Barang</div>
                <div className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} mt-1`}>{totalItemCount}</div>
                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>Katalog aktif</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            <div className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex items-center justify-between`}>
              <div>
                <div className="text-[11px] text-burgundy-500 font-semibold uppercase">Stok Menipis (≤ 20)</div>
                <div className="text-2xl font-extrabold text-burgundy-500 mt-1">{lowStockItems}</div>
                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>Perlu pengadaan baru</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-burgundy-600/20 text-burgundy-500 border border-burgundy-500/30 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex items-center justify-between`}>
              <div>
                <div className="text-[11px] text-blue-500 font-semibold uppercase">Total Serah Terima</div>
                <div className="text-2xl font-extrabold text-blue-500 mt-1">{totalReleasedCount}</div>
                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>Telah dirilis ke teknisi</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* TAB 1: INPUT BARANG (PENGADAAN) */}
          {activeMenu === 'input-barang' && (
            <div className="animate-in fade-in duration-200">
              <InputBarangGudang />
            </div>
          )}

          {/* TAB 2: OUTPUT BARANG (RILIS & SERAH TERIMA SOP 4) */}
          {activeMenu === 'output-barang' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <p>
                  Menampilkan permohonan material yang telah disetujui Pimpinan. Klik <strong>Rilis Barang</strong> untuk melakukan serah terima fisik dan memotong stok gudang otomatis.
                </p>
                <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                  SOP Tahap 4
                </span>
              </div>

              {approvedRequests.length === 0 ? (
                <div className={`${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-3xl p-12 text-center flex flex-col items-center justify-center`}>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mb-3" />
                  <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tidak ada antrean serah terima</div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Semua permohonan yang disetujui pimpinan sudah dirilis.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedRequests.map(req => (
                    <div
                      key={req.id}
                      className={`${isDark ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-200 shadow-md hover:border-amber-500/70'} border rounded-3xl p-5 space-y-4 transition`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-sm text-amber-500">Permohonan #{req.id}</span>
                          <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mt-0.5`}>
                            Tiket #{req.tugas_id} - {req.parentTask?.jenis_kerja}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-amber-500/20 text-amber-500 rounded-full border border-amber-500/30">
                          Disetujui Pimpinan
                        </span>
                      </div>

                      <div className={`text-xs ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'} p-3 rounded-2xl border space-y-1`}>
                        <div><strong>Teknisi Pengambil:</strong> {req.tech?.nama_lengkap}</div>
                        <div><strong>Lokasi Pekerjaan:</strong> {req.parentTask?.lokasi}</div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} italic`}>"{req.catatan_teknisi}"</div>
                      </div>

                      {/* Items to Release */}
                      <div className="space-y-2">
                        <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
                          Daftar Barang yang Diminta:
                        </div>
                        <div className="space-y-1.5">
                          {req.details.map(d => (
                            <div
                              key={d.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} text-xs border`}
                            >
                              <div>
                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{d.item?.nama_barang || 'Barang'}</span>
                                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  Stok Gudang: <span className={d.item?.stok < d.jumlah_minta ? 'text-burgundy-500 font-bold' : 'text-emerald-500 font-bold'}>{d.item?.stok} {d.item?.satuan}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-amber-500 text-sm">
                                  {d.jumlah_minta} {d.item?.satuan}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Release Button */}
                      <div className="pt-2">
                        <button
                          onClick={() => handleRelease(req.id)}
                          disabled={!req.canRelease}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                            req.canRelease
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950 active:scale-98'
                              : isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{req.canRelease ? 'Rilis Barang & Potong Stok Otomatis' : 'Stok Gudang Tidak Cukup'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LAPORAN BARANG DETAIL & MASTER STOK (CRUD) */}
          {activeMenu === 'laporan-detail' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Search & Filter Toolbar */}
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} p-3 rounded-2xl border`}>
                <div className="relative w-full sm:w-80">
                  <Search className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'} absolute left-3 top-1/2 -translate-y-1/2`} />
                  <input
                    type="text"
                    placeholder="Cari nama barang atau kode SKU material..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-burgundy-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-burgundy-500'} border rounded-xl text-xs focus:outline-none`}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-burgundy-600 text-white'
                          : isDark ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800' : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {cat === 'all' ? 'Semua Kategori' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table of Inventory */}
              <div className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl overflow-hidden shadow-xl`}>
                <div className="overflow-x-auto">
                  <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <thead className={`${isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
                      <tr>
                        <th className="px-4 py-3">ID Material</th>
                        <th className="px-4 py-3">Nama Material</th>
                        <th className="px-4 py-3 text-right">Stok Fisik</th>
                        <th className="px-4 py-3">Satuan</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {filteredBarang.map(item => {
                        const isCritical = item.stok <= 10;
                        return (
                          <tr key={item.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition`}>
                            <td className={`px-4 py-3 font-mono text-xs font-bold text-slate-400`}>#{item.id}</td>
                            <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.nama_barang}</td>
                            <td className="px-4 py-3 text-right font-bold text-sm">
                              <span className={isCritical ? 'text-burgundy-500' : 'text-emerald-500'}>
                                {item.stok.toLocaleString()}
                              </span>
                            </td>
                            <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.satuan}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCritical
                                  ? 'bg-burgundy-500/20 text-burgundy-500 border border-burgundy-500/30'
                                  : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                              }`}>
                                {isCritical ? 'Stok Kritis' : 'Tersedia'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => startEdit(item)}
                                  className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} text-blue-500 transition cursor-pointer`}
                                  title="Edit Data Barang"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteBarang(item.id)}
                                  className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-burgundy-950/50' : 'bg-slate-100 hover:bg-burgundy-50'} text-burgundy-500 transition cursor-pointer`}
                                  title="Hapus Barang"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

          {/* TAB 4: CETAK SURAT JALAN MATERIAL */}
          {activeMenu === 'cetak-surat-jalan' && (
            <div className="animate-in fade-in duration-200">
              <CetakSuratJalan />
            </div>
          )}

        </div>
      </main>

      {/* Modal: Edit Barang */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xl'} border w-full max-w-md rounded-2xl shadow-2xl p-6 text-xs transition-colors`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} mb-4`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm flex items-center gap-2`}>
                <Edit2 className="w-4 h-4 text-blue-500" />
                Ubah Data Barang #{editingItem.id}
              </h3>
              <button onClick={() => setEditingItem(null)} className={`${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} cursor-pointer`}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Nama Barang</label>
                <input
                  type="text"
                  required
                  value={barangForm.nama_barang}
                  onChange={e => setBarangForm({ ...barangForm, nama_barang: e.target.value })}
                  className={`w-full ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl p-2.5 focus:outline-none focus:border-blue-500`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Stok Gudang</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={barangForm.stok}
                    onChange={e => setBarangForm({ ...barangForm, stok: e.target.value })}
                    className={`w-full ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl p-2.5 focus:outline-none focus:border-blue-500`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Satuan</label>
                  <input
                    type="text"
                    required
                    value={barangForm.satuan}
                    onChange={e => setBarangForm({ ...barangForm, satuan: e.target.value })}
                    className={`w-full ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} border rounded-xl p-2.5 focus:outline-none focus:border-blue-500`}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} transition font-medium cursor-pointer`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
