import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  Boxes,
  Package,
  AlertTriangle,
  Send,
  Search,
  Check,
  Download,
  FileSpreadsheet
} from 'lucide-react';

export default function LaporanGudangPimpinan() {
  const { isDark } = useTheme();
  const {
    tugas = [],
    permohonan = [],
    barang = [],
    users = []
  } = useApp();

  // State untuk Laporan Logistik & Gudang Pimpinan
  const [searchGudang, setSearchGudang] = useState('');
  const [filterKategoriGudang, setFilterKategoriGudang] = useState('all');
  const [subTabGudang, setSubTabGudang] = useState('master'); // 'master' | 'mutasi'

  // Resolusi Kategori Standar Telkom Akses (Real Database Mapping)
  const resolveKategori = useCallback((b) => {
    if (b.kategori && b.kategori !== 'Umum' && b.kategori !== 'Material') return b.kategori;
    const name = (b.nama_barang || '').toLowerCase();
    if (name.includes('kabel') || name.includes('dropcore') || name.includes('fo') || name.includes('fiber') || name.includes('serat')) {
      return 'Kabel & Serat Optik';
    }
    if (name.includes('ont') || name.includes('modem') || name.includes('zte') || name.includes('huawei') || name.includes('fiberhome')) {
      return 'Perangkat Aktif (ONT)';
    }
    if (name.includes('roset') || name.includes('patchcord') || name.includes('splitter') || name.includes('adapter') || name.includes('odp')) {
      return 'Perangkat Pasif';
    }
    return 'Consumable & Aksesoris';
  }, []);

  const totalUnitFisikGudang = useMemo(() => {
    return barang.reduce((acc, b) => acc + (Number(b.stok) || 0), 0);
  }, [barang]);

  const lowStockCount = useMemo(() => {
    return barang.filter(b => Number(b.stok) <= 20).length;
  }, [barang]);

  const releasedMutations = useMemo(() => {
    return permohonan
      .filter(p => p.status === 'Released')
      .map(p => {
        const parentTask = tugas.find(t => Number(t.id) === Number(p.tugas_id) || (Array.isArray(p.tugas_ids) && p.tugas_ids.map(Number).includes(Number(t.id))));
        const tech = users.find(u => Number(u.id) === Number(parentTask?.teknisi_id || p.teknisi_id)) || { nama_lengkap: p.teknisi_nama || 'Teknisi STO' };
        return {
          ...p,
          parentTask: p.parentTask || parentTask,
          tech: p.tech || tech
        };
      });
  }, [permohonan, tugas, users]);

  const filteredPimpinanBarang = useMemo(() => {
    const q = searchGudang.toLowerCase().trim();
    return barang
      .map(b => ({
        ...b,
        kategori: resolveKategori(b),
        kode: b.kode || `SKU-TEL-${String(b.id).padStart(3, '0')}`
      }))
      .filter(b => {
        const matchSearch = !q ||
          (b.nama_barang || '').toLowerCase().includes(q) ||
          (b.kode || '').toLowerCase().includes(q);
        const matchCat = filterKategoriGudang === 'all' || b.kategori === filterKategoriGudang;
        return matchSearch && matchCat;
      });
  }, [barang, searchGudang, filterKategoriGudang, resolveKategori]);

  const handleExportCsv = useCallback(() => {
    const headers = ['Kode SKU', 'Nama Material', 'Kategori', 'Stok Fisik', 'Satuan', 'Status Gudang'];
    const rows = filteredPimpinanBarang.map(b => [
      `"${b.kode}"`,
      `"${b.nama_barang}"`,
      `"${b.kategori}"`,
      b.stok,
      `"${b.satuan}"`,
      `"${b.stok <= 20 ? 'Perlu Restock' : 'Aman'}"`
    ]);

    const mutasiTitle = ['\n\n=== RIWAYAT PENGELUARAN MATERIAL KE TEKNISI (SUPABASE REALTIME) ===', '', '', '', '', ''];
    const mutasiHeaders = ['ID Permohonan', 'Tanggal Rilis', 'Teknisi Penerima', 'Tiket / Pelanggan', 'Material Diberikan', 'Status'];
    const mutasiRows = releasedMutations.map(m => [
      `"REQ-${m.id}"`,
      `"${m.waktu_rilis || m.tanggal || '-'}"`,
      `"${m.tech?.nama_lengkap || m.teknisi_nama || '-'}"`,
      `"${m.parentTask ? `#${m.parentTask.id} - ${m.parentTask.pelanggan_nama}` : '-'}"`,
      `"${m.items ? m.items.map(it => `${it.nama_barang || it.nama} (${it.jumlah} ${it.satuan || 'pcs'})`).join(', ') : '-'}"`,
      `"${m.status}"`
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
      mutasiTitle.join(';'),
      mutasiHeaders.join(';'),
      ...mutasiRows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Logistik_Gudang_STO_Telkom_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredPimpinanBarang, releasedMutations]);

  // Handle global export event dari header DashboardPimpinan
  useEffect(() => {
    const handleGlobalExport = () => handleExportCsv();
    window.addEventListener('sto:export-gudang', handleGlobalExport);
    return () => window.removeEventListener('sto:export-gudang', handleGlobalExport);
  }, [handleExportCsv]);

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    } space-y-6 animate-in fade-in duration-200`}>

      {/* 4 Kartu KPI Ringkasan Logistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Volume Fisik</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalUnitFisikGudang.toLocaleString()}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Katalog Master SKU</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {barang.length}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Stok Kritis / Menipis</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-xl font-black ${lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {lowStockCount}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Material Keluar</span>
            <Send className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {releasedMutations.length}
          </div>
        </div>
      </div>

      {/* Sub-Tab Switcher: Master Stok vs Riwayat Mutasi Keluar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTabGudang('master')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              subTabGudang === 'master'
                ? 'bg-rose-600 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white bg-slate-950/50' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Master Stok Fisik Gudang ({barang.length} Material)
          </button>
          <button
            type="button"
            onClick={() => setSubTabGudang('mutasi')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              subTabGudang === 'mutasi'
                ? 'bg-rose-600 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white bg-slate-950/50' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Riwayat Serah Terima ke Teknisi ({releasedMutations.length} Transaksi)
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
          title="Export data ke format CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* TAMPILAN SUB-TAB 1: MASTER STOK FISIK GUDANG */}
      {subTabGudang === 'master' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Toolbar Filter & Pencarian */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama material / kode SKU (misal: Dropcore, ONT, Roset)..."
                value={searchGudang}
                onChange={(e) => setSearchGudang(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterKategoriGudang}
                onChange={(e) => setFilterKategoriGudang(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                <option value="Kabel & Serat Optik">Kabel & Serat Optik</option>
                <option value="Perangkat Aktif (ONT)">Perangkat Aktif (ONT)</option>
                <option value="Perangkat Pasif">Perangkat Pasif</option>
                <option value="Consumable & Aksesoris">Consumable & Aksesoris</option>
              </select>
            </div>
          </div>

          {/* Tabel Master Stok Database */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <thead className={`${isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
                <tr>
                  <th className="px-4 py-3">Kode SKU</th>
                  <th className="px-4 py-3">Nama Material</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-center">Status Gudang</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {filteredPimpinanBarang.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500 italic">
                      Tidak ada material yang cocok dengan filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredPimpinanBarang.map(item => {
                    const isCritical = Number(item.stok) <= 20;
                    return (
                      <tr key={item.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition`}>
                        <td className="px-4 py-3 font-mono text-slate-400">{item.kode}</td>
                        <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.nama_barang}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {item.kategori}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${isCritical ? 'text-rose-400 font-bold' : isDark ? 'text-white' : 'text-slate-900'}`}>
                            {Number(item.stok).toLocaleString()}
                          </span>{' '}
                          <span className="text-slate-400 text-xs">{item.satuan}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCritical ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Perlu Restock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aman
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAMPILAN SUB-TAB 2: RIWAYAT SERAH TERIMA / MUTASI KELUAR */}
      {subTabGudang === 'mutasi' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <thead className={`${isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
                <tr>
                  <th className="px-4 py-3">No. Permohonan</th>
                  <th className="px-4 py-3">Waktu Rilis</th>
                  <th className="px-4 py-3">Teknisi Lapangan</th>
                  <th className="px-4 py-3">Acuan Tiket &amp; Lokasi</th>
                  <th className="px-4 py-3">Material yang Diberikan</th>
                  <th className="px-4 py-3 text-center">Status Logistik</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {releasedMutations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500 italic">
                      Belum ada mutasi material yang dirilis ke teknisi.
                    </td>
                  </tr>
                ) : (
                  releasedMutations.map(req => (
                    <tr key={req.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition`}>
                      <td className="px-4 py-3 font-mono font-bold text-rose-400">
                        REQ-{String(req.id).padStart(4, '0')}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {req.waktu_rilis || req.created_at || 'Hari ini'}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {req.tech?.nama_lengkap || req.teknisi_nama || 'Teknisi STO'}
                        </div>
                        <div className="text-[10px] text-slate-400">Role: Teknisi Lapangan</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {req.parentTask?.pelanggan_nama ? `Pelanggan: ${req.parentTask.pelanggan_nama}` : `Tiket #${req.tugas_id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-[200px] truncate">
                          {req.parentTask?.lokasi || 'Koto Nan IV, Payakumbuh'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {req.items && req.items.length > 0 ? (
                            req.items.map((it, idx) => (
                              <span key={idx} className="inline-block mr-1.5 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                {it.nama_barang || it.nama}: <strong>{it.jumlah} {it.satuan || 'pcs'}</strong>
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Material Standar Lapangan</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Released / Diserahkan</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
