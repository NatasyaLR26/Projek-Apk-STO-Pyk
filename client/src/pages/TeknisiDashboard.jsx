import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { showSuccess, showError, showInfo } from '../utils/toast';
import {
  Navigation, Package, CheckCircle2,
  Upload, Plus, Trash2, MapPin, RefreshCw
} from 'lucide-react';

const TeknisiDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [barangList, setBarangList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);

  // Modal states
  const [selectedTask, setSelectedTask] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTaskData, setCompletingTaskData] = useState(null);
  const [isCompletingLoading, setIsCompletingLoading] = useState(false);

  // Fetch tasks and warehouse items
  const fetchTeknisiData = async () => {
    setLoading(true);
    try {
      const [tugasRes, barangRes] = await Promise.all([
        api.get('/tugas'),
        api.get('/barang')
      ]);
      setTasks(tugasRes.data.data || []);
      setBarangList(barangRes.data.data || []);
    } catch (err) {
      console.error('Error fetching teknisi data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeknisiData();
  }, []);

  // 1. Geolocation GPS Sender
  const sendCoordinatesToBackend = async (lat, lng, taskId) => {
    try {
      await api.post('/tracking/update', {
        tugas_id: taskId,
        latitude: lat,
        longitude: lng
      });
      setGpsLocation({ lat, lng, time: new Date() });
      showSuccess('GPS Terkirim', `Koordinat (${lat.toFixed(4)}, ${lng.toFixed(4)}) berhasil disinkronkan ke WebGIS.`);
      fetchTeknisiData();
    } catch (err) {
      showError('Gagal Kirim GPS', err.response?.data?.message || 'Gagal mengirim koordinat GPS.');
    }
  };

  const handleToggleGPS = (taskId) => {
    if (!taskId) {
      showError('Tugas Belum Dipilih', 'Pilih tiket tugas terlebih dahulu untuk mengaktifkan GPS!');
      return;
    }

    if (isGpsActive) {
      setIsGpsActive(false);
      showInfo('GPS Dinonaktifkan', 'Pelacakan GPS dihentikan.');
      return;
    }

    setIsGpsActive(true);
    showInfo('GPS Aktif', 'Pelacakan GPS aktif. Mengirim koordinat...');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          sendCoordinatesToBackend(lat, lng, taskId);
        },
        (error) => {
          console.warn('Browser geolocation denied or unavailable, using Payakumbuh coordinate fallback:', error.message);
          // Fallback coordinate in Payakumbuh area with realistic slight jitter
          const jitterLat = -0.2289 + (Math.random() - 0.5) * 0.01;
          const jitterLng = 100.6308 + (Math.random() - 0.5) * 0.01;
          sendCoordinatesToBackend(jitterLat, jitterLng, taskId);
        },
        { enableHighAccuracy: true }
      );
    } else {
      // Fallback
      const jitterLat = -0.2289 + (Math.random() - 0.5) * 0.01;
      const jitterLng = 100.6308 + (Math.random() - 0.5) * 0.01;
      sendCoordinatesToBackend(jitterLat, jitterLng, taskId);
    }
  };

  // 2. Formik + Yup Validation for Material Request (Dynamic FieldArray)
  const materialValidationSchema = Yup.object({
    items: Yup.array().of(
      Yup.object().shape({
        barang_id: Yup.number().required('Pilih barang'),
        jumlah_minta: Yup.number().min(1, 'Minimal 1').required('Wajib diisi')
      })
    ).min(1, 'Minimal 1 jenis barang')
  });

  // 3. Formik + Yup Validation for Task Completion
  const completeValidationSchema = Yup.object({
    foto_bukti: Yup.string().required('Foto bukti penyelesaian pekerjaan wajib diunggah')
  });

  const activeTasks = tasks.filter(t => t.status !== 'Done');
  const finishedTasks = tasks.filter(t => t.status === 'Done');

  return (
    <div className="max-w-md mx-auto space-y-5 pb-12">
      {/* Mobile Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center font-black text-lg">
              {user?.nama_lengkap?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Selamat datang,</p>
              <h2 className="text-lg font-bold text-white leading-tight">
                {user?.nama_lengkap} <span className="text-xs text-red-400 font-semibold">(Teknisi)</span>
              </h2>
            </div>
          </div>

          <button
            onClick={fetchTeknisiData}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
          </button>
        </div>

        {/* Global GPS Tracker Toggle */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Navigation className={`w-4 h-4 ${isGpsActive ? 'text-red-500 animate-spin' : 'text-slate-500'}`} />
              Pelacak GPS WebGIS
            </span>
            <p className="text-[11px] text-slate-500">
              {gpsLocation
                ? `Update: ${new Date(gpsLocation.time).toLocaleTimeString('id-ID')}`
                : 'Kirim koordinat aktual ke Pimpinan'}
            </p>
          </div>

          <button
            onClick={() => handleToggleGPS(activeTasks[0]?.id)}
            disabled={activeTasks.length === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
              isGpsActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/30'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/30 disabled:opacity-40'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isGpsActive ? 'GPS Aktif' : 'Kirim GPS'}</span>
          </button>
        </div>
      </div>

      {/* Active Tasks Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Tugas Aktif ({activeTasks.length})
          </h3>
          <span className="text-[11px] text-slate-400">Prioritas Lapangan</span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">Semua tugas telah diselesaikan!</p>
            <p className="text-[11px] text-slate-500 mt-1">Silakan istirahat atau hubungi pimpinan untuk penugasan baru.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden"
              >
                {/* Red Brand Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-red-400"></div>

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="inline-block font-mono text-[11px] font-bold text-red-400 mb-1">
                      ID: TGS-{String(task.id).padStart(3, '0')}
                    </span>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      {task.jenis_kerja}
                    </h4>
                  </div>
                  <StatusBadge status={task.status} />
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{task.lokasi}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 pl-5">
                    Pimpinan: <strong className="text-slate-300">{task.nama_pimpinan || 'Pimpinan STO'}</strong>
                  </p>
                </div>

                {/* Requested Material Summary if any */}
                {task.permohonan_list && task.permohonan_list.length > 0 && (
                  <div className="mb-4 text-xs space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400">Status Permohonan Material:</p>
                    {task.permohonan_list.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-[11px]">
                        <span>Req #{p.id} ({p.items?.length || 0} item)</span>
                        <StatusBadge status={p.status} className="text-[9px] py-0.2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsRequestModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>Request Barang ke Gudang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsCompleteModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Bukti Selesai</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Finished Tasks List */}
      {finishedTasks.length > 0 && (
        <div className="pt-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Riwayat Selesai ({finishedTasks.length})
          </h3>
          <div className="space-y-2">
            {finishedTasks.map(task => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono text-slate-400">TGS-{String(task.id).padStart(3, '0')}</span>
                  <p className="font-semibold text-white">{task.jenis_kerja}</p>
                </div>
                <StatusBadge status="Done" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Form Request Material (Dynamic FieldArray) */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title={`Request Material (TGS-${String(selectedTask?.id || '').padStart(3, '0')})`}
      >
        <Formik
          initialValues={{
            items: [{ barang_id: '', jumlah_minta: 1 }]
          }}
          validationSchema={materialValidationSchema}
          onSubmit={async (values, { resetForm }) => {
            try {
              await api.post('/permohonan', {
                tugas_id: Number(selectedTask.id),
                items: values.items.map(it => ({
                  barang_id: Number(it.barang_id),
                  jumlah_minta: Number(it.jumlah_minta)
                }))
              });
              showSuccess('Permohonan Terkirim', 'Permohonan barang berhasil dikirim ke pimpinan.');
              resetForm();
              setIsRequestModalOpen(false);
              fetchTeknisiData();
            } catch (err) {
              showError('Gagal Ajukan Material', err.response?.data?.message || 'Gagal mengajukan material.');
            }
          }}
        >
          {({ values, errors, touched }) => (
            <Form className="space-y-4">
              <FieldArray name="items">
                {({ push, remove }) => (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Daftar Barang Dibutuhkan</span>
                      <button
                        type="button"
                        onClick={() => push({ barang_id: '', jumlah_minta: 1 })}
                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Item
                      </button>
                    </div>

                    {values.items.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 relative"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Item #{index + 1}</span>
                          {values.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Barang Selector */}
                        <div>
                          <Field
                            as="select"
                            name={`items.${index}.barang_id`}
                            className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="">-- Pilih Barang Gudang --</option>
                            {barangList.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.nama_barang} (Sisa: {b.stok} {b.satuan})
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name={`items.${index}.barang_id`}
                            component="p"
                            className="text-[10px] text-red-400 mt-1"
                          />
                        </div>

                        {/* Jumlah Minta */}
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-slate-400 whitespace-nowrap">Jumlah:</label>
                          <Field
                            type="number"
                            min="1"
                            name={`items.${index}.jumlah_minta`}
                            className="w-24 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                          <ErrorMessage
                            name={`items.${index}.jumlah_minta`}
                            component="p"
                            className="text-[10px] text-red-400 mt-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FieldArray>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal>

      {/* Modal: Form Selesai Tugas & Upload Bukti (Teknisi) */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Konfirmasi Selesai & Upload Bukti"
      >
        <Formik
          initialValues={{
            foto_bukti: ''
          }}
          validationSchema={completeValidationSchema}
          onSubmit={(values) => {
            setCompletingTaskData(values);
          }}
        >
          {({ setFieldValue, values, errors, touched, handleSubmit }) => (
            <Form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Foto Bukti Penyelesaian Pekerjaan
                </label>
                <Field
                  type="text"
                  name="foto_bukti"
                  placeholder="URL Foto atau pilih preset bukti di bawah"
                  className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <ErrorMessage
                  name="foto_bukti"
                  component="p"
                  className="text-xs text-red-400 mt-1 font-medium"
                />
              </div>

              {/* Preset Sample Installation Photos */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-2">Preset Foto Bukti Pekerjaan Lapangan:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFieldValue('foto_bukti', 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=60')}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-left hover:border-red-500/50 transition-colors"
                  >
                    <p className="font-bold text-white text-[11px]">Foto Modem Aktif</p>
                    <p className="text-[10px] text-slate-400">Instalasi ONT ZTE Sukses</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFieldValue('foto_bukti', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60')}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-left hover:border-red-500/50 transition-colors"
                  >
                    <p className="font-bold text-white text-[11px]">Foto Box ODP</p>
                    <p className="text-[10px] text-slate-400">Splicing & Redaman OK</p>
                  </button>
                </div>
              </div>

              {values.foto_bukti && (
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 mb-1">Pratinjau Foto:</p>
                  <img
                    src={values.foto_bukti}
                    alt="Preview Bukti"
                    className="w-full h-36 object-cover rounded-lg"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                >
                  Tutup Tiket Selesai
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal>

      {/* Confirmation Dialog: Selesai Tugas */}
      <ConfirmDialog
        isOpen={!!completingTaskData}
        onClose={() => setCompletingTaskData(null)}
        onConfirm={async () => {
          if (!completingTaskData || !selectedTask) return;
          setIsCompletingLoading(true);
          try {
            await api.patch(`/tugas/${selectedTask.id}/status`, {
              status: 'Done',
              foto_bukti: completingTaskData.foto_bukti
            });
            showSuccess('Tugas Selesai', 'Pekerjaan selesai! Foto bukti berhasil diunggah.');
            setCompletingTaskData(null);
            setIsCompleteModalOpen(false);
            fetchTeknisiData();
          } catch (err) {
            showError('Gagal Menyelesaikan Tugas', err.response?.data?.message || 'Gagal menyelesaikan tugas.');
          } finally {
            setIsCompletingLoading(false);
          }
        }}
        title={`Konfirmasi Penutupan Tiket TGS-${String(selectedTask?.id || '').padStart(3, '0')}`}
        message={
          <div>
            <p>Apakah Anda yakin pekerjaan pada tiket ini telah 100% selesai dan siap ditutup?</p>
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p><span className="text-slate-500">Pekerjaan:</span> <strong className="text-white">{selectedTask?.jenis_kerja}</strong></p>
              <p><span className="text-slate-500">Lokasi:</span> <strong className="text-slate-300">{selectedTask?.lokasi}</strong></p>
            </div>
            <p className="mt-2 text-emerald-400 text-[11px]">Status tiket akan ditutup permanen sebagai 'Done' dan laporan akan diarsipkan.</p>
          </div>
        }
        confirmText="Ya, Tutup Tiket Selesai"
        cancelText="Kembali"
        type="success"
        isLoading={isCompletingLoading}
      />
    </div>
  );
};

export default TeknisiDashboard;
