/**
 * ============================================================================
 * KOMPONEN: TabelPelangganAset (Master Data Pelanggan & Audit Penarikan Aset STO)
 * ============================================================================
 * Sesuai Standar Operasional Telkom STO & UU Perlindungan Data Pribadi (PDP):
 * 1. PIMPINAN: Melihat data pelanggan secara bersih tanpa sensor (Nama & No HP lengkap).
 * 2. LAPANGAN / DEBT COLLECTOR / GUDANG: Data pribadi (Nama & No HP) disensor (***),
 *    tetapi KOORDINAT GPS, ALAMAT FISIK, FOTO RUMAH, TITIK ODP, dan NOMOR SERI (SN)
 *    ONT & STB TAMPIL JELAS 100% untuk eksekusi penarikan perangkat STO bagi pelanggan
 *    yang menunggak tagihan (> 3 bulan).
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ShieldAlert,
  Eye,
  EyeOff,
  MapPin,
  ExternalLink,
  Barcode,
  Tv,
  AlertTriangle,
  Download,
  Printer,
  X,
  CheckCircle2,
  Phone,
  Home,
  Copy,
  Camera,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { parseTaskDetails } from '../utils/taskFormatter';

// Helper pembersih alamat agar tidak menduplikasi nama dan nomor telepon pelanggan
const cleanAddressOnly = (rawAddr, customerName) => {
  if (!rawAddr) return '-';
  const cust = parseTaskDetails({ lokasi: rawAddr, pelanggan_nama: customerName });
  return cust.address || rawAddr;
};

// Helper pemformat kode ODP agar selalu lengkap (contoh: "4" -> "ODP-PYK-FA/004")
const formatOdpCode = (odpId, odpList = []) => {
  if (!odpId && odpId !== 0) return '-';
  const raw = String(odpId).trim();
  if (!raw || raw === '-') return '-';

  // 1. Coba cocokkan dengan data master ODP (berdasarkan id atau kode_odp)
  const matched = (odpList || []).find(
    o => String(o.id) === raw || Number(o.id) === Number(raw) || o.kode_odp?.toLowerCase() === raw.toLowerCase()
  );
  if (matched?.kode_odp) return matched.kode_odp;

  // 2. Jika berupa angka tunggal (contoh: "4" atau 4) -> format ke ODP-PYK-FA/004
  if (/^\d+$/.test(raw)) {
    return `ODP-PYK-FA/${raw.padStart(3, '0')}`;
  }

  // 3. Jika formatnya "ODP #4", "ODP 4", atau "ODP-4"
  const matchNum = raw.match(/^ODP[-\s#]*(\d+)$/i);
  if (matchNum) {
    return `ODP-PYK-FA/${matchNum[1].padStart(3, '0')}`;
  }

  return raw;
};

// Helper pembersih format ODP dan Port
const getOdpPortText = (odpId, portOdp, odpList = []) => {
  const formattedOdp = formatOdpCode(odpId, odpList);
  const rawPort = portOdp && String(portOdp).trim() !== '' && String(portOdp).trim() !== '-'
    ? String(portOdp).trim().replace(/^port\s*/i, '')
    : null;
  const port = rawPort ? (rawPort.length === 1 ? rawPort.padStart(2, '0') : rawPort) : null;

  if (formattedOdp === '-' && !port) return '-';
  if (port) return `${formattedOdp} • Port ${port}`;
  return formattedOdp;
};

