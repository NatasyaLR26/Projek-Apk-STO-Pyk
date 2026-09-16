import React, { useState, useEffect } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { Printer, FileText, CheckCircle2, Users, Package, RefreshCw } from 'lucide-react';

const AuditReportPage = () => {
  const [reportData, setReportData] = useState({ summary: {}, records: [] });
  const [loading, setLoading] = useState(false);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/audit');
      setReportData(res.data.data || { summary: {}, records: [] });
    } catch (err) {
      console.error('Error fetching audit report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const { summary = {}, records = [] } = reportData;

  return (
    <div className="space-y-6">
      {/* Control Bar (Hidden on print) */}
      <div className="no-print flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            Laporan Audit Operasional STO Telkom Akses
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Rekapitulasi tiket selesai, alokasi material gudang yang keluar, dan verifikasi bukti foto lapangan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan (PDF)</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards (Hidden on print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tiket Selesai</p>
            <h3 className="text-2xl font-black text-white">{summary.total_tugas_selesai || 0}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Teknisi Bertugas</p>
            <h3 className="text-2xl font-black text-white">{summary.total_teknisi_terlibat || 0}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Material Terpakai</p>
            <h3 className="text-2xl font-black text-white">{summary.total_material_keluar || 0} Unit</h3>
          </div>
        </div>
      </div>

      {/* Printable Area - Formatted as Telkom Akses Official Audit Document */}
      <div className="printable-area bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        {/* Formal Letterhead */}
        <div className="flex items-center justify-between pb-6 border-b-2 border-red-600 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-xl tracking-wider">
              STO
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">
                PT Telkom Akses STO Payakumbuh
              </h1>
              <p className="text-xs text-slate-400">
                Divisi Pemeliharaan Jaringan & Logistik Material Operasional
              </p>
              <p className="text-[11px] text-slate-400">
                Jl. Soekarno Hatta No. 45, Payakumbuh, Sumatera Barat 26224
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
              Dokumen Resmi Audit
            </span>
            <span className="font-mono text-xs font-bold text-red-400">
              NO: STO-PYK/AUD/{new Date().getFullYear()}/{String(new Date().getMonth() + 1).padStart(2, '0')}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Rekapitulasi Tiket Selesai & Pemakaian Material
          </h2>
          <p className="text-xs text-slate-400">Periode Berjalan Tahun {new Date().getFullYear()}</p>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="print-table w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 uppercase text-[11px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 font-semibold">No</th>
                <th className="py-3 px-3 font-semibold">ID Tiket</th>
                <th className="py-3 px-3 font-semibold">Pekerjaan</th>
                <th className="py-3 px-3 font-semibold">Teknisi & Pimpinan</th>
                <th className="py-3 px-3 font-semibold">Lokasi Pelanggan</th>
                <th className="py-3 px-3 font-semibold">Material Terpakai (Gudang)</th>
                <th className="py-3 px-3 font-semibold">Bukti Foto Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    Belum ada tiket tugas yang selesai untuk ditampilkan dalam laporan audit.
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => (
                  <tr key={rec.tugas_id} className="align-top">
                    <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                      TGS-{String(rec.tugas_id).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {rec.jenis_kerja}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-white">{rec.nama_teknisi || '-'}</p>
                      <p className="text-[10px] text-slate-400">Otorisasi: {rec.nama_pimpinan || '-'}</p>
                    </td>
                    <td className="py-3 px-3 max-w-xs text-slate-300">
                      {rec.lokasi}
                    </td>
                    <td className="py-3 px-3">
                      {rec.material_terpakai && rec.material_terpakai.length > 0 ? (
                        <div className="space-y-1">
                          {rec.material_terpakai.map((p, pIdx) => (
                            <div key={pIdx}>
                              {p.items?.map((it, itIdx) => (
                                <span
                                  key={itIdx}
                                  className="inline-block text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 mr-1 mb-1"
                                >
                                  {it.nama_barang}: <strong>{it.jumlah} {it.satuan}</strong>
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {rec.foto_bukti ? (
                        <div className="space-y-1">
                          <img
                            src={rec.foto_bukti}
                            alt="Bukti Selesai"
                            className="w-16 h-12 object-cover rounded border border-slate-700"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <a
                            href={rec.foto_bukti}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="no-print text-[10px] text-blue-400 hover:underline block"
                          >
                            Buka Foto
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Tidak ada foto</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures for Print Document */}
        <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="text-slate-400 mb-16">Diverifikasi oleh (Admin Gudang),</p>
            <p className="font-bold text-white uppercase underline">Petugas Gudang STO</p>
            <p className="text-[10px] text-slate-400">NIK: 98210344</p>
          </div>
          <div>
            <p className="text-slate-400 mb-16">Disetujui oleh (Pimpinan STO),</p>
            <p className="font-bold text-white uppercase underline">Pimpinan STO Payakumbuh</p>
            <p className="text-[10px] text-slate-400">NIK: 85020112</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditReportPage;
