import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Printer, FileText, Search } from 'lucide-react';

function LaporanAudit() {
  const { isDark } = useTheme();
  const { tugas, permohonan, detailPermohonan, barang, users } = useApp();

  const [search, setSearch] = useState('');

  // Enrich task reports
  const laporanList = useMemo(() => {
    return tugas.map((task) => {
      const tech = users.find((u) => u.id === task.teknisi_id);
      const pimpinan = users.find((u) => u.id === task.pimpinan_id);

      // Find released material items
      const taskReqs = permohonan.filter(p => p.tugas_id === task.id && p.status === 'Released');
      const materialList = [];

      taskReqs.forEach(req => {
        const details = detailPermohonan.filter(d => d.permohonan_id === req.id);
        details.forEach(d => {
          const item = barang.find(b => b.id === d.barang_id);
          if (item) {
            materialList.push({
              nama_barang: item.nama_barang,
              jumlah: d.jumlah_minta,
              satuan: item.satuan
            });
          }
        });
      });

      return {
        ...task,
        teknisi: tech,
        pimpinan: pimpinan,
        materials: materialList
      };
    });
  }, [tugas, permohonan, detailPermohonan, barang, users]);

  const filtered = laporanList.filter((item) => {
    return (
      item.pelanggan_nama?.toLowerCase().includes(search.toLowerCase()) ||
      item.lokasi?.toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).includes(search)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <span>Riwayat & Laporan Audit Pekerjaan Lapangan</span>
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Rekapitulasi resmi penugasan, material keluar gudang, bukti foto penanganan, dan verifikasi akhir.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Berita Acara (Print)</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="no-print relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari ID tiket, pelanggan, atau lokasi..."
          className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs border outline-none transition ${
            isDark
              ? 'bg-slate-950 border-slate-700 text-white focus:border-rose-500'
              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
          }`}
        />
      </div>

      {/* Report Cards List */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-2xl border transition-all shadow-md ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-rose-500 text-sm">
                    TGS-{String(item.id).padStart(3, '0')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.jenis_kerja === 'Pasang Baru' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                    item.jenis_kerja === 'Gangguan' ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' :
                    'bg-purple-500/20 text-purple-500 border-purple-500/30'
                  }`}>
                    {item.jenis_kerja}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <strong>{item.pelanggan_nama}</strong> — {item.lokasi}
                </p>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Teknisi: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{item.teknisi?.nama_lengkap}</strong> | Tanggal: {item.waktu_buat}
                </div>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase self-start sm:self-auto border ${
                item.status === 'Done' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                item.status === 'Progress' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                'bg-amber-500/20 text-amber-500 border-amber-500/30'
              }`}>
                ● {item.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Materials Used */}
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider block mb-1.5">
                  Material Terpakai (Gudang):
                </span>
                {item.materials?.length > 0 ? (
                  <ul className="space-y-1">
                    {item.materials.map((m, idx) => (
                      <li key={idx} className="flex items-center justify-between text-slate-300 dark:text-slate-200">
                        <span>• {m.nama_barang}</span>
                        <span className="font-mono font-bold text-amber-500">
                          {m.jumlah} {m.satuan}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">Tidak ada pemakaian material tercatat.</p>
                )}
              </div>

              {/* Photo Proof */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider block mb-1.5">
                  Dokumentasi Foto Selesai:
                </span>
                {item.foto_bukti ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={item.foto_bukti}
                      alt="Foto Bukti"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm"
                    />
                    <div className="text-[11px]">
                      <span className="text-emerald-500 font-bold block">✓ Terverifikasi Lapangan</span>
                      {item.waktu_selesai && (
                        <span className="text-slate-400 block text-[10px]">Selesai: {item.waktu_selesai}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">Belum ada foto dokumentasi selesai diunggah.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LaporanAudit;