// oxlint-disable no-unused-vars
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  ClipboardList,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  User,
  X,
  MapPin,
  Phone,
  Eye,
  Plus
} from 'lucide-react';
import ModalDetailRiwayatTeknisi from './ModalDetailRiwayatTeknisi';
import { parseTaskDetails, formatWaktuBuat } from '../utils/taskFormatter';

export default function KelolaTugas({ onOpenCreateModal, onOpenBastp }) {
  const { isDark } = useTheme();
  const {
    tugas = [],
    users = [],
    updateTugas,
    deleteTugas,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [selectedTechnician, setSelectedTechnician] = useState(null);

  // Edit Modal State
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({
    jenis_kerja: '',
    pelanggan_nama: '',
    pelanggan_telp: '',
    lokasi: '',
    teknisi_id: '',
    status: '',
    keterangan: ''
  });

  const technicians = users.filter(u => u.role === 'teknisi');

  const handleStartEdit = (task) => {
    setEditingTask(task);
    setEditForm({
      jenis_kerja: task.jenis_kerja || 'Pasang Baru',
      pelanggan_nama: task.pelanggan_nama || '',
      pelanggan_telp: task.pelanggan_telp || '',
      lokasi: task.lokasi || '',
      teknisi_id: task.teknisi_id ? String(task.teknisi_id) : '',
      status: task.status || 'Open',
      keterangan: task.keterangan || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    await updateTugas(editingTask.id, {
      jenis_kerja: editForm.jenis_kerja,
      pelanggan_nama: editForm.pelanggan_nama,
      pelanggan_telp: editForm.pelanggan_telp,
      lokasi: editForm.lokasi,
      teknisi_id: editForm.teknisi_id ? parseInt(editForm.teknisi_id, 10) : null,
      status: editForm.status,
      keterangan: editForm.keterangan
    });

    setEditingTask(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Yakin ingin membatalkan & menghapus tiket #${id}?`)) {
      await deleteTugas(id);
    }
  };

  // Filter tugas
  const filteredTugas = tugas.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      String(t.id).includes(q) ||
      (t.pelanggan_nama || '').toLowerCase().includes(q) ||
      (t.lokasi || '').toLowerCase().includes(q) ||
      (t.jenis_kerja || '').toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchJenis = jenisFilter === 'all' || t.jenis_kerja === jenisFilter;

    return matchSearch && matchStatus && matchJenis;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/40 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30 shadow-[0_0_12px_rgba(225,29,72,0.2)]">
              <ClipboardList className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-white">Manajemen Penugasan Lapangan (CRUD Tiket)</h1>
          </div>
        </div>

        {onOpenCreateModal && (
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 hover:shadow-rose-900/40 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Tiket Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/40 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID tiket, nama pelanggan, lokasi jalan, atau jenis pekerjaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border bg-slate-950/80 border-rose-950/40 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border bg-slate-950/80 border-rose-950/40 text-slate-200 focus:outline-none focus:border-rose-500/60 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="Open">Open (Menunggu)</option>
            <option value="Progress">Progress (Dikerjakan)</option>
            <option value="Done">Done (Selesai)</option>
          </select>

          {/* Jenis Kerja Filter */}
          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border bg-slate-950/80 border-rose-950/40 text-slate-200 focus:outline-none focus:border-rose-500/60 cursor-pointer"
          >
            <option value="all">Semua Jenis Kerja</option>
            <option value="Pasang Baru">Pasang Baru</option>
            <option value="Gangguan">Gangguan (LOS)</option>
            <option value="ODP">Maintenance ODP</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Tiket dengan Dark-Red Glassmorphism */}
      <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/40 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-rose-950/40 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">ID Tiket</th>
                <th className="px-5 py-3.5">Jenis Pekerjaan</th>
                <th className="px-5 py-3.5">Pelanggan &amp; Lokasi</th>
                <th className="px-5 py-3.5">Teknisi Bertugas</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-950/20">
              {filteredTugas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400 italic">
                    Tidak ada tiket pekerjaan yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredTugas.map((task) => {
                  const tech = users.find(u => Number(u.id) === Number(task.teknisi_id));
                  const isDone = task.status === 'Done';
                  const isProgress = task.status === 'Progress';
                  const cust = parseTaskDetails(task);

                  return (
                    <tr key={task.id} className="hover:bg-rose-950/10 transition-colors">
                      {/* Kolom ID Tiket */}
                      <td className="px-5 py-3.5 font-mono font-black text-rose-500 text-sm tracking-wider whitespace-nowrap">
                        #{task.id}
                      </td>

                      {/* Kolom Jenis Pekerjaan */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap border tracking-wide ${
                          task.jenis_kerja?.toLowerCase().includes('pasang')
                            ? 'bg-blue-950/60 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                            : (task.jenis_kerja?.toLowerCase().includes('gangguan') || task.jenis_kerja?.toLowerCase().includes('putus'))
                            ? 'bg-rose-950/60 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(225,29,72,0.15)]'
                            : task.jenis_kerja?.toLowerCase().includes('modem')
                            ? 'bg-amber-950/60 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                            : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                        }`}>
                          {task.jenis_kerja}
                        </span>
                      </td>

                      {/* Kolom Pelanggan & Lokasi (Bebas String Clutter) */}
                      <td className="px-5 py-3.5 min-w-[260px]">
                        <div className="space-y-1">
                          <div className="font-extrabold text-white text-xs tracking-wide">
                            {cust.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate max-w-xs" title={cust.address}>{cust.address}</span>
                          </div>
                          {cust.telp && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{cust.telp}</span>
                            </div>
                          )}
                          {cust.note && (
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-300/80 italic">
                              <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate max-w-xs" title={cust.note}>{cust.note}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                            Waktu Buat: {formatWaktuBuat(task)}
                          </div>
                        </div>
                      </td>

                      {/* Kolom Teknisi */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {tech ? (
                          <button
                            type="button"
                            onClick={() => setSelectedTechnician(tech)}
                            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-semibold transition text-left"
                            title="Lihat detail & riwayat kerja teknisi ini"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0"></span>
                            <span>{tech.nama_lengkap}</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)] inline-flex items-center gap-1">
                            📢 Terbuka di Pool
                          </span>
                        )}
                      </td>

                      {/* Kolom Status (Neon Glow Badges) */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase inline-block ${
                          isDone
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : isProgress
                            ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        }`}>
                          ● {task.status || 'Open'}
                        </span>
                      </td>

                      {/* Kolom Aksi */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDone && onOpenBastp && (
                            <button
                              onClick={() => onOpenBastp(task)}
                              className="px-2.5 py-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 hover:border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.2)] hover:shadow-[0_0_15px_rgba(225,29,72,0.35)] text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Buka Dokumen Resmi BASTP"
                            >
                              <FileText className="w-3 h-3" />
                              <span>BASTP</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleStartEdit(task)}
                            className="px-2.5 py-1 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-500/40 hover:border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)] text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Edit Data Tiket"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDelete(task.id)}
                            className="px-2.5 py-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-600/40 hover:border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.2)] text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Batalkan / Hapus Tiket"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
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

      {/* Modal Edit Tiket Penugasan */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] bg-slate-950/90 backdrop-blur-2xl border-rose-950/50 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-rose-950/40">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                  <Edit2 className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold">Edit Tiket Penugasan #{editingTask.id}</h3>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-400">Jenis Pekerjaan</label>
                  <select
                    value={editForm.jenis_kerja}
                    onChange={(e) => setEditForm({ ...editForm, jenis_kerja: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-900/80 border-rose-950/40 text-white focus:outline-none focus:border-rose-500/60"
                  >
                    <option value="Pasang Baru">Pasang Baru</option>
                    <option value="Gangguan">Gangguan (LOS)</option>
                    <option value="ODP">Maintenance ODP</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">Status Tiket</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-900/80 border-rose-950/40 text-white focus:outline-none focus:border-rose-500/60"
                  >
                    <option value="Open">Open (Menunggu)</option>
                    <option value="Progress">Progress (Dikerjakan)</option>
                    <option value="Done">Done (Selesai)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-400">Nama Pelanggan</label>
                  <input
                    type="text"
                    required
                    value={editForm.pelanggan_nama}
                    onChange={(e) => setEditForm({ ...editForm, pelanggan_nama: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-900/80 border-rose-950/40 text-white focus:outline-none focus:border-rose-500/60"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">No. Telepon / HP</label>
                  <input
                    type="text"
                    value={editForm.pelanggan_telp}
                    onChange={(e) => setEditForm({ ...editForm, pelanggan_telp: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-900/80 border-rose-950/40 text-white focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">Alamat Lokasi Pelanggan</label>
                <input
                  type="text"
                  required
                  value={editForm.lokasi}
                  onChange={(e) => setEditForm({ ...editForm, lokasi: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-900/80 border-rose-950/40 text-white focus:outline-none focus:border-rose-500/60"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">Teknisi Penanggung Jawab</label>
                <select
                  value={editForm.teknisi_id}
                  onChange={(e) => setEditForm({ ...editForm, teknisi_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-900/80 border-rose-950/40 text-white focus:outline-none focus:border-rose-500/60"
                >
                  <option value="">-- Siarkan Terbuka di Pool Teknisi --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.nama_lengkap} ({tech.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">Keterangan / Instruksi Kerja</label>
                <textarea
                  rows="2"
                  value={editForm.keterangan}
                  onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-900/80 border-rose-950/40 text-white focus:outline-none focus:border-rose-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-rose-950/40">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold shadow-lg shadow-rose-950/40 transition active:scale-95 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail & Riwayat Kerja Teknisi */}
      {selectedTechnician && (
        <ModalDetailRiwayatTeknisi
          teknisi={selectedTechnician}
          onClose={() => setSelectedTechnician(null)}
          onOpenBastp={onOpenBastp}
          onNavigateToTracking={() => {}}
        />
      )}
    </div>
  );
}