export default function TabelPelangganAset({ isGudangView = false, hideHeader = false }) {
  const { isDark } = useTheme();
  const { pelanggan, currentUser, showToast, odp = [] } = useApp();

  const isPimpinan = currentUser?.role === 'pimpinan';
  const isGudang = currentUser?.role === 'gudang' || isGudangView;
  const [privacyPreview, setPrivacyPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPelanggan, setSelectedPelanggan] = useState(null);
  const [suratTugasPelanggan, setSuratTugasPelanggan] = useState(null);

  // Status apakah data boleh tampil bersih atau disensor:
  // HANYA role Pimpinan dalam mode kerja asli yang berhak melihat data tanpa sensor.
  // Role gudang, teknisi, dan preview lapangan WAJIB disensor sesuai UU Perlindungan Data Pribadi (UU PDP).
  const isPrivileged = isPimpinan && !privacyPreview && !isGudang;

  // Masking nama: "Bpk. Rian Hidayat" -> "B**k. R*** H******"
  const maskName = useCallback((name) => {
    if (isPrivileged || !name) return name;
    return name.split(' ').map(w => {
      if (w.length <= 2) return w[0] + '*';
      return w[0] + '*'.repeat(Math.max(1, w.length - 2)) + w[w.length - 1];
    }).join(' ');
  }, [isPrivileged]);

  // Masking telepon: "0812-3456-7890" -> "0812-****-7890"
  const maskPhone = useCallback((phone) => {
    if (isPrivileged || !phone) return phone;
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length < 8) return '08**-****';
    return clean.slice(0, 4) + '-****-' + clean.slice(-4);
  }, [isPrivileged]);

  // Filter pelanggan (Memoized untuk mencegah kalkulasi regex berulang di setiap render)
  const filteredPelanggan = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (pelanggan || []).filter(p => {
      const matchSearch =
        !q ||
        (p.id_pelanggan || '').toLowerCase().includes(q) ||
        (p.nama || '').toLowerCase().includes(q) ||
        (p.sn_ont || '').toLowerCase().includes(q) ||
        (p.alamat || '').toLowerCase().includes(q) ||
        (p.odp_id || '').toLowerCase().includes(q);

      const statusStr = (p.status_langganan || '').toLowerCase();
      const isDismantle = statusStr.includes('penarikan') || statusStr.includes('debt') || statusStr.includes('dismantle') || statusStr.includes('tunggak');
      const isIsolir = statusStr.includes('isolir');
      const isLancar = !isDismantle && !isIsolir;

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'dismantle'
          ? isDismantle
          : statusFilter === 'isolir'
          ? isIsolir
          : isLancar;

      return matchSearch && matchStatus;
    });
  }, [pelanggan, searchQuery, statusFilter]);

  const { totalDismantleCount, totalIsolirCount, totalLancarCount } = useMemo(() => {
    let dismantle = 0;
    let isolir = 0;
    let lancar = 0;
    (pelanggan || []).forEach(p => {
      const statusStr = (p.status_langganan || '').toLowerCase();
      if (statusStr.includes('penarikan') || statusStr.includes('debt') || statusStr.includes('dismantle') || statusStr.includes('tunggak')) {
        dismantle++;
      } else if (statusStr.includes('isolir')) {
        isolir++;
      } else {
        lancar++;
      }
    });
    return { totalDismantleCount: dismantle, totalIsolirCount: isolir, totalLancarCount: lancar };
  }, [pelanggan]);

  const handleExportCSV = useCallback(() => {
    const headers = ['ID Pelanggan', 'Nama Pelanggan', 'No HP', 'Alamat & Patokan', 'Titik ODP', 'SN Modem ONT', 'SN STB TV', 'Status Layanan', 'Total Tunggakan', 'Koordinat GPS'];
    const rows = filteredPelanggan.map(p => [
      `"${p.id_pelanggan}"`,
      `"${isPrivileged ? p.nama : maskName(p.nama)}"`,
      `"${isPrivileged ? p.no_telp : maskPhone(p.no_telp)}"`,
      `"${(p.alamat || '').replace(/"/g, '""')} [${p.patokan || ''}]"`,
      `"${getOdpPortText(p.odp_id, p.port_odp, odp)}"`,
      `"${p.sn_ont}"`,
      `"${p.sn_stb}"`,
      `"${p.status_langganan}"`,
      `"${p.total_tunggakan}"`,
      `"${p.latitude}, ${p.longitude}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Master_Pelanggan_Aset_STO_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredPelanggan, isPrivileged, maskName, maskPhone]);

  // Listener event eksternal dari tombol header Command Center Pimpinan (Aman dengan dependency array)
  useEffect(() => {
    const handleExternalExport = () => handleExportCSV();
    window.addEventListener('sto:export-pelanggan', handleExternalExport);
    return () => window.removeEventListener('sto:export-pelanggan', handleExternalExport);
  }, [handleExportCSV]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner (Hanya jika bukan di dalam tab terintegrasi) */}
      {!hideHeader && (
        <div className={`p-6 rounded-3xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
          <div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Master Data Pelanggan &amp; Audit Penarikan Aset STO
            </h1>
          </div>

          {/* Action Controls & Privacy Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Sensor Privasi untuk Pimpinan */}
            {isPimpinan && !isGudang && (
              <button
                type="button"
                onClick={() => {
                  setPrivacyPreview(!privacyPreview);
                  showToast(privacyPreview ? 'Mode Pimpinan Aktif: Data nama & kontak tampil bersih.' : 'Mode Lapangan: Data pribadi disensor (***) demi privasi.', 'info');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  privacyPreview
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="Simulasi Sensor Data Privasi Lapangan (UU PDP Telkom)"
              >
                {privacyPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{privacyPreview ? 'Mode Sensor Privasi Aktif' : 'Simulasi Sensor Dismantle'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pelanggan Aktif &amp; Lancar</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{totalLancarCount}</div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Menunggak 1-2 Bulan (Isolir)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{totalIsolirCount}</div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-rose-900/40' : 'bg-rose-50/60 border-rose-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-rose-500 font-bold">Target Dismantle &amp; Recovery Aset</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-500">{totalDismantleCount}</div>
        </div>
      </div>

      {/* Toolbar Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ID IndiHome / Nama Pelanggan / SN Modem / Alamat / Titik ODP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Pelanggan' },
            { id: 'dismantle', label: '⚠️ Target Dismantle & Recovery' },
            { id: 'isolir', label: 'Menunggak (Isolir)' },
            { id: 'lancar', label: 'Lancar' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                statusFilter === f.id
                  ? f.id === 'dismantle'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                    : 'bg-slate-700 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Tampilan Khusus Mobile (< md: block md:hidden) */}
      <div className="block md:hidden space-y-3 w-full min-w-0">
        {filteredPelanggan.length === 0 ? (
          <div className={`p-8 text-center text-xs rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'} italic`}>
            Tidak ada data pelanggan yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filteredPelanggan.map(item => {
            const statusStr = (item.status_langganan || '').toLowerCase();
            const isTargetSita = statusStr.includes('penarikan') || statusStr.includes('debt') || statusStr.includes('dismantle') || statusStr.includes('tunggak');
            const isIsolir = statusStr.includes('isolir');
            const cleanAddr = cleanAddressOnly(item.alamat, item.nama || item.nama_pelanggan);
            const odpText = getOdpPortText(item.odp_id, item.port_odp, odp);
            const isWaitingBastp = String(item.sn_ont || '').toLowerCase().includes('menunggu');

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition ${
                  isTargetSita
                    ? isDark ? 'bg-slate-900/90 border-rose-900/50 shadow-sm shadow-rose-950/20' : 'bg-rose-50/70 border-rose-200 shadow-sm'
                    : isDark ? 'bg-slate-900/70 border-slate-800 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {/* Header Card: ID IndiHome & Badge Status */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-slate-200">
                    <span className="text-cyan-400">{item.id_pelanggan}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.id_pelanggan);
                        showToast(`ID ${item.id_pelanggan} disalin!`, 'info');
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      title="Salin ID Pelanggan"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {isTargetSita ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Tunggak (3+ Bln)
                    </span>
                  ) : isIsolir ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Isolir (1-2 Bln)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Lancar
                    </span>
                  )}
                </div>

                {/* Sub-header: Nama Pelanggan & No Telepon */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                      {isPrivileged ? item.nama : maskName(item.nama)}
                    </div>
                    {item.paket && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 shrink-0 font-medium">
                        {item.paket}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{isPrivileged ? item.no_telp : maskPhone(item.no_telp)}</span>
                    {!isPrivileged && (
                      <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-500 font-mono ml-1">
                        PDP
                      </span>
                    )}
                  </div>
                </div>

                {/* Lokasi & Jaringan */}
                <div className="py-2.5 border-t border-slate-800/60 space-y-1 text-xs">
                  <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'} line-clamp-2 leading-relaxed`}>
                    {cleanAddr}
                    {item.patokan && !cleanAddr.toLowerCase().includes(item.patokan.toLowerCase()) && (
                      <span className="text-slate-400 font-normal"> ({item.patokan})</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-amber-400 font-semibold flex items-center gap-1 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{odpText}</span>
                  </div>
                </div>

                {/* Data Perangkat STO Terpasang */}
                <div className="py-2.5 border-t border-slate-800/60 text-xs">
                  {isWaitingBastp ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>Menunggu BASTP</span>
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">{item.model_ont || 'Modem ONT Telkom'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-cyan-400 font-bold">
                        <Barcode className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                        <span>ONT: {item.sn_ont}</span>
                      </div>
                      {item.model_ont && (
                        <span className="text-[10px] text-slate-400 truncate">({item.model_ont})</span>
                      )}
                      {item.sn_stb && item.sn_stb !== '-' && (
                        <div className="w-full flex items-center gap-1 text-[11px] font-mono text-sky-400 mt-0.5">
                          <Tv className="w-3 h-3 text-sky-500 shrink-0" />
                          <span>STB: {item.sn_stb}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Card: GPS + Foto + Aksi Utama */}
                <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 hover:border-blue-500/40 transition cursor-pointer"
                      title="Buka Navigasi Rute GPS"
                    >
                      <MapPin className="w-4 h-4 text-blue-400" />
                    </a>
                    {item.foto_rumah && (
                      <button
                        type="button"
                        onClick={() => setSelectedPelanggan(item)}
                        className="p-2 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition cursor-pointer"
                        title="Lihat Foto Dokumentasi Rumah"
                      >
                        <Camera className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex justify-end">
                    {isTargetSita ? (
                      <button
                        type="button"
                        onClick={() => setSuratTugasPelanggan(item)}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition shadow-sm shadow-rose-950/40 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span>Surat Penarikan</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedPelanggan(item)}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        Detail Aset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Tampilan Desktop Table (hidden md:block) */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
        <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <thead className={`${isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
            <tr>
              <th className="px-4 py-3 whitespace-nowrap w-[150px]">ID IndiHome</th>
              <th className="px-4 py-3 min-w-[170px]">Nama Pelanggan</th>
              <th className="px-4 py-3 whitespace-nowrap w-[150px]">Status Layanan</th>
              <th className="px-4 py-3 min-w-[220px] max-w-[280px]">Alamat &amp; Titik ODP</th>
              <th className="px-4 py-3 min-w-[180px]">Perangkat CPE (ONT / STB)</th>
              <th className="px-4 py-3 text-center w-[110px] whitespace-nowrap">Titik GPS &amp; Foto</th>
              <th className="px-4 py-3 text-center w-[140px] whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {filteredPelanggan.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                  Tidak ada data pelanggan yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filteredPelanggan.map(item => {
                const statusStr = (item.status_langganan || '').toLowerCase();
                const isTargetSita = statusStr.includes('penarikan') || statusStr.includes('debt') || statusStr.includes('dismantle') || statusStr.includes('tunggak');
                const isIsolir = statusStr.includes('isolir');
                const cleanAddr = cleanAddressOnly(item.alamat, item.nama || item.nama_pelanggan);
                const odpText = getOdpPortText(item.odp_id, item.port_odp, odp);

                return (
                  <tr
                    key={item.id}
                    className={`transition ${
                      isTargetSita
                        ? isDark ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'bg-rose-50/50 hover:bg-rose-100/50'
                        : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* ID Pelanggan */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-slate-300">
                        <span className="text-cyan-400">{item.id_pelanggan}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.id_pelanggan);
                            showToast(`ID ${item.id_pelanggan} disalin!`, 'info');
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                          title="Salin ID Pelanggan"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400">{item.paket}</div>
                    </td>

                    {/* Nama Pelanggan & Kontak (Sensitif PDP) */}
                    <td className="px-4 py-3">
                      <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
                        <span>{isPrivileged ? item.nama : maskName(item.nama)}</span>
                        {!isPrivileged && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            PDP
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-slate-500" />
                        <span>{isPrivileged ? item.no_telp : maskPhone(item.no_telp)}</span>
                      </div>
                    </td>

                    {/* Status Pembayaran / Kontrak */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isTargetSita ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Tunggak (3+ Bln)
                        </span>
                      ) : isIsolir ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Isolir (1-2 Bln)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Lancar
                        </span>
                      )}
                      {item.total_tunggakan && item.total_tunggakan !== 'Rp 0 (Lunas)' && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.total_tunggakan}
                        </div>
                      )}
                    </td>

                    {/* Alamat Fisik & ODP */}
                    <td className="px-4 py-3 max-w-[280px]">
                      <div className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'} line-clamp-2 leading-snug`}>
                        {cleanAddr}
                        {item.patokan && !cleanAddr.toLowerCase().includes(item.patokan.toLowerCase()) && (
                          <span className="text-[11px] text-slate-400 font-normal"> ({item.patokan})</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-amber-400 mt-1 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{odpText}</span>
                      </div>
                    </td>

                    {/* Perangkat STO Terpasang */}
                    <td className="px-4 py-3">
                      {String(item.sn_ont || '').toLowerCase().includes('menunggu') ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Menunggu BASTP</span>
                          </span>
                          <div className="text-[10px] text-slate-400 truncate">{item.model_ont || 'Modem ONT Telkom'}</div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 font-mono text-xs text-purple-400 font-bold">
                            <Barcode className="w-3.5 h-3.5 shrink-0" />
                            <span>ONT: {item.sn_ont}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{item.model_ont}</div>
                          {item.sn_stb && item.sn_stb !== '-' && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-sky-400 mt-0.5">
                              <Tv className="w-2.5 h-2.5" />
                              <span>STB: {item.sn_stb}</span>
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    {/* Titik GPS & Foto Rumah */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 hover:border-blue-500/40 transition cursor-pointer"
                          title="Buka Navigasi Rute GPS ke Rumah Pelanggan"
                        >
                          <MapPin className="w-4 h-4" />
                        </a>
                        {item.foto_rumah && (
                          <button
                            type="button"
                            onClick={() => setSelectedPelanggan(item)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition cursor-pointer"
                            title="Lihat Foto Dokumentasi Rumah Pelanggan"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Aksi Tim Lapangan */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isTargetSita ? (
                        <button
                          type="button"
                          onClick={() => setSuratTugasPelanggan(item)}
                          className="px-2.5 py-1 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                          title="Terbitkan Surat Tugas Penarikan Aset STO"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Surat Penarikan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedPelanggan(item)}
                          className="px-2.5 py-1 rounded-xl border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300 font-medium text-xs inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          Detail Aset
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: DETAIL PELANGGAN & FOTO RUMAH */}
      {selectedPelanggan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl relative ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm">Detail Pelanggan &amp; Aset STO Terpasang</h3>
              </div>
              <button onClick={() => setSelectedPelanggan(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Foto Rumah / Titik Pasang */}
              {selectedPelanggan.foto_rumah && (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img
                    src={selectedPelanggan.foto_rumah}
                    alt="Foto Rumah Pelanggan"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-emerald-400">
                    GPS: {selectedPelanggan.latitude}, {selectedPelanggan.longitude}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px]">ID IndiHome:</span>
                  <div className="font-mono font-bold text-rose-400">{selectedPelanggan.id_pelanggan}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Nama Pelanggan:</span>
                  <div className="font-bold">{isPrivileged ? selectedPelanggan.nama : maskName(selectedPelanggan.nama)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Serial Number (SN) ONT:</span>
                  <div className="font-mono font-bold text-purple-400">{selectedPelanggan.sn_ont}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Model ONT:</span>
                  <div className="truncate font-semibold">{selectedPelanggan.model_ont}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Titik ODP Jaringan:</span>
                  <div className="font-mono text-amber-400">{getOdpPortText(selectedPelanggan.odp_id, selectedPelanggan.port_odp, odp)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Status Pembayaran:</span>
                  <div className="font-bold text-rose-400">{selectedPelanggan.status_langganan}</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 text-[11px]">
                <strong>Alamat Fisik:</strong> {selectedPelanggan.alamat} (Patokan: {selectedPelanggan.patokan})
              </div>

              {selectedPelanggan.catatan_kolektor && (
                <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-[11px] text-rose-300">
                  <strong>Catatan Audit / Kolektor:</strong> {selectedPelanggan.catatan_kolektor}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPelanggan(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / PRINT PREVIEW: SURAT TUGAS PENARIKAN ASET LAPANGAN (DEBT COLLECTOR) */}
      {suratTugasPelanggan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-300">
            {/* Kop Surat Resmi Telkom Akses */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
              <div className="text-xs font-black tracking-widest text-red-600 uppercase">PT TELKOM AKSES - SENTRAL TELEPON OTOMAT (STO) PAYAKUMBUH</div>
              <div className="text-sm font-black uppercase mt-0.5">SURAT TUGAS PENARIKAN ASET LOGISTIK &amp; DISMANTLE PERANGKAT</div>
              <div className="text-[10px] text-slate-500 font-mono">Nomor: ST-ASET/TA-PYK/{new Date().getFullYear()}/{String(suratTugasPelanggan.id).padStart(4, '0')}</div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Berdasarkan data audit kontrak operasional STO Telkom Payakumbuh, dengan ini menugaskan <strong>Tim Dismantle &amp; Recovery Aset Lapangan</strong> bersama <strong>Teknisi STO</strong> untuk mendatangi lokasi dan menarik kembali aset perusahaan berikut:
              </p>

              <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 space-y-1">
                <div><strong>ID Pelanggan (IndiHome):</strong> {suratTugasPelanggan.id_pelanggan}</div>
                <div><strong>Nama Pelanggan:</strong> {maskName(suratTugasPelanggan.nama)}</div>
                <div><strong>Alamat Penarikan:</strong> {suratTugasPelanggan.alamat}</div>
                <div><strong>Koordinat GPS Lokasi:</strong> {suratTugasPelanggan.latitude}, {suratTugasPelanggan.longitude}</div>
                <div><strong>Titik Distribusi ODP:</strong> {getOdpPortText(suratTugasPelanggan.odp_id, suratTugasPelanggan.port_odp, odp)}</div>
                <div><strong>Tunggakan Tagihan:</strong> <span className="font-bold text-red-600">{suratTugasPelanggan.total_tunggakan}</span></div>
              </div>

              <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-900 space-y-1">
                <div className="font-bold uppercase text-[11px]">Daftar Aset Fisik STO yang Wajib Disita / Ditarik:</div>
                <div>1. <strong>Modem Optical Network Terminal (ONT):</strong> {suratTugasPelanggan.model_ont} (SN: <span className="font-mono font-bold">{suratTugasPelanggan.sn_ont}</span>)</div>
                {suratTugasPelanggan.sn_stb && suratTugasPelanggan.sn_stb !== '-' && (
                  <div>2. <strong>Set Top Box (STB TV):</strong> SN <span className="font-mono font-bold">{suratTugasPelanggan.sn_stb}</span></div>
                )}
                <div>3. Adaptor Power 12V 1.5A &amp; Patchcord Dropcore SC/UPC</div>
              </div>

              <p className="text-[11px] text-slate-600 italic">
                * Tim wajib membawa Berita Acara Penarikan Aset dan menyerahkan kembali perangkat fisik ke Gudang Sentral STO Payakumbuh (Petugas Logistik: Siti Rahmawati) untuk di-audit dan diubah statusnya menjadi Dismantle/Ready Stock.
              </p>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">Petugas Lapangan / Kolektor</div>
                  <div className="h-12" />
                  <div className="font-bold underline">( Tim Aset STO )</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Mengetahui, Pimpinan STO</div>
                  <div className="h-12" />
                  <div className="font-bold underline">Ir. Bambang Sudirman, M.T.</div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-300 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSuratTugasPelanggan(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  showToast('Surat tugas penarikan aset siap dicetak!', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Surat Tugas Penarikan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
