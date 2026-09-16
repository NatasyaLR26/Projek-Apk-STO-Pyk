import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/client';
import MapView, { ODP_POINTS } from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AuditReportPage from './AuditReportPage';
import { showSuccess, showError } from '../utils/toast';
import { MapPin, PlusCircle, RefreshCw, Check, Eye } from 'lucide-react';

const PimpinanDashboard = ({ activeTab, setActiveTab }) => {
  const [tugasList, setTugasList] = useState([]);
  const [trackingList, setTrackingList] = useState([]);
  const [permohonanList, setPermohonanList] = useState([]);
  const [teknisiList, setTeknisiList] = useState([]);
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('teknisi'); // 'teknisi' | 'odp'
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvingPermohonan, setApprovingPermohonan] = useState(null);
  const [isApprovingLoading, setIsApprovingLoading] = useState(false);

  // 1. Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [tugasRes, trackingRes, permohonanRes, teknisiRes] = await Promise.all([
        api.get('/tugas'),
        api.get('/tracking/active/all'),
        api.get('/permohonan'),
        api.get('/auth/teknisi')
      ]);

      setTugasList(tugasRes.data.data || []);
      setTrackingList(trackingRes.data.data || []);
      setPermohonanList(permohonanRes.data.data || []);
      setTeknisiList(teknisiRes.data.data || []);
    } catch (err) {
      console.error('Error fetching pimpinan dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh tracking coordinates every 10 seconds for real-time WebGIS
    const interval = setInterval(() => {
      api.get('/tracking/active/all')
        .then(res => setTrackingList(res.data.data || []))
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // 2. Formik + Yup Form Buat Tiket Tugas (Wajib Sesuai Dokumen)
  const taskFormik = useFormik({
    initialValues: {
      teknisi_id: '',
      jenis_kerja: '',
      lokasi: ''
    },
    validationSchema: Yup.object({
      teknisi_id: Yup.number().required('Pilih teknisi'),
      jenis_kerja: Yup.string().required('Pilih jenis pekerjaan'),
      lokasi: Yup.string().required('Alamat pelanggan wajib diisi')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const response = await api.post('/tugas', values);
        showSuccess('Tiket Diterbitkan', 'Tiket penugasan berhasil diterbitkan!');
        resetForm();
        setIsTaskModalOpen(false);
        fetchData();
      } catch (err) {
        showError('Gagal Buat Tiket', err.response?.data?.message || 'Gagal membuat tiket tugas.');
      }
    }
  });

  // 3. Approval Permohonan Material
  const handleApprovePermohonan = async (id) => {
    setIsApprovingLoading(true);
    try {
      await api.patch(`/permohonan/${id}/approve`);
      showSuccess('Permohonan Disetujui', 'Permohonan material telah disetujui.');
      setApprovingPermohonan(null);
      fetchData();
    } catch (err) {
      showError('Gagal Otorisasi', err.response?.data?.message || 'Gagal menyetujui permohonan.');
    } finally {
      setIsApprovingLoading(false);
    }
  };

  const pendingPermohonan = permohonanList.filter(p => p.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Header Info & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
            Pusat Komando & WebGIS STO Payakumbuh
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring posisi teknisi lapangan, delegasi tiket tugas, dan otorisasi logistik material
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Muat ulang data"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Tiket Tugas</span>
          </button>
        </div>
      </div>

      {/* View: WebGIS Live Tracking */}
      {activeTab === 'gis' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Leaflet Map View */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-500" />
                Peta Monitoring Lapangan Real-Time
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">● Sensor GPS Aktif (Auto-Sync 10s)</span>
            </div>

            <MapView
              trackingData={trackingList}
              selectedTracking={selectedTracking}
              height="540px"
            />
          </div>

          {/* Sidebar: Active Field Technicians & ODP Infrastructure */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[580px]">
            {/* Header Tab Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSidebarTab('teknisi')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                    sidebarTab === 'teknisi'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Teknisi ({trackingList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('odp')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                    sidebarTab === 'odp'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ODP ({ODP_POINTS.length})
                </button>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Payakumbuh</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {sidebarTab === 'teknisi' ? (
                trackingList.length === 0 ? (
                  <div className="text-center py-12 px-4 text-slate-500 text-xs">
                    <p className="font-semibold text-slate-300 mb-1">Belum Ada Sinyal GPS Aktif</p>
                    <p className="text-slate-500 text-[11px]">
                      Teknisi dapat mengaktifkan pelacakan GPS melalui portal lapangan saat bertugas.
                    </p>
                  </div>
                ) : (
                  trackingList.map((item) => (
                    <div
                      key={item.tugas_id}
                      onClick={() => setSelectedTracking(item)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedTracking?.tugas_id === item.tugas_id
                          ? 'bg-red-950/40 border-red-500/50 shadow-md shadow-red-900/20'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
                            {item.nama_teknisi?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">{item.nama_teknisi}</p>
                            <p className="text-[11px] text-slate-400 font-mono">TGS-{String(item.tugas_id).padStart(3, '0')}</p>
                          </div>
                        </div>
                        <StatusBadge status={item.status_tugas} />
                      </div>

                      <div className="mt-3 text-[11px] text-slate-300 space-y-1">
                        <p><span className="text-slate-500">Pekerjaan:</span> <span className="text-white font-medium">{item.jenis_kerja}</span></p>
                        <p className="line-clamp-1"><span className="text-slate-500">Lokasi:</span> {item.lokasi}</p>
                        <p className="text-slate-400 font-mono text-[10px]">
                          📍 {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Waktu Update:</span>
                        <span className="font-mono text-emerald-400">
                          {item.waktu_update ? new Date(item.waktu_update).toLocaleTimeString('id-ID') : '-'}
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                ODP_POINTS.map((odp) => (
                  <div
                    key={odp.id}
                    onClick={() => setSelectedTracking({ latitude: odp.lat, longitude: odp.lng, odpId: odp.id })}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTracking?.odpId === odp.id
                        ? 'bg-cyan-950/50 border-cyan-500/60 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">
                          {odp.id}
                        </span>
                        <p className="font-bold text-white text-xs mt-1">{odp.nama}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        odp.status.includes('Penuh')
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {odp.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">📍 {odp.lokasi}</p>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Port: <strong className="text-white">{odp.kapasitas}</strong></span>
                      <span className="font-mono text-cyan-400">Redaman: {odp.redaman}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* View: Tiket Tugas Management */}
      {activeTab === 'tugas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Daftar Tiket Tugas STO</h2>
              <p className="text-xs text-slate-400 mt-0.5">Semua riwayat dan status penugasan teknisi lapangan</p>
            </div>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tiket Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[11px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">ID Tiket</th>
                  <th className="py-3 px-4 font-semibold">Jenis Pekerjaan</th>
                  <th className="py-3 px-4 font-semibold">Teknisi</th>
                  <th className="py-3 px-4 font-semibold">Alamat Pelanggan</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Material</th>
                  <th className="py-3 px-4 font-semibold">Bukti Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tugasList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      Belum ada tiket tugas yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  tugasList.map((tugas) => (
                    <tr key={tugas.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        TGS-{String(tugas.id).padStart(3, '0')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {tugas.jenis_kerja}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-white">{tugas.nama_teknisi || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                        {tugas.lokasi}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={tugas.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {tugas.permohonan_list && tugas.permohonan_list.length > 0 ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {tugas.permohonan_list.length} Request
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {tugas.foto_bukti ? (
                          <a
                            href={tugas.foto_bukti}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat Foto
                          </a>
                        ) : (
                          <span className="text-slate-600">Belum ada</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Approval Permohonan Material */}
      {activeTab === 'approval' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Otorisasi Permohonan Material</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pimpinan menyetujui pengeluaran material logistik sebelum diserahkan oleh gudang
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
              {pendingPermohonan.length} Menunggu Persetujuan
            </span>
          </div>

          <div className="space-y-4">
            {permohonanList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Belum ada permohonan material yang diajukan teknisi.
              </div>
            ) : (
              permohonanList.map((perm) => (
                <div
                  key={perm.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 transition-all hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/30">
                        #{perm.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            Tiket: TGS-{String(perm.tugas_id).padStart(3, '0')} ({perm.jenis_kerja})
                          </span>
                          <StatusBadge status={perm.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Pemohon: <strong className="text-slate-300">{perm.nama_teknisi}</strong> &bull; {perm.lokasi}
                        </p>
                      </div>
                    </div>

                    {perm.status === 'Pending' && (
                      <button
                        onClick={() => setApprovingPermohonan(perm)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all self-end sm:self-auto"
                      >
                        <Check className="w-4 h-4" />
                        <span>Setujui Permohonan</span>
                      </button>
                    )}
                  </div>

                  {/* Material Item List */}
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Rincian Material Diminta:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {perm.items?.map((item) => (
                        <div
                          key={item.detail_id || item.barang_id}
                          className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">{item.nama_barang}</p>
                            <p className="text-[10px] text-slate-500">Stok Gudang: {item.stok_gudang} {item.satuan}</p>
                          </div>
                          <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                            {item.jumlah_minta} {item.satuan}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View: Laporan Audit */}
      {activeTab === 'audit' && (
        <AuditReportPage />
      )}

      {/* Modal: Form Buat Tiket Tugas (Pimpinan) */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Buat Tiket Tugas Baru"
      >
        <form onSubmit={taskFormik.handleSubmit} className="space-y-4">
          {/* Teknisi Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Tunjuk Teknisi Lapangan
            </label>
            <select
              id="teknisi_id"
              name="teknisi_id"
              onChange={taskFormik.handleChange}
              onBlur={taskFormik.handleBlur}
              value={taskFormik.values.teknisi_id}
              className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Pilih Teknisi --</option>
              {teknisiList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_lengkap} ({t.email})
                </option>
              ))}
            </select>
            {taskFormik.touched.teknisi_id && taskFormik.errors.teknisi_id && (
              <p className="text-xs text-red-400 mt-1 font-medium">{taskFormik.errors.teknisi_id}</p>
            )}
          </div>

          {/* Jenis Pekerjaan */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Jenis Pekerjaan
            </label>
            <select
              id="jenis_kerja"
              name="jenis_kerja"
              onChange={taskFormik.handleChange}
              onBlur={taskFormik.handleBlur}
              value={taskFormik.values.jenis_kerja}
              className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Pilih Jenis Pekerjaan --</option>
              <option value="Pasang Baru">Pasang Baru (IndiHome / B2B)</option>
              <option value="Gangguan">Gangguan (Troubleshoot Kabel/ONT)</option>
              <option value="ODP">ODP (Optical Distribution Point / Maintenance)</option>
            </select>
            {taskFormik.touched.jenis_kerja && taskFormik.errors.jenis_kerja && (
              <p className="text-xs text-red-400 mt-1 font-medium">{taskFormik.errors.jenis_kerja}</p>
            )}
          </div>

          {/* Lokasi / Alamat Pelanggan */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Alamat Lengkap Pelanggan
            </label>
            <textarea
              id="lokasi"
              name="lokasi"
              rows="3"
              placeholder="Contoh: Jl. Soekarno Hatta No. 88, Payakumbuh Barat"
              onChange={taskFormik.handleChange}
              onBlur={taskFormik.handleBlur}
              value={taskFormik.values.lokasi}
              className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            ></textarea>
            {taskFormik.touched.lokasi && taskFormik.errors.lokasi && (
              <p className="text-xs text-red-400 mt-1 font-medium">{taskFormik.errors.lokasi}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all"
            >
              Terbitkan Tiket
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!approvingPermohonan}
        onClose={() => setApprovingPermohonan(null)}
        onConfirm={() => handleApprovePermohonan(approvingPermohonan?.id)}
        title={`Otorisasi Permohonan #${approvingPermohonan?.id}`}
        message={
          <div>
            <p>Apakah Anda yakin ingin menyetujui pengeluaran material untuk tiket <strong>TGS-{String(approvingPermohonan?.tugas_id || '').padStart(3, '0')}</strong>?</p>
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p><span className="text-slate-500">Teknisi:</span> <strong className="text-white">{approvingPermohonan?.nama_teknisi}</strong></p>
              <p><span className="text-slate-500">Pekerjaan:</span> <strong className="text-white">{approvingPermohonan?.jenis_kerja}</strong></p>
              <p><span className="text-slate-500">Lokasi:</span> {approvingPermohonan?.lokasi}</p>
              <p><span className="text-slate-500">Total Material:</span> <span className="font-mono text-amber-400 font-bold">{approvingPermohonan?.items?.length || 0} jenis barang</span></p>
            </div>
            <p className="mt-2 text-slate-400 text-[11px]">Setelah disetujui, petugas logistik gudang dapat segera melakukan serah terima fisik barang.</p>
          </div>
        }
        confirmText="Ya, Setujui Permohonan"
        cancelText="Batal"
        type="success"
        isLoading={isApprovingLoading}
      />
    </div>
  );
};

export default PimpinanDashboard;
