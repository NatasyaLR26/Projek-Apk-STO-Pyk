/**
 * ============================================================================
 * KOMPONEN: WebGISMap (Peta Geospasial WebGIS Payakumbuh Koto Nan IV)
 * ============================================================================
 * Penjelasan Teknis Operasional STO Telkom Akses:
 * Komponen ini menampilkan peta interaktif menggunakan pustaka Leaflet.js:
 * 1. Peta terpusat di Kantor STO Telkom Payakumbuh (Koto Nan IV).
 * 2. Menampilkan penanda armada teknisi bergerak dengan animasi kedip lembut (Delay 1 Detik, Tidak Heboh).
 * 3. Bentuk dan warna penanda disesuaikan otomatis berdasarkan jenis pekerjaan:
 *    - Pasang Baru (PSB): Bentuk Diamond (Belah Ketupat) Biru Langit.
 *    - Perbaikan (PBK): Bentuk Squircle (Kotak Sudut Membulat) Kuning Amber.
 *    - Gangguan (LOS): Bentuk Segitiga / Warning Pin Merah Telkom.
 *    - Kabel Putus (CUT): Bentuk Octagon / Tajam Ungu Gelap.
 *    - ODP / Splitter: Bentuk Kotak Distribusi Hijau Emerald.
 * 4. Menampilkan titik lokasi pemasangan/perbaikan pelanggan dan garis rute ke teknisi.
 * 5. Peta menggunakan tile server berkecepatan tinggi dengan buffer dan invalidasi ukuran instan (Bebas Delay/Lag).
 * ============================================================================
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import {
  Shield,
  LocateFixed,
  Layers,
  Check,
  Navigation,
  Compass,
  Wrench,
  AlertTriangle,
  Scissors,
  Home,
  Radio
} from 'lucide-react';

// Konfigurasi jenis pekerjaan, warna, bentuk penanda, dan ikon
export function getTaskTypeConfig(jenisKerja = '') {
  const str = (jenisKerja || '').toLowerCase();

  if (str.includes('pasang baru') || str.includes('psb')) {
    return {
      type: 'Pasang Baru',
      code: 'PSB',
      badgeText: 'PASANG BARU',
      shapeClass: 'marker-shape-diamond', // Belah ketupat
      bgColor: '#0284c7', // Sky Blue
      borderColor: '#7dd3fc',
      bgTw: 'bg-sky-600',
      borderTw: 'border-sky-300',
      textColor: 'text-sky-400',
      lineColor: '#0284c7',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
    };
  }

  if (str.includes('kabel putus') || str.includes('cut') || str.includes('fo cut')) {
    return {
      type: 'Kabel Putus',
      code: 'CUT',
      badgeText: 'KABEL PUTUS',
      shapeClass: 'marker-shape-octagon', // Octagon berpotongan tajam
      bgColor: '#9333ea', // Ungu Gelap
      borderColor: '#d8b4fe',
      bgTw: 'bg-purple-600',
      borderTw: 'border-purple-300',
      textColor: 'text-purple-400',
      lineColor: '#9333ea',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`
    };
  }

  if (str.includes('gangguan') || str.includes('los') || str.includes('repair')) {
    return {
      type: 'Gangguan',
      code: 'LOS',
      badgeText: 'GANGGUAN (LOS)',
      shapeClass: 'marker-shape-triangle', // Segitiga Peringatan
      bgColor: '#e11d48', // Merah Telkom
      borderColor: '#fca5a5',
      bgTw: 'bg-rose-600',
      borderTw: 'border-rose-300',
      textColor: 'text-rose-400',
      lineColor: '#e11d48',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };
  }

  if (str.includes('perbaikan') || str.includes('maintenance')) {
    return {
      type: 'Perbaikan',
      code: 'PBK',
      badgeText: 'PERBAIKAN',
      shapeClass: 'marker-shape-squircle', // Persegi Sudut Membulat
      bgColor: '#d97706', // Amber Emas
      borderColor: '#fde68a',
      bgTw: 'bg-amber-500',
      borderTw: 'border-amber-300',
      textColor: 'text-amber-400',
      lineColor: '#d97706',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
    };
  }

  if (str.includes('odp') || str.includes('splitter')) {
    return {
      type: 'ODP',
      code: 'ODP',
      badgeText: 'ODP / SPLITTER',
      shapeClass: 'marker-shape-squircle',
      bgColor: '#059669', // Emerald Hijau
      borderColor: '#6ee7b7',
      bgTw: 'bg-emerald-600',
      borderTw: 'border-emerald-300',
      textColor: 'text-emerald-400',
      lineColor: '#059669',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`
    };
  }

  // Standby / Siaga (Belum ambil tugas)
  return {
    type: 'Siaga',
    code: 'SBY',
    badgeText: 'SIAGA STO',
    shapeClass: 'rounded-full',
    bgColor: '#475569',
    borderColor: '#94a3b8',
    bgTw: 'bg-slate-700',
    borderTw: 'border-slate-400',
    textColor: 'text-slate-300',
    lineColor: '#64748b',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
  };
}

// Layer Peta Berkecepatan Tinggi (Google Satellite Hybrid, Carto Voyager, Carto Dark, Topo)
const MAP_LAYERS = {
  satellite: {
    id: 'satellite',
    name: 'Satelit Hybrid',
    desc: 'Citra Satelit & Label Jalan Asli (Google Maps)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satelit & Label',
    thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=100&auto=format&fit=crop&q=80',
    maxZoom: 20
  },
  street: {
    id: 'street',
    name: 'Street View',
    desc: 'Peta Jalan & Gedung Cepat (Carto Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    thumbnail: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=100&auto=format&fit=crop&q=80',
    maxZoom: 19
  },
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    desc: 'Mode Gelap Kontras Tinggi (Carto Dark)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=100&auto=format&fit=crop&q=80',
    maxZoom: 19
  },
  topo: {
    id: 'topo',
    name: 'Topografi',
    desc: 'Kontur Ketinggian & Wilayah (Esri Topo)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Topo Map',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&auto=format&fit=crop&q=80',
    maxZoom: 18
  }
};

export default function WebGISMap({ selectedTugasId = null, onSelectTugas = () => {} }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const layerGroupRef = useRef(null);

  const {
    trackingGps,
    tugas,
    users,
    STO_COORDINATES
  } = useApp();

  const [activeLayerId, setActiveLayerId] = useState(() => {
    return localStorage.getItem('sto_selected_map_layer') || 'satellite';
  });
  const [showLayerPicker, setShowLayerPicker] = useState(false);

  // Filter Layer Tampilan
  const [showRoutes, setShowRoutes] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showTechnicians, setShowTechnicians] = useState(true);

  // Fungsi Penerapan Tile Layer Cepat
  const applyTileLayer = useCallback((map, layerKey) => {
    const config = MAP_LAYERS[layerKey] || MAP_LAYERS.satellite;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const tileLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom || 19,
      subdomains: 'abcd',
      attribution: config.attribution,
      keepBuffer: 6,
      updateWhenIdle: true,
      updateWhenZooming: false
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;
  }, []);

  // Inisialisasi Peta (Hanya 1 kali dengan performa optimal)
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLayer = localStorage.getItem('sto_selected_map_layer') || 'satellite';

    const map = L.map(mapRef.current, {
      center: [STO_COORDINATES.lat, STO_COORDINATES.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    applyTileLayer(map, initialLayer);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Invalidasi ukuran instan untuk memastikan rendering tile seketika
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [STO_COORDINATES, applyTileLayer]);

  // Ganti Layer Dasar Peta
  const switchBaseLayer = useCallback((layerKey) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    applyTileLayer(map, layerKey);
    setActiveLayerId(layerKey);
    localStorage.setItem('sto_selected_map_layer', layerKey);
    setShowLayerPicker(false);
  }, [applyTileLayer]);

  // Update Penanda & Garis Rute Setiap Ada Perubahan
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Penanda Kantor Pusat STO Telkom Akses Payakumbuh (HQ)
    const stoIcon = L.divIcon({
      className: 'custom-sto-icon',
      html: `
        <div class="flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
          <div class="px-2.5 py-0.5 rounded-full bg-rose-700 text-white font-extrabold text-[10px] border border-white/50 shadow-xl whitespace-nowrap mb-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span>HQ STO TELKOM</span>
          </div>
          <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-800 to-rose-600 border-2 border-white flex items-center justify-center shadow-xl shadow-rose-900/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [36, 52],
      iconAnchor: [18, 52]
    });

    const stoMarker = L.marker([STO_COORDINATES.lat, STO_COORDINATES.lng], { icon: stoIcon })
      .bindPopup(`
        <div class="p-2.5 text-xs min-w-[220px]">
          <div class="font-black text-rose-600 text-sm flex items-center gap-1.5">
            <span>●</span> ${STO_COORDINATES.name}
          </div>
          <p class="text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">${STO_COORDINATES.alamat}</p>
          <div class="mt-2 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
            Sentral Telepon Otomatis (STO) & Pusat Komando Operasional Telkom Akses Payakumbuh
          </div>
        </div>
      `);
    layerGroup.addLayer(stoMarker);

    // 2. Penanda Lokasi Teknisi (Bentuk & Warna Sesuai Jenis Pekerjaan + Kedip Lembut 1 Detik)
    if (showTechnicians) {
      trackingGps.forEach(gps => {
        const technician = users.find(u => Number(u.id) === Number(gps.teknisi_id));
        // Hubungkan ke tugas yang diambil oleh teknisi ini
        const assignedTask = tugas.find(t =>
          (Number(t.id) === Number(gps.tugas_id) || Number(t.teknisi_id) === Number(gps.teknisi_id)) &&
          t.status !== 'Done'
        );
        const isWorking = Boolean(assignedTask);
        const taskCfg = getTaskTypeConfig(assignedTask ? assignedTask.jenis_kerja : 'Siaga');

        const techIcon = L.divIcon({
          className: 'custom-tech-icon',
          html: `
            <div class="flex flex-col items-center cursor-pointer" style="transform: translate(-50%, -100%);">
              <!-- Label Nama Teknisi & Jenis Pekerjaan -->
              <div class="px-2.5 py-0.5 rounded-full ${isWorking ? `${taskCfg.bgTw} text-white border ${taskCfg.borderTw}` : 'bg-slate-900/95 text-slate-200 border border-slate-700'} font-bold text-[10px] shadow-lg whitespace-nowrap mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-white beacon-soft' : 'bg-emerald-400'}"></span>
                <span>${technician ? technician.nama_lengkap.split(' ')[0] : 'Teknisi'}</span>
                ${isWorking ? `<span class="text-[8px] bg-black/30 px-1 py-0.2 rounded font-black tracking-wider uppercase">${taskCfg.code}</span>` : ''}
              </div>

              <!-- Bingkai Penanda Khusus Berdasarkan Bentuk Jenis Pekerjaan (Diamond / Squircle / Triangle / Octagon) -->
              <div class="beacon-soft">
                <div class="w-8 h-8 ${taskCfg.shapeClass} ${taskCfg.bgTw} border-2 border-white shadow-xl flex items-center justify-center text-white" style="background-color: ${taskCfg.bgColor};">
                  ${taskCfg.iconSvg}
                </div>
              </div>
            </div>
          `,
          iconSize: [36, 52],
          iconAnchor: [18, 52]
        });

        const techMarker = L.marker([gps.latitude, gps.longitude], { icon: techIcon })
          .bindPopup(`
            <div class="p-2.5 min-w-[240px] text-xs">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span class="font-extrabold text-blue-500">${technician?.nama_lengkap || 'Teknisi Lapangan'}</span>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${isWorking ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'}">
                  ${isWorking ? `● MENUJU LOKASI` : 'STANDBY SIAGA'}
                </span>
              </div>
              <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                <div><strong>Status Bergerak:</strong> ${gps.kecepatan}</div>
                <div><strong>Akurasi GPS:</strong> ${gps.akurasi}</div>
                <div><strong>Baterai HP:</strong> ${gps.baterai}%</div>
                <div><strong>Pembaruan Terakhir:</strong> ${gps.waktu_update}</div>

                ${assignedTask ? `
                  <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tugas yang Sedang Ditangani:</span>
                    <div class="font-bold text-slate-900 dark:text-white mt-0.5" style="color: ${taskCfg.bgColor};">
                      #${assignedTask.id} — ${assignedTask.jenis_kerja}
                    </div>
                    <div class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Pelanggan: ${assignedTask.pelanggan_nama || 'Pelanggan Telkom'}
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Alamat: ${assignedTask.lokasi}
                    </div>
                  </div>
                ` : '<div class="text-[10px] text-slate-400 mt-1 italic">Siaga di Wilayah STO Payakumbuh</div>'}
              </div>
            </div>
          `);

        layerGroup.addLayer(techMarker);

        // 3. Garis Rute Menghubungkan Teknisi ke Lokasi Pemasangan/Perbaikan Pelanggan
        if (showRoutes && assignedTask && assignedTask.target_lat && assignedTask.target_lng) {
          const polyline = L.polyline(
            [
              [gps.latitude, gps.longitude],
              [assignedTask.target_lat, assignedTask.target_lng]
            ],
            {
              color: taskCfg.lineColor,
              weight: 3.5,
              dashArray: '6, 6',
              opacity: 0.85
            }
          );
          layerGroup.addLayer(polyline);
        }
      });
    }

    // 4. Penanda Titik Lokasi Pemasangan / Perbaikan Pelanggan
    if (showTasks) {
      tugas.forEach(task => {
        if (!task.target_lat || !task.target_lng) return;

        const isDone = task.status === 'Done';
        const isSelected = selectedTugasId === task.id;
        const taskCfg = getTaskTypeConfig(task.jenis_kerja);
        const assignedTech = users.find(u => Number(u.id) === Number(task.teknisi_id));

        const taskIcon = L.divIcon({
          className: 'custom-task-icon',
          html: `
            <div class="flex flex-col items-center cursor-pointer ${isSelected ? 'scale-125 z-50' : ''}" style="transform: translate(-50%, -100%);">
              <div class="px-2 py-0.5 rounded-full ${isDone ? 'bg-slate-700 text-slate-200 border-slate-600' : `${taskCfg.bgTw} text-white border ${taskCfg.borderTw}`} font-bold text-[10px] border shadow-md whitespace-nowrap mb-1">
                #${task.id} ${taskCfg.type}
              </div>
              <div class="w-7 h-7 ${taskCfg.shapeClass} ${isDone ? 'bg-emerald-600' : taskCfg.bgTw} border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs" style="background-color: ${isDone ? '#059669' : taskCfg.bgColor};">
                ${isDone ? '✓' : '!'}
              </div>
            </div>
          `,
          iconSize: [28, 44],
          iconAnchor: [14, 44]
        });

        const taskMarker = L.marker([task.target_lat, task.target_lng], { icon: taskIcon })
          .on('click', () => onSelectTugas(task.id))
          .bindPopup(`
            <div class="p-2.5 text-xs min-w-[230px]">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span class="font-extrabold text-slate-900 dark:text-white">Tiket #${task.id}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  task.status === 'Done' ? 'bg-emerald-500/20 text-emerald-500' :
                  task.status === 'Progress' ? 'bg-blue-500/20 text-blue-500' :
                  'bg-amber-500/20 text-amber-500'
                }">${task.status}</span>
              </div>
              <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                <div><strong>Jenis Pekerjaan:</strong> <span style="color: ${taskCfg.bgColor};" class="font-bold">${task.jenis_kerja}</span></div>
                <div><strong>Pelanggan:</strong> ${task.pelanggan_nama || 'Pelanggan STO'}</div>
                <div><strong>Alamat Pemasangan/Perbaikan:</strong> ${task.lokasi}</div>
                <div><strong>Teknisi Ditugaskan:</strong> ${assignedTech?.nama_lengkap || 'Belum Diambil (Pool Terbuka)'}</div>
                ${task.keterangan ? `<div class="text-[10px] text-slate-400 mt-1 italic">${task.keterangan}</div>` : ''}
              </div>
            </div>
          `);

        layerGroup.addLayer(taskMarker);
      });
    }
  }, [trackingGps, tugas, users, STO_COORDINATES, showRoutes, showTasks, showTechnicians, selectedTugasId, onSelectTugas]);

  // Kontrol Navigasi Peta
  const resetToCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([STO_COORDINATES.lat, STO_COORDINATES.lng], 14, { duration: 1.0 });
    }
  };

  const fitAllMarkers = () => {
    if (!mapInstanceRef.current) return;
    const points = [
      [STO_COORDINATES.lat, STO_COORDINATES.lng],
      ...trackingGps.map(g => [g.latitude, g.longitude]),
      ...tugas.filter(t => t.target_lat && t.target_lng).map(t => [t.target_lat, t.target_lng])
    ];
    if (points.length > 0) {
      mapInstanceRef.current.fitBounds(points, { padding: [40, 40] });
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-100 dark:bg-slate-950">
      
      {/* Container Leaflet DOM */}
      <div ref={mapRef} className="w-full h-full min-h-[480px] z-0" />

      {/* Bar Kontrol Atas (Pusatkan & Filter Layer) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl p-1.5 flex items-center gap-1 shadow-xl">
          <button
            onClick={resetToCenter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Pusatkan Peta ke HQ STO Telkom Payakumbuh"
          >
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            <span>HQ STO</span>
          </button>
          <button
            onClick={fitAllMarkers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tampilkan Seluruh Armada & Titik Pemasangan"
          >
            <LocateFixed className="w-3.5 h-3.5 text-blue-500" />
            <span>Semua Titik</span>
          </button>
        </div>

        {/* Toggle Overlays */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-2 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 shadow-xl">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-rose-500">
            <input
              type="checkbox"
              checked={showTechnicians}
              onChange={e => setShowTechnicians(e.target.checked)}
              className="accent-rose-600 rounded w-3.5 h-3.5"
            />
            <span>Teknisi ({trackingGps.length})</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-rose-500">
            <input
              type="checkbox"
              checked={showTasks}
              onChange={e => setShowTasks(e.target.checked)}
              className="accent-rose-600 rounded w-3.5 h-3.5"
            />
            <span>Titik Pasang/Perbaikan ({tugas.length})</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-rose-500">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={e => setShowRoutes(e.target.checked)}
              className="accent-rose-600 rounded w-3.5 h-3.5"
            />
            <span>Rute Lapangan</span>
          </label>
        </div>
      </div>

      {/* Legenda Bentuk & Warna Penanda (Kiri Atas Melayang) */}
      <div className="absolute top-16 left-4 z-10 hidden md:block">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xl text-[10px] space-y-1.5 max-w-[210px]">
          <span className="font-extrabold text-slate-400 uppercase tracking-wider block">Bentuk Penanda:</span>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 marker-shape-diamond bg-sky-600 border border-sky-300 inline-block shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Pasang Baru (Belah Ketupat)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 marker-shape-squircle bg-amber-500 border border-amber-300 inline-block shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Perbaikan (Kotak Halus)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 marker-shape-triangle bg-rose-600 border border-rose-300 inline-block shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Gangguan / LOS (Segitiga)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 marker-shape-octagon bg-purple-600 border border-purple-300 inline-block shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Kabel Putus (Octagon)</span>
          </div>
        </div>
      </div>

      {/* Pemilih Tipe Peta (Kiri Bawah) */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="relative">
          <button
            onClick={() => setShowLayerPicker(!showLayerPicker)}
            className="group flex items-center gap-2.5 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl hover:border-rose-500 transition-all cursor-pointer"
            title="Ganti Jenis Peta (Satelit Hybrid, Street, Dark, Topo)"
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-black/10">
              <img
                src={MAP_LAYERS[activeLayerId]?.thumbnail}
                alt={MAP_LAYERS[activeLayerId]?.name}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>

            <div className="text-left pr-2 hidden sm:block">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Mode Peta
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                {MAP_LAYERS[activeLayerId]?.name}
              </span>
            </div>
          </button>

          {showLayerPicker && (
            <div className="absolute bottom-16 left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl p-3 shadow-2xl w-64 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                Pilih Tampilan Peta (Fast Tile):
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.keys(MAP_LAYERS).map((key) => {
                  const layer = MAP_LAYERS[key];
                  const isActive = activeLayerId === key;
                  return (
                    <button
                      key={key}
                      onClick={() => switchBaseLayer(key)}
                      className={`relative flex flex-col items-center p-2 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                        isActive
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 shadow-md ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-950/60'
                      }`}
                    >
                      <div className="w-full h-14 rounded-xl overflow-hidden mb-1.5 relative">
                        <img
                          src={layer.thumbnail}
                          alt={layer.name}
                          className="w-full h-full object-cover"
                        />
                        {isActive && (
                          <div className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 shadow">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                        {layer.name}
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                        {layer.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Telemetri Live (Kanan Bawah) */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              WebGIS Telemetri GPS
            </div>
            <div className="text-xs font-black text-slate-800 dark:text-white leading-tight mt-0.5">
              STO Telkom Payakumbuh
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
