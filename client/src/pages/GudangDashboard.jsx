import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { showSuccess, showError } from '../utils/toast';
import {
  Package, PlusCircle, CheckCircle,
  RefreshCw, Edit2, Trash2, ShieldCheck
} from 'lucide-react';

const GudangDashboard = ({ activeTab, setActiveTab }) => {
  const [barangList, setBarangList] = useState([]);
  const [permohonanList, setPermohonanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingBarang, setDeletingBarang] = useState(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [releasingPermohonan, setReleasingPermohonan] = useState(null);
  const [isReleasingLoading, setIsReleasingLoading] = useState(false);

  const fetchGudangData = async () => {
    setLoading(true);
    try {
      const [barangRes, permohonanRes] = await Promise.all([
        api.get('/barang'),
        api.get('/permohonan')
      ]);
      setBarangList(barangRes.data.data || []);
      setPermohonanList(permohonanRes.data.data || []);
    } catch (err) {
      console.error('Error fetching gudang data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGudangData();
  }, []);

  // Formik + Yup Validation Form Master Barang (Wajib Sesuai Dokumen)
  const barangFormik = useFormik({
    initialValues: {
      nama_barang: editingItem ? editingItem.nama_barang : '',
      stok: editingItem ? editingItem.stok : 0,
      satuan: editingItem ? editingItem.satuan : 'Pcs'
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nama_barang: Yup.string().required('Nama barang wajib diisi'),
      stok: Yup.number().min(0, 'Stok tidak boleh negatif').required('Wajib diisi'),
      satuan: Yup.string().required('Satuan wajib diisi')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        if (editingItem) {
          await api.put(`/barang/${editingItem.id}`, values);
          showSuccess('Inventaris Diperbarui', 'Data inventaris berhasil diperbarui.');
        } else {
          await api.post('/barang', values);
          showSuccess('Barang Ditambahkan', 'Barang baru berhasil ditambahkan ke gudang.');
        }
        resetForm();
        setEditingItem(null);
        setIsModalOpen(false);
        fetchGudangData();
      } catch (err) {
        showError('Gagal Menyimpan Barang', err.response?.data?.message || 'Gagal menyimpan data barang.');
      }
    }
  });

  // Release material with ACID Transaction and automatic stock cut
  const confirmReleaseMaterial = async () => {
    if (!releasingPermohonan) return;
    setIsReleasingLoading(true);
    try {
      await api.patch(`/permohonan/${releasingPermohonan.id}/release`);
      showSuccess('Material Diserahkan', 'Material diserahkan & stok gudang otomatis terpotong (ACID).');
      setReleasingPermohonan(null);
      fetchGudangData();
    } catch (err) {
      showError('Gagal Serahkan Material', err.response?.data?.message || 'Gagal menyerahkan material.');
    } finally {
      setIsReleasingLoading(false);
    }
  };

  const confirmDeleteBarang = async () => {
    if (!deletingBarang) return;
    setIsDeletingLoading(true);
    try {
      await api.delete(`/barang/${deletingBarang.id}`);
      showSuccess('Barang Dihapus', `Barang "${deletingBarang.nama_barang}" berhasil dihapus dari inventaris.`);
      setDeletingBarang(null);
      fetchGudangData();
    } catch (err) {
      showError('Gagal Hapus Barang', err.response?.data?.message || 'Gagal menghapus barang.');
    } finally {
      setIsDeletingLoading(false);
    }
  };

  const approvedPermohonan = permohonanList.filter(p => p.status === 'Approved');
  const releasedPermohonan = permohonanList.filter(p => p.status === 'Released');

  return (
    <div className="space-y-6">

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-900/30 border border-amber-400/40">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Manajemen Inventaris & Logistik Gudang STO
            </h1>
            <p className="text-xs text-slate-400">
              Pengelolaan stok fisik, serah terima material, dan pemotongan stok otomatis ACID
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGudangData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* View: Master Stok Barang */}
      {activeTab === 'stok' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Tabel Stok Aktual Gudang</h2>
              <p className="text-xs text-slate-400">Kuantitas inventaris fisik material jaringan STO Telkom Payakumbuh</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400">
              Total {barangList.length} Item
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 uppercase text-[11px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">ID Barang</th>
                  <th className="py-3 px-4 font-semibold">Nama Barang / Material</th>
                  <th className="py-3 px-4 font-semibold">Stok Aktual</th>
                  <th className="py-3 px-4 font-semibold">Satuan</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {barangList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                      BRG-{String(item.id).padStart(3, '0')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {item.nama_barang}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg border ${
                          item.stok > 10
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {item.stok}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-slate-400 font-semibold">
                      {item.satuan}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit Barang"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingBarang(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 transition-colors"
                        title="Hapus Barang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Serah Terima Material (Release & Potong Stok) */}
      {activeTab === 'serah-terima' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Permohonan Disetujui Pimpinan (Siap Diserahkan)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Klik tombol "Serahkan Barang" untuk me-release material & otomatis memotong stok gudang (ACID Transaction)
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              {approvedPermohonan.length} Siap Diserahkan
            </span>
          </div>

          <div className="space-y-4">
            {approvedPermohonan.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Tidak ada permohonan yang menunggu serah terima barang saat ini.
              </div>
            ) : (
              approvedPermohonan.map((perm) => (
                <div
                  key={perm.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          Permohonan #{perm.id} &bull; Tiket TGS-{String(perm.tugas_id).padStart(3, '0')}
                        </span>
                        <StatusBadge status="Approved" />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Teknisi: <strong className="text-white">{perm.nama_teknisi}</strong> &bull; Pekerjaan: {perm.jenis_kerja}
                      </p>
                    </div>

                    <button
                      onClick={() => setReleasingPermohonan(perm)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all self-end sm:self-auto"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Serahkan Barang & Potong Stok (ACID)</span>
                    </button>
                  </div>

                  {/* List of items */}
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Rincian Barang yang Dikeluarkan:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {perm.items?.map((item) => (
                        <div
                          key={item.detail_id}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">{item.nama_barang}</p>
                            <p className="text-[10px] text-slate-400">
                              Stok Sekarang: <strong className="text-slate-200">{item.stok_gudang} {item.satuan}</strong>
                            </p>
                          </div>
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                            -{item.jumlah_minta} {item.satuan}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* History of Released Materials */}
          {releasedPermohonan.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Riwayat Barang Sudah Diserahkan ({releasedPermohonan.length})
              </h3>
              <div className="space-y-2">
                {releasedPermohonan.map(p => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-slate-400">Permohonan #{p.id}</span>
                      <p className="font-medium text-slate-200">
                        Penerima: {p.nama_teknisi} &bull; TGS-{String(p.tugas_id).padStart(3, '0')}
                      </p>
                    </div>
                    <StatusBadge status="Released" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Form Master Barang (Gudang) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Data Barang' : 'Tambah Barang Baru'}
      >
        <form onSubmit={barangFormik.handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Nama Barang / Material
            </label>
            <input
              id="nama_barang"
              name="nama_barang"
              type="text"
              placeholder="Contoh: Kabel FO Dropcore"
              onChange={barangFormik.handleChange}
              onBlur={barangFormik.handleBlur}
              value={barangFormik.values.nama_barang}
              className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {barangFormik.touched.nama_barang && barangFormik.errors.nama_barang && (
              <p className="text-xs text-red-400 mt-1 font-medium">{barangFormik.errors.nama_barang}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Stok Awal / Aktual
            </label>
            <input
              id="stok"
              name="stok"
              type="number"
              min="0"
              placeholder="0"
              onChange={barangFormik.handleChange}
              onBlur={barangFormik.handleBlur}
              value={barangFormik.values.stok}
              className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {barangFormik.touched.stok && barangFormik.errors.stok && (
              <p className="text-xs text-red-400 mt-1 font-medium">{barangFormik.errors.stok}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Satuan Material
            </label>
            <select
              id="satuan"
              name="satuan"
              onChange={barangFormik.handleChange}
              onBlur={barangFormik.handleBlur}
              value={barangFormik.values.satuan}
              className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Roll">Roll</option>
              <option value="Pcs">Pcs</option>
              <option value="Meter">Meter</option>
              <option value="Pack">Pack</option>
            </select>
            {barangFormik.touched.satuan && barangFormik.errors.satuan && (
              <p className="text-xs text-red-400 mt-1 font-medium">{barangFormik.errors.satuan}</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30"
            >
              {editingItem ? 'Simpan Perubahan' : 'Tambahkan Barang'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog: Hapus Master Barang */}
      <ConfirmDialog
        isOpen={!!deletingBarang}
        onClose={() => setDeletingBarang(null)}
        onConfirm={confirmDeleteBarang}
        title="Hapus Master Barang?"
        message={
          <div>
            <p>Apakah Anda yakin ingin menghapus barang <strong className="text-white">"{deletingBarang?.nama_barang}"</strong> dari master inventaris?</p>
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p><span className="text-slate-500">Kode Barang:</span> <strong className="font-mono text-white">BRG-{String(deletingBarang?.id || '').padStart(3, '0')}</strong></p>
              <p><span className="text-slate-500">Sisa Stok:</span> <strong className="text-amber-400">{deletingBarang?.stok} {deletingBarang?.satuan}</strong></p>
            </div>
            <p className="mt-2 text-rose-400 text-[11px]">Tindakan ini tidak dapat dibatalkan jika barang belum memiliki riwayat transaksi.</p>
          </div>
        }
        confirmText="Ya, Hapus Barang"
        cancelText="Batal"
        type="danger"
        isLoading={isDeletingLoading}
      />

      {/* Confirmation Dialog: Serah Terima Material (ACID Stock Cut) */}
      <ConfirmDialog
        isOpen={!!releasingPermohonan}
        onClose={() => setReleasingPermohonan(null)}
        onConfirm={confirmReleaseMaterial}
        title={`Konfirmasi Serah Terima Material #${releasingPermohonan?.id}`}
        message={
          <div>
            <p>Serahkan material permohonan kepada teknisi <strong className="text-white">{releasingPermohonan?.nama_teknisi}</strong>?</p>
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Tiket Tugas:</span>
                <span className="font-mono font-bold text-white">TGS-{String(releasingPermohonan?.tugas_id || '').padStart(3, '0')}</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">Rincian Stok yang Akan Dipotong (ACID):</p>
                <ul className="space-y-1">
                  {releasingPermohonan?.items?.map(it => (
                    <li key={it.detail_id} className="flex justify-between text-slate-200">
                      <span>&bull; {it.nama_barang}</span>
                      <span className="font-mono text-emerald-400 font-bold">-{it.jumlah_minta} {it.satuan}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-2 text-emerald-400 text-[11px]">Stok gudang akan otomatis dipotong secara atomik melalui PostgreSQL ACID Transaction.</p>
          </div>
        }
        confirmText="Ya, Serahkan & Potong Stok"
        cancelText="Batal"
        type="success"
        isLoading={isReleasingLoading}
      />
    </div>
  );
};

export default GudangDashboard;
