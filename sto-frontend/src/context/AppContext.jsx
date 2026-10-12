/**
 * ============================================================================
 * STATE MANAGEMENT & DATA SYNC (sto-frontend/src/context/AppContext.jsx)
 * ============================================================================
 * Standar Operasional Prosedur (Alur Kerja Lengkap 6 SOP Telkom Akses STO):
 * 
 * 1. SOP 1 (Pimpinan):
 *    Pimpinan membuat tiket penugasan (Pasang Baru IndiHome / Perbaikan Gangguan).
 *    Tiket disiarkan secara terbuka (Broadcast Open Pool) ke seluruh teknisi lapangan.
 * 
 * 2. SOP 1.5 (Teknisi):
 *    Teknisi melihat daftar siaran terbuka dan mengambil (Klaim) tiket pekerjaan.
 * 
 * 3. SOP 2 (Teknisi):
 *    Teknisi mengajukan permohonan material ke gudang (Dropcore, ONT Modem, Roset, dll).
 * 
 * 4. SOP 3 (Pimpinan):
 *    Pimpinan meninjau dan memberikan persetujuan (Approval) terhadap permohonan barang.
 * 
 * 5. SOP 4 (Gudang):
 *    Petugas gudang merilis barang fisik ke teknisi. Stok gudang otomatis terpotong
 *    dan tersinkronisasi ke database Supabase Cloud.
 * 
 * 6. SOP 5 (Teknisi & WebGIS):
 *    Teknisi bergerak menuju lokasi pelanggan di Payakumbuh. Sensor GPS menyiarkan
 *    koordinat realtime ke peta WebGIS yang dipantau Pimpinan di Command Center.
 * 
 * 7. SOP 6 (Closing Pekerjaan & Rekonsiliasi Material):
 *    Teknisi menyelesaikan instalasi: mengukur redaman optik (OPM dBm), menginput
 *    Serial Number (SN Barcode ONT), dan merekonsiliasi pemakaian material.
 *    Material resmi berstatus "TERPASANG DI PELANGGAN (CONSUMED)", sisa kabel diretur,
 *    dan Dokumen Digital BASTP resmi diterbitkan.
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase, { isSupabaseConfigured } from '../api/supabaseClient';
import api from '../api/axiosInstance';
import {
  initialUsers,
  initialBarang,
  initialTugas,
  initialPermohonan,
  initialDetailPermohonan,
  initialTrackingGps,
  STO_COORDINATES
} from '../data/seedData';

const AppContext = createContext();

export function AppProvider({ children }) {
  // 1. Connectivity & Sync Status
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'synced' | 'local' | 'syncing' | 'offline'
  const [lastSyncedAt, setLastSyncedAt] = useState(() => localStorage.getItem('sto_lastSyncedAt') || null);

  // 2. Current Active User (Session)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('sto_currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return initialUsers[0]; // Pimpinan Ir. Bambang
  });

  // 3. Database Tables
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('sto_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [barang, setBarang] = useState(() => {
    const saved = localStorage.getItem('sto_barang');
    return saved ? JSON.parse(saved) : initialBarang;
  });

  const [tugas, setTugas] = useState(() => {
    const saved = localStorage.getItem('sto_tugas');
    return saved ? JSON.parse(saved) : initialTugas;
  });

  const [permohonan, setPermohonan] = useState(() => {
    const saved = localStorage.getItem('sto_permohonan');
    return saved ? JSON.parse(saved) : initialPermohonan;
  });

  const [detailPermohonan, setDetailPermohonan] = useState(() => {
    const saved = localStorage.getItem('sto_detailPermohonan');
    return saved ? JSON.parse(saved) : initialDetailPermohonan;
  });

  const [trackingGps, setTrackingGps] = useState(() => {
    const saved = localStorage.getItem('sto_trackingGps');
    return saved ? JSON.parse(saved) : initialTrackingGps;
  });

  // Current active navigation view
  // 'landing' | 'login' | 'pimpinan' | 'teknisi' | 'gudang' | 'audit'
  const [currentView, setCurrentView] = useState('pimpinan');
  const [notification, setNotification] = useState(null);

  // Show Toast / Notification
  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  // Sync to LocalStorage (local state fallback cache)
  useEffect(() => {
    localStorage.setItem('sto_currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('sto_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sto_barang', JSON.stringify(barang));
  }, [barang]);

  useEffect(() => {
    localStorage.setItem('sto_tugas', JSON.stringify(tugas));
  }, [tugas]);

  useEffect(() => {
    localStorage.setItem('sto_permohonan', JSON.stringify(permohonan));
  }, [permohonan]);

  useEffect(() => {
    localStorage.setItem('sto_detailPermohonan', JSON.stringify(detailPermohonan));
  }, [detailPermohonan]);

  useEffect(() => {
    localStorage.setItem('sto_trackingGps', JSON.stringify(trackingGps));
  }, [trackingGps]);

  // Robust Fetch & Sync from Supabase with Local Fallback
  const fetchRealData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    if (!isSupabaseConfigured()) {
      setSyncStatus('local');
      return;
    }

    setSyncStatus('syncing');

    try {
      const [
        resUsers,
        resBarang,
        resTugas,
        resPermohonan,
        resDetail,
        resGps
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('barang').select('*').order('nama_barang', { ascending: true }),
        supabase.from('tugas').select('*').order('id', { ascending: false }),
        supabase.from('permohonan').select('*').order('id', { ascending: false }),
        supabase.from('detail_permohonan').select('*'),
        supabase.from('tracking_gps').select('*')
      ]);

      if (resUsers.data && resUsers.data.length > 0) setUsers(resUsers.data);
      if (resBarang.data && resBarang.data.length > 0) setBarang(resBarang.data);
      if (resTugas.data && resTugas.data.length > 0) {
        // Pastikan setiap tugas memiliki target_lat & target_lng untuk lokasi pemasangan/perbaikan di peta WebGIS
        const mappedTugas = resTugas.data.map((t, idx) => {
          const offsetLat = (((Number(t.id || idx) * 7) % 30) - 15) * 0.0012;
          const offsetLng = (((Number(t.id || idx) * 11) % 30) - 15) * 0.0012;
          return {
            ...t,
            target_lat: t.target_lat || (STO_COORDINATES.lat + offsetLat),
            target_lng: t.target_lng || (STO_COORDINATES.lng + offsetLng),
            pelanggan_nama: t.pelanggan_nama || (t.lokasi ? t.lokasi.split('-')[0].trim() : `Pelanggan #${t.id}`),
            keterangan: t.keterangan || `Pekerjaan ${t.jenis_kerja} di ${t.lokasi}`
          };
        });
        setTugas(mappedTugas);
      }
      if (resPermohonan.data && resPermohonan.data.length > 0) setPermohonan(resPermohonan.data);
      if (resDetail.data && resDetail.data.length > 0) setDetailPermohonan(resDetail.data);
      if (resGps.data && resGps.data.length > 0) {
        // Tautkan teknisi_id dari tugas jika skema Supabase tracking_gps hanya menyimpan tugas_id
        const mappedGps = resGps.data.map(g => {
          const matchedTask = resTugas.data?.find(t => Number(t.id) === Number(g.tugas_id));
          return {
            ...g,
            teknisi_id: g.teknisi_id || (matchedTask ? Number(matchedTask.teknisi_id) : 2),
            akurasi: g.akurasi || '3 meter',
            kecepatan: g.kecepatan || 'Bergerak di Payakumbuh',
            baterai: g.baterai || 85,
            is_active: g.is_active !== false
          };
        });
        setTrackingGps(mappedGps);
      }

      const timestamp = new Date().toISOString();
      setLastSyncedAt(timestamp);
      localStorage.setItem('sto_lastSyncedAt', timestamp);
      setSyncStatus('synced');
    } catch (err) {
      console.warn('[Sync Fallback] Gagal memuat data dari Supabase, beralih ke cache lokal:', err);
      setSyncStatus('local');
    }
  }, []);

  // Network Online / Offline Detection & Automatic Re-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchRealData();
      showToast('Koneksi pulih. Data disinkronisasi ulang.', 'info');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      showToast('Koneksi terputus. Mode cache lokal aktif.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchRealData, showToast]);

  // Initial Fetch & Supabase Real-Time Listener
  useEffect(() => {
    fetchRealData();

    if (!isSupabaseConfigured()) return;

    // Real-time Subscription Channel for Live Tracking GPS & Tasks
    const channel = supabase
      .channel('realtime_sto_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracking_gps' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setTrackingGps((prev) => {
              const idx = prev.findIndex((g) => g.teknisi_id === payload.new.teknisi_id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...payload.new };
                return updated;
              }
              return [...prev, payload.new];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tugas' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTugas((prev) => [payload.new, ...prev.filter(t => t.id !== payload.new.id)]);
          } else if (payload.eventType === 'UPDATE') {
            setTugas((prev) => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRealData]);

  // Auth Operations
  const login = (email, password) => {
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!found) {
      showToast("Email pengguna tidak ditemukan!", "error");
      return false;
    }
    if (found.password !== password) {
      showToast("Kata sandi salah!", "error");
      return false;
    }
    setCurrentUser(found);
    if (found.role === 'pimpinan') setCurrentView('pimpinan');
    else if (found.role === 'teknisi') setCurrentView('teknisi');
    else if (found.role === 'gudang') setCurrentView('gudang');
    showToast(`Selamat datang kembali, ${found.nama_lengkap}!`, "success");
    return true;
  };

  const loginAsRole = (role) => {
    const found = users.find(u => u.role === role);
    if (found) {
      setCurrentUser(found);
      if (role === 'pimpinan') setCurrentView('pimpinan');
      else if (role === 'teknisi') setCurrentView('teknisi');
      else if (role === 'gudang') setCurrentView('gudang');
      showToast(`Beralih ke akun ${found.nama_lengkap} (${found.jabatan || found.role})`, "info");
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentView('landing');
    showToast("Anda telah keluar dari sistem.", "info");
  };

  // SOP 1: Pimpinan membuat tiket tugas dan menyiarkan ke pool teknisi (Diumumkan Terbuka)
  const createTugas = async (taskData) => {
    const newId = tugas.length > 0 ? Math.max(...tugas.map(t => Number(t.id) || 0)) + 1 : 101;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Target coordinates roughly around Payakumbuh Koto Nan IV area if not specified
    const offsetLat = (Math.random() - 0.5) * 0.02;
    const offsetLng = (Math.random() - 0.5) * 0.02;
    const target_lat = taskData.target_lat || (STO_COORDINATES.lat + offsetLat);
    const target_lng = taskData.target_lng || (STO_COORDINATES.lng + offsetLng);

    const fullLokasi = taskData.pelanggan_nama
      ? `${taskData.pelanggan_nama}${taskData.pelanggan_telp ? ' (' + taskData.pelanggan_telp + ')' : ''} - ${taskData.lokasi}${taskData.keterangan ? ' [' + taskData.keterangan + ']' : ''}`
      : taskData.lokasi;

    const newTask = {
      id: newId,
      nomor_tiket: taskData.nomor_tiket || `TKT-PYK-2026-${String(newId).padStart(3, '0')}`,
      pimpinan_id: currentUser ? currentUser.id : 1,
      teknisi_id: taskData.teknisi_id ? Number(taskData.teknisi_id) : null,
      jenis_kerja: taskData.jenis_kerja,
      lokasi: taskData.lokasi,
      pelanggan_nama: taskData.pelanggan_nama || "Pelanggan Telkom",
      pelanggan_telp: taskData.pelanggan_telp || "0812-xxxx-xxxx",
      status: "Open",
      keterangan: taskData.keterangan || "",
      target_lat,
      target_lng,
      foto_bukti: null,
      waktu_buat: formattedDate
    };

    setTugas(prev => [newTask, ...prev]);

    // Sync to Supabase tugas table strictly according to schema:
    if (isSupabaseConfigured()) {
      try {
        let insertPayload = {
          pimpinan_id: Number(newTask.pimpinan_id) || 1,
          teknisi_id: newTask.teknisi_id ? Number(newTask.teknisi_id) : null,
          jenis_kerja: newTask.jenis_kerja,
          lokasi: fullLokasi,
          status: 'menunggu'
        };

        let { data, error } = await supabase.from('tugas').insert([insertPayload]).select();

        // If schema has NOT NULL constraint on teknisi_id, fallback to first available technician
        if (error && error.message?.toLowerCase().includes('not-null')) {
          const techFallback = users.find(u => u.role === 'teknisi')?.id || 2;
          insertPayload.teknisi_id = techFallback;
          const retryRes = await supabase.from('tugas').insert([insertPayload]).select();
          data = retryRes.data;
        }

        if (data && data.length > 0) {
          setTugas(prev => prev.map(t => t.id === newId ? { ...t, id: data[0].id } : t));
        }
      } catch (err) {
        console.warn('Supabase create task notice:', err);
      }
    }

    showToast(`Tiket #${newId} (${taskData.jenis_kerja}) berhasil disiarkan ke seluruh armada teknisi!`, "success");
    return newTask;
  };

  // SOP 1.5: Teknisi mengklaim/mengambil tiket yang diumumkan (dengan validasi ketat & dual sync)
  const claimTugas = async (tugasId, teknisiId) => {
    const parsedTugasId = parseInt(tugasId, 10);
    const parsedTeknisiId = parseInt(teknisiId, 10);

    if (!tugasId || isNaN(parsedTugasId) || parsedTugasId <= 0) {
      showToast('ID tugas tidak valid!', 'error');
      return false;
    }

    if (!teknisiId || isNaN(parsedTeknisiId) || parsedTeknisiId <= 0) {
      showToast('ID teknisi tidak valid!', 'error');
      return false;
    }

    const targetTask = tugas.find(t => Number(t.id) === parsedTugasId);
    if (!targetTask) {
      showToast('Tiket tugas tidak ditemukan!', 'error');
      return false;
    }

    if (targetTask.status === 'Done') {
      showToast('Tiket ini sudah selesai dikerjakan!', 'error');
      return false;
    }

    if (targetTask.teknisi_id && targetTask.teknisi_id !== parsedTeknisiId && targetTask.status !== 'Open') {
      showToast('Tiket ini sudah diambil oleh teknisi lain!', 'error');
      return false;
    }

    // 1. Sinkronisasi ke Backend Express API jika backend berjalan
    try {
      await api.patch(`/tugas/${parsedTugasId}/claim`, { teknisi_id: parsedTeknisiId });
    } catch (apiErr) {
      console.warn('[claimTugas] Backend Express API notice:', apiErr?.response?.data?.message || apiErr?.message);
    }

    // 2. Update state React lokal
    setTugas(prev => prev.map(t => {
      if (Number(t.id) === parsedTugasId) {
        return {
          ...t,
          teknisi_id: parsedTeknisiId,
          status: 'Progress'
        };
      }
      return t;
    }));

    // Tautkan GPS teknisi secara langsung ke tugas yang baru diambil
    setTrackingGps(prev => {
      const idx = prev.findIndex(g => Number(g.teknisi_id) === parsedTeknisiId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          tugas_id: parsedTugasId,
          is_active: true,
          kecepatan: 'Bergerak Menuju Lokasi Pemasangan/Perbaikan'
        };
        return copy;
      } else {
        return [...prev, {
          id: prev.length + 1,
          tugas_id: parsedTugasId,
          teknisi_id: parsedTeknisiId,
          latitude: STO_COORDINATES.lat,
          longitude: STO_COORDINATES.lng,
          waktu_update: new Date().toLocaleTimeString(),
          akurasi: '3 meter',
          kecepatan: 'Bergerak Menuju Lokasi Pelanggan',
          baterai: 90,
          is_active: true
        }];
      }
    });

    // 3. Sinkronisasi langsung ke Supabase jika terkonfigurasi
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tugas').update({
          teknisi_id: parsedTeknisiId,
          status: 'Progress'
        }).eq('id', parsedTugasId);
      } catch (err) {
        console.warn('Supabase claim task notice:', err);
      }
    }

    showToast(`Tiket #${parsedTugasId} berhasil Anda ambil! Segera ajukan permohonan material ke gudang.`, 'success');
    return true;
  };

  // SOP 2: Teknisi mengajukan material ke gudang
  const requestMaterial = async (tugasId, items, catatan) => {
    const parsedTugasId = parseInt(tugasId, 10) || Number(tugasId);
    const newPermohonanId = permohonan.length > 0 ? Math.max(...permohonan.map(p => Number(p.id) || 0)) + 1 : 501;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newPermohonan = {
      id: newPermohonanId,
      tugas_id: parsedTugasId,
      status: "Pending",
      waktu_request: formattedDate,
      catatan_teknisi: catatan || "Kebutuhan perbaikan / instalasi lapangan"
    };

    let startDetailId = detailPermohonan.length > 0 ? Math.max(...detailPermohonan.map(d => Number(d.id) || 0)) + 1 : 1;
    const newDetails = items.map(item => ({
      id: startDetailId++,
      permohonan_id: newPermohonanId,
      barang_id: parseInt(item.barang_id, 10),
      jumlah_minta: parseInt(item.jumlah_minta, 10) || 1
    }));

    setPermohonan(prev => [newPermohonan, ...prev]);
    setDetailPermohonan(prev => [...newDetails, ...prev]);

    // Set task to Progress if Open
    setTugas(prev => prev.map(t => {
      if (Number(t.id) === parsedTugasId && t.status === 'Open') {
        return { ...t, status: 'Progress' };
      }
      return t;
    }));

    if (isSupabaseConfigured()) {
      try {
        const { data: pData } = await supabase.from('permohonan').insert([{
          tugas_id: parsedTugasId,
          status: 'menunggu'
        }]).select();

        const realPId = pData && pData.length > 0 ? pData[0].id : newPermohonanId;

        const detailsToInsert = items.map(item => ({
          permohonan_id: realPId,
          barang_id: parseInt(item.barang_id, 10),
          jumlah_minta: parseInt(item.jumlah_minta, 10) || 1
        }));
        await supabase.from('detail_permohonan').insert(detailsToInsert);
        await supabase.from('tugas').update({ status: 'Progress' }).eq('id', parsedTugasId);
      } catch (err) {
        console.warn('Supabase request material error:', err);
      }
    }

    showToast(`Permohonan material #${newPermohonanId} diajukan ke Pimpinan untuk persetujuan!`, "info");
  };

  // SOP 3: Pimpinan memberikan persetujuan (approval)
  const approveMaterial = async (permohonanId) => {
    const parsedId = parseInt(permohonanId, 10);
    setPermohonan(prev => prev.map(p => {
      if (Number(p.id) === parsedId) {
        return { ...p, status: "Approved" };
      }
      return p;
    }));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('permohonan').update({ status: 'Approved' }).eq('id', parsedId);
      } catch (err) {
        console.warn('Supabase approve error:', err);
      }
    }

    showToast(`Permohonan #${parsedId} DISETUJUI. Diteruskan ke Gudang untuk rilis barang!`, "success");
  };

  const rejectMaterial = async (permohonanId, reason = "Ditolak oleh Pimpinan") => {
    const parsedId = parseInt(permohonanId, 10);
    setPermohonan(prev => prev.map(p => {
      if (Number(p.id) === parsedId) {
        return { ...p, status: "Rejected", catatan_pimpinan: reason };
      }
      return p;
    }));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('permohonan').update({ status: 'Rejected' }).eq('id', parsedId);
      } catch (err) {
        console.warn('Supabase reject error:', err);
      }
    }

    showToast(`Permohonan #${parsedId} DITOLAK.`, "error");
  };

  // SOP 4: Gudang merilis barang dan sistem melakukan pemotongan stok otomatis
  const releaseMaterial = async (permohonanId) => {
    const parsedId = parseInt(permohonanId, 10);
    const targetPermohonan = permohonan.find(p => Number(p.id) === parsedId);
    if (!targetPermohonan) return;

    const itemsToRelease = detailPermohonan.filter(d => Number(d.permohonan_id) === parsedId);

    // Periksa apakah stok mencukupi
    for (const item of itemsToRelease) {
      const b = barang.find(x => Number(x.id) === Number(item.barang_id));
      if (b && Number(b.stok) < Number(item.jumlah_minta)) {
        showToast(`Stok ${b.nama_barang} tidak mencukupi (Sisa: ${b.stok}, Diminta: ${item.jumlah_minta})!`, "error");
        return;
      }
    }

    // Pemotongan stok otomatis
    setBarang(prev => prev.map(b => {
      const matched = itemsToRelease.find(item => Number(item.barang_id) === Number(b.id));
      if (matched) {
        return { ...b, stok: Math.max(0, Number(b.stok) - Number(matched.jumlah_minta)) };
      }
      return b;
    }));

    // Update status permohonan ke Released
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setPermohonan(prev => prev.map(p => {
      if (Number(p.id) === parsedId) {
        return { ...p, status: "Released", waktu_rilis: formattedDate };
      }
      return p;
    }));

    // Sync to Supabase: Potong stok real di tabel barang & permohonan status
    if (isSupabaseConfigured()) {
      try {
        for (const item of itemsToRelease) {
          const currentB = barang.find(x => Number(x.id) === Number(item.barang_id));
          const newStok = Math.max(0, (Number(currentB?.stok) || 0) - Number(item.jumlah_minta));
          await supabase.from('barang').update({ stok: newStok }).eq('id', Number(item.barang_id));
        }
        await supabase.from('permohonan').update({ status: 'Released' }).eq('id', parsedId);
      } catch (err) {
        console.warn('Supabase release sync error:', err);
      }
    }

    showToast(`Barang Permohonan #${parsedId} berhasil dirilis & stok gudang otomatis terpotong!`, "success");
  };

  // SOP 5: Teknisi menuju lokasi (Sistem melacak koordinat GPS)
  const updateGpsLocation = (teknisiId, lat, lng, extra = {}) => {
    const parsedTeknisiId = parseInt(teknisiId, 10);
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedTeknisiId) || isNaN(parsedLat) || isNaN(parsedLng)) return;

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setTrackingGps(prev => {
      const idx = prev.findIndex(g => Number(g.teknisi_id) === parsedTeknisiId);
      const activeTask = tugas.find(t => Number(t.teknisi_id) === parsedTeknisiId && t.status !== 'Done');
      const assignedTaskId = extra.tugas_id || (activeTask ? activeTask.id : (idx >= 0 ? prev[idx].tugas_id : null));

      const entry = {
        id: idx >= 0 ? prev[idx].id : prev.length + 1,
        tugas_id: assignedTaskId,
        teknisi_id: parsedTeknisiId,
        latitude: parsedLat,
        longitude: parsedLng,
        waktu_update: formattedDate,
        akurasi: extra.akurasi || "3 meter",
        kecepatan: extra.kecepatan || (activeTask ? `Menuju Lokasi #${activeTask.id} (${activeTask.jenis_kerja})` : "Bergerak di Payakumbuh"),
        baterai: extra.baterai || 85,
        is_active: extra.is_active !== false
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entry;
        return copy;
      }
      return [...prev, entry];
    });

    // Sync to Supabase in real-time
    if (isSupabaseConfigured()) {
      const activeTaskId = extra.tugas_id || tugas.find(t => Number(t.teknisi_id) === parsedTeknisiId && t.status !== 'Done')?.id;
      if (activeTaskId) {
        supabase.from('tracking_gps').insert([{
          tugas_id: Number(activeTaskId),
          latitude: Number(parsedLat.toFixed(8)),
          longitude: Number(parsedLng.toFixed(8)),
          waktu_update: new Date().toISOString()
        }]).then(() => {});
      }
    }
  };

  // Simulasi pergerakan teknisi menuju target
  const simulateTechnicianStep = (teknisiId, targetLat, targetLng) => {
    const parsedTeknisiId = parseInt(teknisiId, 10);
    const currentGps = trackingGps.find(g => Number(g.teknisi_id) === parsedTeknisiId);
    const curLat = currentGps ? currentGps.latitude : STO_COORDINATES.lat;
    const curLng = currentGps ? currentGps.longitude : STO_COORDINATES.lng;

    // Move 35% closer to target
    const nextLat = curLat + (targetLat - curLat) * 0.35;
    const nextLng = curLng + (targetLng - curLng) * 0.35;

    updateGpsLocation(parsedTeknisiId, nextLat, nextLng, {
      kecepatan: "34 km/h (Menuju Pelanggan)",
      akurasi: "3 meter",
      baterai: currentGps ? Math.max(20, currentGps.baterai - 1) : 80
    });

    showToast("GPS Teknisi terkirim ke WebGIS Pimpinan!", "info");
  };

  /**
   * ==========================================================================
   * SOP 6: TEKNISI KLOSING PEKERJAAN & REKONSILIASI MATERIAL REAL (STANDAR TELKOM AKSES)
   * ==========================================================================
   * Fungsi ini menangani penutupan tiket (Closing Work Order) sesuai SOP IndiHome / Telkom Akses:
   * 1. Mencatat SN ONT Modem yang terpasang di rumah pelanggan.
   * 2. Mencatat ID ODP, Port ODP, dan Redaman Optik (dBm) untuk Quality Assurance.
   * 3. Rekonsiliasi Material: Barang terpasang resmi menjadi 'TERPASANG DI PELANGGAN (CONSUMED)',
   *    sedangkan material sisa dapat diretur kembali ke inventaris gudang.
   * 4. Menerbitkan Dokumen Digital BASTP (Berita Acara Serah Terima Pekerjaan).
   */
  const finishTugas = async (tugasId, argPhotoOrPayload, catatanHasil = "") => {
    const parsedTugasId = parseInt(tugasId, 10);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Cek apakah argumen kedua berupa objek payload lengkap atau sekadar string URL foto
    const isPayloadObject = typeof argPhotoOrPayload === 'object' && argPhotoOrPayload !== null;

    const proof = isPayloadObject
      ? (argPhotoOrPayload.foto_bukti || argPhotoOrPayload.fotoBuktiUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80")
      : (argPhotoOrPayload || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80");

    const userNote = isPayloadObject ? (argPhotoOrPayload.catatan || "") : catatanHasil;
    const odpId = isPayloadObject ? (argPhotoOrPayload.odp_id || "ODP-PYK-FA/014") : "ODP-PYK-FA/014";
    const portOdp = isPayloadObject ? (argPhotoOrPayload.port_odp || "03") : "03";
    const redamanDbm = isPayloadObject ? (argPhotoOrPayload.redaman_dbm || "-18.5") : "-18.5";
    const snOnt = isPayloadObject ? (argPhotoOrPayload.sn_ont || "ZTEGC8B90112") : "ZTEGC8B90112";
    const pelangganNama = isPayloadObject ? (argPhotoOrPayload.pelanggan_nama || "") : "";
    const reconciliation = isPayloadObject ? (argPhotoOrPayload.reconciliation || []) : [];
    const bastpNumber = isPayloadObject
      ? (argPhotoOrPayload.bastp_number || `BASTP/TA-PYK/${now.getFullYear()}/${String(parsedTugasId).padStart(4, '0')}`)
      : `BASTP/TA-PYK/${now.getFullYear()}/${String(parsedTugasId).padStart(4, '0')}`;

    // Buat ringkasan teks untuk kolom catatan di tabel Supabase
    const materialSummaryText = reconciliation.length > 0
      ? reconciliation.map(m => `${m.nama_barang}: ${m.jumlah_terpakai} ${m.satuan} [TERPASANG]`).join(', ')
      : `ONT SN: ${snOnt}, Dropcore: Terpasang`;

    const summaryNoteForDb = `[BASTP: ${bastpNumber}] ODP: ${odpId} (Port ${portOdp}) | Redaman: ${redamanDbm} dBm | SN: ${snOnt} | Terpasang: ${materialSummaryText} | Catatan: ${userNote}`;

    // Struktur BASTP Lengkap untuk Dokumen Digital & Audit
    const bastpData = {
      nomor_bastp: bastpNumber,
      odp_id: odpId,
      port_odp: portOdp,
      redaman_dbm: redamanDbm,
      sn_ont: snOnt,
      pelanggan_nama: pelangganNama,
      waktu_closing: formattedDate,
      catatan_teknisi: userNote,
      reconciliation: reconciliation.map(r => ({
        ...r,
        status: 'TERPASANG DI PELANGGAN (CONSUMED)'
      }))
    };

    // 1. Perbarui state lokal tugas dengan metadata closing & BASTP
    setTugas(prev => prev.map(t => {
      if (Number(t.id) === parsedTugasId) {
        return {
          ...t,
          status: "Done",
          foto_bukti: proof,
          catatan_selesai: userNote,
          waktu_selesai: formattedDate,
          odp_id: odpId,
          port_odp: portOdp,
          redaman_dbm: redamanDbm,
          sn_ont: snOnt,
          bastp: bastpData
        };
      }
      return t;
    }));

    // 2. Jika teknisi meretur sisa kabel/barang kembali ke gudang, kembalikan ke stok gudang
    if (isPayloadObject && argPhotoOrPayload.retur_ke_gudang && Array.isArray(reconciliation)) {
      reconciliation.forEach(async (item) => {
        const sisa = Number(item.jumlah_sisa) || 0;
        if (sisa > 0 && item.barang_id) {
          setBarang(prev => prev.map(b => {
            if (Number(b.id) === Number(item.barang_id)) {
              return { ...b, stok: Number(b.stok) + sisa };
            }
            return b;
          }));

          // Sinkronisasi update stok sisa retur ke Supabase
          if (isSupabaseConfigured()) {
            try {
              const currentB = barang.find(x => Number(x.id) === Number(item.barang_id));
              const updatedStok = (Number(currentB?.stok) || 0) + sisa;
              await supabase.from('barang').update({ stok: updatedStok }).eq('id', Number(item.barang_id));
            } catch (err) {
              console.warn('[finishTugas Retur] Gagal sync stok retur ke Supabase:', err);
            }
          }
        }
      });
    }

    // 3. Sinkronisasi status selesai ke Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tugas').update({
          status: 'Done',
          foto_bukti: proof,
          catatan: summaryNoteForDb
        }).eq('id', parsedTugasId);
      } catch (err) {
        console.warn('Supabase finish task error:', err);
      }
    }

    showToast(`Tiket #${parsedTugasId} berhasil di-closing! Material resmi berstatus TERPASANG DI PELANGGAN & BASTP diterbitkan.`, "success");
    return bastpData;
  };

  // CRUD Gudang (Barang)
  const addBarang = async (item) => {
    const newId = barang.length > 0 ? Math.max(...barang.map(b => Number(b.id) || 0)) + 1 : 1;
    const newItem = {
      id: newId,
      nama_barang: item.nama_barang,
      stok: parseInt(item.stok, 10) || 0,
      satuan: item.satuan || "pcs"
    };

    setBarang(prev => [newItem, ...prev]);

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('barang').insert([{
          nama_barang: newItem.nama_barang,
          stok: newItem.stok,
          satuan: newItem.satuan
        }]).select();

        if (data && data.length > 0) {
          setBarang(prev => prev.map(b => b.id === newId ? { ...b, id: data[0].id } : b));
        }
      } catch (err) {
        console.warn('Supabase insert barang error:', err);
      }
    }

    showToast(`Barang '${item.nama_barang}' berhasil ditambahkan ke inventaris!`, "success");
  };

  const updateBarang = async (id, updatedFields) => {
    const parsedId = parseInt(id, 10);
    setBarang(prev => prev.map(b => {
      if (Number(b.id) === parsedId) {
        return { ...b, ...updatedFields };
      }
      return b;
    }));

    if (isSupabaseConfigured()) {
      try {
        const payload = {};
        if (updatedFields.nama_barang !== undefined) payload.nama_barang = updatedFields.nama_barang;
        if (updatedFields.stok !== undefined) payload.stok = parseInt(updatedFields.stok, 10);
        if (updatedFields.satuan !== undefined) payload.satuan = updatedFields.satuan;
        await supabase.from('barang').update(payload).eq('id', parsedId);
      } catch (err) {
        console.warn('Supabase update barang error:', err);
      }
    }

    showToast("Data barang berhasil diperbarui!", "success");
  };

  const deleteBarang = async (id) => {
    const parsedId = parseInt(id, 10);
    setBarang(prev => prev.filter(b => Number(b.id) !== parsedId));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('barang').delete().eq('id', parsedId);
      } catch (err) {
        console.warn('Supabase delete barang error:', err);
      }
    }

    showToast("Barang dihapus dari inventaris gudang!", "info");
  };

  // User Management
  const addUser = async (userData) => {
    const newId = users.length > 0 ? Math.max(...users.map(u => Number(u.id) || 0)) + 1 : 1;
    const newUser = {
      id: newId,
      nama_lengkap: userData.nama_lengkap,
      email: userData.email.toLowerCase().trim(),
      password: userData.password || 'password123',
      role: userData.role || 'teknisi',
      jabatan: userData.role === 'pimpinan'
        ? 'Manager STO Wilayah'
        : userData.role === 'gudang'
        ? 'Staff Logistik & Inventaris'
        : 'Teknisi Lapangan'
    };

    setUsers(prev => [...prev, newUser]);

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('users').insert([{
          nama_lengkap: newUser.nama_lengkap,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        }]).select();

        if (data && data.length > 0) {
          setUsers(prev => prev.map(u => u.id === newId ? { ...u, id: data[0].id } : u));
        }
      } catch (err) {
        console.warn('Supabase add user error:', err);
      }
    }

    showToast(`Akun ${newUser.nama_lengkap} (${newUser.role}) berhasil didaftarkan!`, 'success');
    return newUser;
  };

  // Reset State to Default Factory
  const resetToFactoryDefault = () => {
    localStorage.clear();
    setUsers(initialUsers);
    setBarang(initialBarang);
    setTugas(initialTugas);
    setPermohonan(initialPermohonan);
    setDetailPermohonan(initialDetailPermohonan);
    setTrackingGps(initialTrackingGps);
    setCurrentUser(initialUsers[0]);
    setCurrentView('pimpinan');
    showToast("Semua data berhasil direset ke pengaturan awal pabrik!", "info");
  };

  return (
    <AppContext.Provider
      value={{
        isOnline,
        syncStatus,
        lastSyncedAt,
        refreshData: fetchRealData,
        currentUser,
        setCurrentUser,
        currentView,
        setCurrentView,
        users,
        setUsers,
        addUser,
        barang,
        tugas,
        claimTugas,
        permohonan,
        detailPermohonan,
        trackingGps,
        STO_COORDINATES,
        notification,
        setNotification,
        showToast,
        login,
        loginAsRole,
        logout,
        createTugas,
        requestMaterial,
        approveMaterial,
        rejectMaterial,
        releaseMaterial,
        updateGpsLocation,
        simulateTechnicianStep,
        finishTugas,
        addBarang,
        updateBarang,
        deleteBarang,
        resetToFactoryDefault
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
