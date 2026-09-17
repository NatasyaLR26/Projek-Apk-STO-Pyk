import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PlusCircle, PackageCheck, History } from 'lucide-react';

export default function InputBarangGudang() {
  const { isDark } = useTheme();
  const { addBarang, showToast } = useApp();

  const [form, setForm] = useState({
    nama_barang: '',
    stok: 25,
    satuan: 'pcs'
  });

  // Recent in-flow history in session
  const [historyLog, setHistoryLog] = useState([
    {
      id: 1,
      nama_barang: 'Kabel FO Dropcore',
      jumlah: 105,
      satuan: 'roll',
      waktu: '2026-09-17 08:30'
    },
    {
      id: 2,
      nama_barang: 'Modem ONT ZTE',
      jumlah: 11,
      satuan: 'pcs',
      waktu: '2026-09-17 09:15'
    }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama_barang.trim()) return;

    const newItem = {
      nama_barang: form.nama_barang.trim(),
      stok: Number(form.stok),
      satuan: form.satuan
    };

    addBarang(newItem);

    // Add to local history log
    setHistoryLog([
      {
        id: Date.now(),
        nama_barang: form.nama_barang,
        jumlah: form.stok,
        satuan: form.satuan,
        waktu: new Date().toLocaleString('id-ID')
      },
      ...historyLog
    ]);

    showToast(`Barang "${form.nama_barang}" (+${form.stok} ${form.satuan}) berhasil masuk ke gudang!`, 'success');

    // Reset form
    setForm({
      nama_barang: '',
      stok: 25,
      satuan: 'pcs'
    });
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} transition-colors`}>
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-6">
          <span className="p-2 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <PlusCircle className="w-5 h-5" />
          </span>
          <div>
            <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Input Barang Masuk & Pengadaan Baru
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Registrasi inventaris material gudang STO Telkom Payakumbuh (Sinkron langsung ke tabel barang di Supabase).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Nama Barang / Material *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Kabel FO Dropcore / Modem ONT ZTE"
                value={form.nama_barang}
                onChange={e => setForm({ ...form, nama_barang: e.target.value })}
                className={`w-full p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} focus:outline-none focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Satuan Ukuran *
              </label>
              <select
                value={form.satuan}
                onChange={e => setForm({ ...form, satuan: e.target.value })}
                className={`w-full p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none focus:border-emerald-500 cursor-pointer`}
              >
                <option value="pcs">pcs (buah)</option>
                <option value="unit">unit</option>
                <option value="roll">roll</option>
                <option value="meter">meter</option>
                <option value="set">set</option>
                <option value="box">box</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Jumlah Stok Masuk Fisik *
              </label>
              <input
                type="number"
                min="1"
                required
                value={form.stok}
                onChange={e => setForm({ ...form, stok: e.target.value })}
                className={`w-full p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none focus:border-emerald-500 font-bold`}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Simpan Barang ke Database Gudang</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Recent History Table */}
      <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-emerald-400" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Riwayat Barang Masuk Terakhir
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <thead className={`${isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
              <tr>
                <th className="px-4 py-3">Waktu Masuk</th>
                <th className="px-4 py-3">Nama Barang</th>
                <th className="px-4 py-3 text-right">Jumlah Masuk</th>
                <th className="px-4 py-3 text-center">Status Database</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {historyLog.map(item => (
                <tr key={item.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition`}>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{item.waktu}</td>
                  <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.nama_barang}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-500 text-sm">
                    +{item.jumlah} {item.satuan}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Tersimpan di Supabase
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
