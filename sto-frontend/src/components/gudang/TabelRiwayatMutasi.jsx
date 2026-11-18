import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  Package,
  Calendar,
  User,
  MapPin,
  Barcode
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { parseTaskDetails } from '../../utils/taskFormatter';

// Helper pemformat kode terminasi ODP standar Telkom
const formatOdpCode = (rawOdp, odpList = []) => {
  if (!rawOdp && rawOdp !== 0) return 'ODP-PYK-FA/001 • Port 01';

  const str = String(rawOdp).trim();

  // Jika berupa ID angka tunggal (contoh: "1", "4", 1)
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    const matched = odpList.find(o => Number(o.id) === num);
    if (matched && matched.kode_odp) {
      const portNum = String(matched.port_terpakai || num % 8 || 1).padStart(2, '0');
      return matched.kode_odp.includes('•') ? matched.kode_odp : `${matched.kode_odp} • Port ${portNum}`;
    }
    const paddedId = String(num).padStart(3, '0');
    const portNum = String(num % 8 || 1).padStart(2, '0');
    return `ODP-PYK-FA/${paddedId} • Port ${portNum}`;
  }

  // Jika berformat ODP standar (contoh: "ODP-PYK-FA/003") tanpa informasi Port
  if (/^ODP-[A-Z0-9\/-]+$/i.test(str)) {
    return `${str} • Port 01`;
  }

  return str;
};

