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

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
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
  FileText
} from 'lucide-react';

export default function TabelPelangganAset({ isGudangView = false }) {
  const { isDark } = useTheme();
  const { pelanggan, currentUser, showToast } = useApp();

  const isPimpinan = currentUser?.role === 'pimpinan';
  const [privacyPreview, setPrivacyPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPelanggan, setSelectedPelanggan] = useState(null);
  const [suratTugasPelanggan, setSuratTugasPelanggan] = useState(null);

  // Status apakah data boleh tampil bersih atau disensor
  const isPrivileged = isPimpinan && !privacyPreview;

  // Masking nama: "Bpk. Rian Hidayat" -> "B**k. R*** H******"
  const maskName = (name) => {
    if (isPrivileged || isGudangView || !name) return name;
    return name.split(' ').map(w => {
      if (w.length <= 2) return w[0] + '*';
      return w[0] + '*'.repeat(Math.max(1, w.length - 2)) + w[w.length - 1];
    }).join(' ');
  };

  // Masking telepon: "0812-3456-7890" -> "0812-****-7890"
  const maskPhone = (phone) => {
    if (isPrivileged || isGudangView || !phone) return phone;
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length < 8) return '08**-****';
    return clean.slice(0, 4) + '-****-' + clean.slice(-4);
  };

  // Filter pelanggan
  const filteredPelanggan = (pelanggan || []).filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (p.id_pelanggan || '').toLowerCase().includes(q) ||
      (p.nama || '').toLowerCase().includes(q) ||
      (p.sn_ont || '').toLowerCase().includes(q) ||
      (p.alamat || '').toLowerCase().includes(q) ||
      (p.odp_id || '').toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'dismantle'
        ? p.status_langganan?.includes('Penarikan') || p.status_langganan?.includes('Debt')
        : statusFilter === 'isolir'
        ? p.status_langganan?.includes('Isolir')
        : p.status_langganan === 'Lancar';

    return matchSearch && matchStatus;
  });

  const totalDismantleCount = (pelanggan || []).filter(p => p.status_langganan?.includes('Penarikan') || p.status_langganan?.includes('Debt')).length;
  const totalIsolirCount = (pelanggan || []).filter(p => p.status_langganan?.includes('Isolir')).length;
  const totalLancarCount = (pelanggan || []).filter(p => p.status_langganan === 'Lancar').length;

  const handleExportCSV = () => {
    const headers = ['ID Pelanggan', 'Nama Pelanggan', 'No HP', 'Alamat & Patokan', 'Titik ODP', 'SN Modem ONT', 'SN STB TV', 'Status Langganan', 'Total Tunggakan', 'Koordinat GPS'];
    const rows = filteredPelanggan.map(p => [
      `"${p.id_pelanggan}"`,
      `"${isPrivileged ? p.nama : maskName(p.nama)}"`,
      `"${isPrivileged ? p.no_telp : maskPhone(p.no_telp)}"`,
      `"${(p.alamat || '').replace(/"/g, '""')} [${p.patokan || ''}]"`,
      `"${p.odp_id} Port ${p.port_odp || '-'}"`,
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
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className={`p-6 rounded-3xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Asset Protection &amp; Customer Inventory
            </span>
          </div>
          <h1 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Master Data Pelanggan &amp; Audit Penarikan Aset STO
          </h1>
          <p className={`text-xs mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Audit legal kepemilikan perangkat STO (Modem ONT &amp; STB) di rumah pelanggan. Melindungi aset perusahaan jika terjadi pemutusan kontrak atau tunggakan pembayaran.
          </p>
        </div>

        {/* Action Controls & Privacy Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Sensor Privasi untuk Pimpinan */}
          {isPimpinan && (
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

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pelanggan Aktif &amp; Lancar</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{totalLancarCount}</div>
          <span className="text-[10px] text-slate-400">Perangkat STO Aman &amp; Aktif</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Menunggak 1-2 Bulan (Isolir)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{totalIsolirCount}</div>
          <span className="text-[10px] text-amber-400">Layanan Diputus Sementara (Soft Block)</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-rose-900/40' : 'bg-rose-50/60 border-rose-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-rose-500 font-bold">Target Dismantle &amp; Recovery Aset</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-500">{totalDismantleCount}</div>
          <span className="text-[10px] text-rose-500 font-bold">Menunggak &gt; 3 Bulan (Modem ONT Wajib Ditarik Fisik)</span>
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

        <div className="flex items-center gap-1.5 overflow-x-auto">
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

      {/* Tabel Master Pelanggan & Audit Aset */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
        <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <thead className={`${isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
            <tr>
              <th className="px-4 py-3">ID IndiHome</th>
              <th className="px-4 py-3">Nama Pelanggan</th>
              <th className="px-4 py-3">Status Langganan</th>
              <th className="px-4 py-3">Alamat &amp; Titik ODP</th>
              <th className="px-4 py-3">Perangkat STO Terpasang</th>
              <th className="px-4 py-3 text-center">Titik GPS &amp; Foto</th>
              <th className="px-4 py-3 text-center">Aksi Tim</th>
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
                const isTargetSita = item.status_langganan?.includes('Penarikan') || item.status_langganan?.includes('Debt');
                const isIsolir = item.status_langganan?.includes('Isolir');

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
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-xs text-rose-500">{item.id_pelanggan}</div>
                      <div className="text-[10px] text-slate-400">{item.paket}</div>
                    </td>

                    {/* Nama Pelanggan & Kontak (Sensitif PDP) */}
                    <td className="px-4 py-3">
                      <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
                        <span>{maskName(item.nama)}</span>
                        {!isPrivileged && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            PDP
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-slate-500" />
                        <span>{maskPhone(item.no_telp)}</span>
                      </div>
                    </td>

                    {/* Status Pembayaran / Kontrak */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                        isTargetSita
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                          : isIsolir
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {isTargetSita && <ShieldAlert className="w-3 h-3" />}
                        {isIsolir && <AlertTriangle className="w-3 h-3" />}
                        {item.status_langganan === 'Lancar' && <CheckCircle2 className="w-3 h-3" />}
                        <span>{item.status_langganan}</span>
                      </span>
                      {item.total_tunggakan !== 'Rp 0 (Lunas)' && (
                        <div className="text-[10px] font-mono text-rose-400 mt-1 font-bold">
                          Tunggakan: {item.total_tunggakan}
                        </div>
                      )}
                    </td>

                    {/* Alamat Fisik & ODP (TAMPIL JELAS 100%) */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className={`text-[11px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'} line-clamp-2`}>
                        {item.alamat}
                      </div>
                      <div className="text-[10px] text-slate-400 italic truncate">Patokan: {item.patokan}</div>
                      <div className="text-[10px] font-mono text-amber-400 mt-0.5">
                        ODP: {item.odp_id} (Port {item.port_odp || '-'})
                      </div>
                    </td>

                    {/* Perangkat STO Terpasang (ONT & STB - TAMPIL JELAS 100%) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-400 font-bold">
                        <Barcode className="w-3 h-3 shrink-0" />
                        <span>ONT: {item.sn_ont}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.model_ont}</div>
                      {item.sn_stb && item.sn_stb !== '-' && (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-sky-400 mt-0.5">
                          <Tv className="w-2.5 h-2.5" />
                          <span>STB: {item.sn_stb}</span>
                        </div>
                      )}
                    </td>

                    {/* Titik GPS & Foto Rumah */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-bold border border-blue-500/30 inline-flex items-center gap-1 transition"
                          title="Buka Navigasi Rute ke Rumah Pelanggan"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Peta GPS</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        {item.foto_rumah && (
                          <button
                            type="button"
                            onClick={() => setSelectedPelanggan(item)}
                            className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                          >
                            Foto Rumah
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Aksi Tim Lapangan */}
                    <td className="px-4 py-3 text-center">
                      {isTargetSita ? (
                        <button
                          type="button"
                          onClick={() => setSuratTugasPelanggan(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-md transition cursor-pointer mx-auto"
                          title="Terbitkan Surat Tugas Penarikan Aset STO"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Surat Sita Aset</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedPelanggan(item)}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] border border-slate-700 transition cursor-pointer"
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
                  <div className="font-mono text-amber-400">{selectedPelanggan.odp_id} (Port {selectedPelanggan.port_odp})</div>
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
                <div><strong>Titik Distribusi ODP:</strong> {suratTugasPelanggan.odp_id}</div>
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
