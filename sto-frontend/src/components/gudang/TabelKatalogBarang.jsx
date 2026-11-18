import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  PlusCircle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Boxes,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

export default function TabelKatalogBarang({ onNavigateToInputBarang }) {
  const { isDark } = useTheme();
  const {
    barang = [],
    updateBarang,
    deleteBarang,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [barangForm, setBarangForm] = useState({
    nama_barang: '',
    stok: 10,
    satuan: 'pcs',
    kategori: 'Aksesoris',
    kode: ''
  });

  const categories = [
    { value: 'all', label: 'Semua Kategori' },
    { value: 'Kabel & Serat Optik', label: 'Kabel & Serat Optik' },
    { value: 'Perangkat Aktif (CPE / ONT)', label: 'Perangkat Aktif (CPE / ONT)' },
    { value: 'Perangkat Pasif (Splitter / Roset)', label: 'Perangkat Pasif (Splitter / Roset)' },
    { value: 'Consumable & Aksesoris', label: 'Consumable & Aksesoris' }
  ];

  const resolveKategori = useCallback((b) => {
    if (b.kategori && b.kategori !== 'Umum' && b.kategori !== 'Material') {
      if (b.kategori === 'Perangkat Aktif (ONT)' || b.kategori === 'Perangkat Aktif (CPE / ONT)') {
        return 'Perangkat Aktif (CPE / ONT)';
      }
      if (b.kategori === 'Perangkat Pasif' || b.kategori === 'Perangkat Pasif (Splitter / Roset)') {
        return 'Perangkat Pasif (Splitter / Roset)';
      }
      return b.kategori;
    }
    const name = (b.nama_barang || '').toLowerCase();
    if (name.includes('kabel') || name.includes('dropcore') || name.includes('fo') || name.includes('fiber') || name.includes('serat')) {
      return 'Kabel & Serat Optik';
    }
    if (name.includes('ont') || name.includes('modem') || name.includes('zte') || name.includes('huawei') || name.includes('fiberhome') || name.includes('stb') || name.includes('cpe')) {
      return 'Perangkat Aktif (CPE / ONT)';
    }
    if (name.includes('roset') || name.includes('patchcord') || name.includes('splitter') || name.includes('adapter') || name.includes('odp')) {
      return 'Perangkat Pasif (Splitter / Roset)';
    }
    return 'Consumable & Aksesoris';
  }, []);

  const filteredBarang = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return barang
      .map(b => ({
        ...b,
        kategori: resolveKategori(b),
        kode: b.kode || `SKU-TEL-${String(b.id).padStart(3, '0')}`
      }))
      .filter(b => {
        const matchQuery = !q ||
          (b.nama_barang || '').toLowerCase().includes(q) ||
          (b.kode || '').toLowerCase().includes(q);
        const matchCat = categoryFilter === 'all' || b.kategori === categoryFilter;
        return matchQuery && matchCat;
      });
  }, [barang, searchQuery, categoryFilter, resolveKategori]);

  const handleDeleteBarang = async (item) => {
    if (window.confirm(`Hapus ${item.nama_barang} dari katalog master gudang?`)) {
      if (deleteBarang) {
        await deleteBarang(item.id);
        showToast(`Material ${item.nama_barang} berhasil dihapus.`, 'info');
      }
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setBarangForm({
      nama_barang: item.nama_barang || '',
      stok: item.stok || 0,
      satuan: item.satuan || 'pcs',
      kategori: resolveKategori(item),
      kode: item.kode || `SKU-TEL-${String(item.id).padStart(3, '0')}`
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateBarang(editingItem.id, barangForm);
      showToast(`Material ${barangForm.nama_barang} berhasil diperbarui!`, 'success');
      setEditingItem(null);
    } catch (err) {
      showToast(err.message || 'Gagal mengubah data barang.', 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID Material', 'Kode SKU', 'Nama Material', 'Kategori', 'Stok Fisik', 'Satuan', 'Status Stok'];
    const rows = filteredBarang.map(b => [
      `"${b.id}"`,
      `"${b.kode || `MAT-0${b.id}`}"`,
      `"${(b.nama_barang || '').replace(/"/g, '""')}"`,
      `"${(b.kategori || 'Umum').replace(/"/g, '""')}"`,
      b.stok,
      `"${b.satuan || 'pcs'}"`,
      `"${b.stok <= 10 ? 'KRITIS' : b.stok <= 20 ? 'MENIPIS' : 'AMAN'}"`
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Katalog_Master_Gudang_STO_Payakumbuh_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Katalog material berhasil diexport ke CSV!', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Control Bar: Pencarian, Filter Dropdown Kategori & Tombol Aksi */}
      <div className={`p-3.5 sm:p-4 rounded-3xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Sisi Kiri: Input Search (flex-1) + Dropdown Select Kategori */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 flex-1 min-w-0">
            {/* Baris 1 (Mobile) / Flex-1 (Desktop): Input Search */}
            <div className="relative flex-1 min-w-0 w-full">
              <Search className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="text"
                placeholder="Cari nama barang atau kode SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-rose-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-rose-500'
                } border rounded-lg text-sm focus:outline-none transition`}
              />
            </div>

            {/* Baris 2 (Mobile) / Sejajar (Desktop): Dropdown Select Kategori */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full md:w-64 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 cursor-pointer transition shrink-0"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value} className="bg-slate-900 text-slate-200">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sisi Kanan: Baris 3 (Mobile: grid-cols-2) / Sejajar (Desktop: flex) */}
          <div className="grid grid-cols-2 md:flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 shadow transition cursor-pointer whitespace-nowrap w-full md:w-auto"
              title="Export Katalog ke CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Export CSV</span>
            </button>

            {onNavigateToInputBarang && (
              <button
                type="button"
                onClick={onNavigateToInputBarang}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer whitespace-nowrap w-full md:w-auto"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>+ Registrasi Material Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel & Kartu Master Barang FTTH */}
      <div className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-3xl overflow-hidden shadow-xl`}>
        {/* Mobile View: Cards Layout (< md) */}
        <div className="block md:hidden p-3 space-y-3">
          {filteredBarang.length === 0 ? (
            <div className="text-center py-8 text-slate-500 italic text-xs">
              Tidak ada material yang sesuai dengan pencarian atau filter kategori.
            </div>
          ) : (
            filteredBarang.map(item => {
              const isCritical = item.stok <= 10;
              const isLow = item.stok > 10 && item.stok <= 20;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800/90' : 'bg-slate-50 border-slate-200'
                  } space-y-2.5 transition`}
                >
                  {/* Baris Atas: Kode SKU & Status Ketersediaan */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded-lg bg-cyan-950/50 border border-cyan-800/40">
                      {item.kode}
                    </span>
                    {isCritical ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap inline-flex items-center gap-1">
                        Kritis (≤ 10)
                      </span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap inline-flex items-center gap-1">
                        Menipis (≤ 20)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Aman
                      </span>
                    )}
                  </div>

                  {/* Baris Tengah: Nama Material & Kategori */}
                  <div>
                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} leading-snug`}>
                      {item.nama_barang}
                    </h4>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                      Kategori: <span className="font-medium text-slate-300">{item.kategori || 'Umum'}</span>
                    </p>
                  </div>

                  {/* Baris Bawah: Stok Fisik & Tombol Aksi Cepat */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Stok:</span>
                      <span className={`text-sm font-black ${
                        isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        {Number(item.stok).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400">{item.satuan}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className={`p-2 rounded-lg ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'
                        } transition active:scale-95 cursor-pointer`}
                        title="Edit Data Material"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBarang(item)}
                        className={`p-2 rounded-lg ${
                          isDark ? 'bg-slate-800 hover:bg-rose-950/60 text-rose-400 border border-slate-700' : 'bg-slate-100 hover:bg-rose-50 text-rose-600'
                        } transition active:scale-95 cursor-pointer`}
                        title="Hapus Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <thead className={`${isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Kode SKU</th>
                <th className="px-4 py-3">Nama Material</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Stok Fisik</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Status Ketersediaan</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredBarang.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                    Tidak ada material yang sesuai dengan pencarian atau filter kategori.
                  </td>
                </tr>
              ) : (
                filteredBarang.map(item => {
                  const isCritical = item.stok <= 10;
                  const isLow = item.stok > 10 && item.stok <= 20;

                  return (
                    <tr key={item.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition`}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-cyan-400 whitespace-nowrap">
                        {item.kode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {item.nama_barang}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.kategori || 'Umum'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`font-semibold ${isCritical ? 'text-rose-400 font-bold' : isLow ? 'text-amber-400 font-bold' : isDark ? 'text-white' : 'text-slate-900'}`}>
                          {Number(item.stok).toLocaleString()}
                        </span>{' '}
                        <span className="text-slate-400 text-xs">{item.satuan}</span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isCritical ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap inline-flex items-center gap-1">
                            Kritis (≤ 10)
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap inline-flex items-center gap-1">
                            Menipis (≤ 20)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} text-blue-500 transition cursor-pointer`}
                            title="Edit Data Barang"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBarang(item)}
                            className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-rose-950/50' : 'bg-slate-100 hover:bg-rose-50'} text-rose-500 transition cursor-pointer`}
                            title="Hapus Barang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Barang */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xl'} border w-full max-w-md rounded-2xl shadow-2xl p-6 text-xs transition-colors`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} mb-4`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm flex items-center gap-2`}>
                <Edit2 className="w-4 h-4 text-blue-500" />
                Ubah Spesifikasi Material ({editingItem.kode || `SKU-TEL-${String(editingItem.id).padStart(3, '0')}`})
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className={`${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} cursor-pointer p-1`}
              >
                ✕
              </button>
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
                    onChange={e => setBarangForm({ ...barangForm, stok: parseInt(e.target.value, 10) || 0 })}
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