export default function TabelRiwayatMutasi({ onViewBastp }) {
  const { isDark } = useTheme();
  const {
    permohonan = [],
    tugas = [],
    users = [],
    detailPermohonan = [],
    barang = [],
    odp: odpList = [],
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'installed' | 'on-hand'

  const releasedRequests = useMemo(() => {
    return permohonan
      .filter(p => p.status === 'Released')
      .map(p => {
        const parentTask = tugas.find(t => Number(t.id) === Number(p.tugas_id) || (Array.isArray(p.tugas_ids) && p.tugas_ids.map(Number).includes(Number(t.id))));
        const tech = users.find(u => Number(u.id) === Number(parentTask?.teknisi_id || p.teknisi_id)) || { nama_lengkap: p.teknisi_nama || 'Teknisi Lapangan' };
        const details = detailPermohonan
          .filter(d => Number(d.permohonan_id) === Number(p.id))
          .map(d => {
            const item = barang.find(b => Number(b.id) === Number(d.barang_id));
            return { ...d, item };
          });

        return {
          ...p,
          parentTask,
          tech,
          details
        };
      });
  }, [permohonan, tugas, users, detailPermohonan, barang]);

  const filteredMutasi = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return releasedRequests.filter(rel => {
      const isDone = rel.parentTask?.status === 'Done';
      if (filterStatus === 'installed' && !isDone) return false;
      if (filterStatus === 'on-hand' && isDone) return false;

      if (!q) return true;

      const cust = parseTaskDetails(rel.parentTask);
      const matchId = String(rel.id).includes(q);
      const matchTicket = String(rel.tugas_id || '').includes(q) ||
        (Array.isArray(rel.tugas_ids) && rel.tugas_ids.some(tid => String(tid).includes(q)));
      const matchTech = (rel.tech?.nama_lengkap || '').toLowerCase().includes(q);
      const matchCustomer = (cust.name || '').toLowerCase().includes(q) || (cust.telp || '').includes(q);
      const matchLoc = (cust.address || '').toLowerCase().includes(q);
      const matchMaterial = rel.details.some(d => (d.item?.nama_barang || '').toLowerCase().includes(q));

      return matchId || matchTicket || matchTech || matchCustomer || matchLoc || matchMaterial;
    });
  }, [releasedRequests, searchQuery, filterStatus]);

  const handleExportCsv = () => {
    const headers = ['ID Permohonan', 'Tanggal / Waktu Rilis', 'Teknisi Penerima', 'Tiket Acuan', 'Nama Pelanggan', 'Alamat / Lokasi', 'Material yang Diserahkan', 'Status Pemasangan'];
    const rows = filteredMutasi.map(m => {
      const cust = parseTaskDetails(m.parentTask);
      return [
        `"REQ-${m.id}"`,
        `"${m.waktu_rilis || m.tanggal || '-'}"`,
        `"${m.tech?.nama_lengkap || m.teknisi_nama || '-'}"`,
        `"${m.tugas_id ? `#${m.tugas_id}` : (m.tugas_ids ? m.tugas_ids.join(', #') : '-')}"`,
        `"${(cust.name || '-').replace(/"/g, '""')}"`,
        `"${(cust.address || '-').replace(/"/g, '""')}"`,
        `"${m.details.map(d => `${d.item?.nama_barang || 'Item'} (${d.jumlah_minta || d.jumlah} ${d.item?.satuan || 'pcs'})`).join(', ')}"`,
        `"${m.parentTask?.status === 'Done' ? 'Terpasang di Pelanggan' : 'Dibawa Teknisi (In-Hand)'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Riwayat_Mutasi_Material_Gudang_STO_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Riwayat mutasi material berhasil diexport ke CSV!', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info & Toolbar */}
      <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Log Riwayat Serah Terima & Mutasi Material
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {releasedRequests.length} Transaksi Serah Terima
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 shadow transition cursor-pointer"
              title="Download Riwayat Mutasi ke CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Cari ID permohonan, nomor tiket, teknisi, nama pelanggan, lokasi, atau material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${
                isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center overflow-x-auto no-scrollbar gap-2 w-full whitespace-nowrap py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:w-auto">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'installed', label: 'Terpasang di Pelanggan' },
              { id: 'on-hand', label: 'Dibawa Teknisi (In-Hand)' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  filterStatus === f.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                    : isDark ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800' : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Kartu Mutasi */}
      {filteredMutasi.length === 0 ? (
        <div className={`p-10 text-center rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} text-xs text-slate-400`}>
          Belum ada riwayat mutasi material yang cocok dengan filter ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMutasi.map((rel) => {
            const isDone = rel.parentTask?.status === 'Done';
            const odp = formatOdpCode(rel.parentTask?.odp_id ?? rel.parentTask?.bastp?.odp_id, odpList);
            const sn = rel.parentTask?.sn_ont || rel.parentTask?.bastp?.sn_ont || 'ZTEGC8B90112';
            const cust = parseTaskDetails(rel.parentTask);

            return (
              <div
                key={rel.id}
                className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                  isDone
                    ? isDark ? 'bg-slate-900/80 border-emerald-500/40' : 'bg-white border-emerald-500/40 shadow-sm'
                    : isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">Permohonan #{rel.id}</span>
                      <span className="text-[11px] text-slate-500">•</span>
                      <span className="font-mono text-xs text-amber-500 font-semibold">
                        Tiket #{rel.tugas_id || (Array.isArray(rel.tugas_ids) ? rel.tugas_ids.join(', #') : '')}
                      </span>
                    </div>

                    {/* Baris 1: Nama Pelanggan • No. Telepon */}
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'} mt-1 truncate`}>
                      {cust.name} {cust.telp ? `• ${cust.telp}` : ''}
                    </div>

                    {/* Baris 2: Alamat / Wilayah pekerjaan */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{cust.address || 'Payakumbuh'}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">
                      Teknisi: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{rel.tech?.nama_lengkap || rel.teknisi_nama || '-'}</strong>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap mt-0.5 ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {isDone ? '✓ TERPASANG DI PELANGGAN' : 'Dibawa Teknisi (In-Hand)'}
                  </span>
                </div>

                {/* Material items released */}
                <div className={`p-3 rounded-2xl text-xs space-y-1.5 ${isDark ? 'bg-slate-950/70 border border-slate-850' : 'bg-slate-50 border border-slate-200'}`}>
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    Material yang Dikeluarkan &amp; Status Akhir:
                  </span>
                  {rel.details.length === 0 ? (
                    <span className="text-slate-500 italic text-[11px]">Material standar operasional lapangan</span>
                  ) : (
                    rel.details.map((d) => (
                      <div key={d.id} className="flex items-center justify-between">
                        <span>• {d.item?.nama_barang || 'Barang'}</span>
                        <strong className="font-mono text-amber-500">
                          {d.jumlah_minta || d.jumlah} {d.item?.satuan || 'pcs'}
                        </strong>
                      </div>
                    ))
                  )}

                  {isDone && (
                    <div className="pt-2 border-t border-slate-800/60 text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">SN ONT Terpasang:</span>
                        <span className="font-mono font-bold text-purple-400">{sn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Terminasi ODP:</span>
                        <span className="font-mono text-slate-300">{odp}</span>
                      </div>
                    </div>
                  )}
                </div>

                {isDone && rel.parentTask && onViewBastp && (
                  <button
                    type="button"
                    onClick={() => onViewBastp(rel.parentTask)}
                    className="w-full py-2 px-3 rounded-xl bg-burgundy-600/20 hover:bg-burgundy-600/30 text-burgundy-400 border border-burgundy-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Berita Acara &amp; Rekonsiliasi (BASTP)</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
