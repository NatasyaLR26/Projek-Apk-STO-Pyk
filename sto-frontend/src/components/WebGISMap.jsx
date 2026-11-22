/**
 * ============================================================================
 * KOMPONEN: WebGISMap (Peta Geospasial Infrastruktur Jaringan STO Telkom Akses)
 * ============================================================================
 * Standar WebGIS Resmi Pemetaan Infrastruktur Fiber Optic Payakumbuh:
 * 1. Peta terpusat di Kantor STO Telkom Akses Payakumbuh (Koto Nan IV).
 * 2. Menampilkan sebaran titik ODP (Optical Distribution Point) Telkom Akses.
 * 3. Indikator kapasitas port ODP (Tersedia, Hampir Penuh, Penuh, Maintenance).
 * 4. PENGELOMPOKAN (GROUPING) TITIK ODP BERDASARKAN WILAYAH KERJA & STATUS.
 * 5. CRUD LENGKAP ODP OLEH PIMPINAN (Tambah via Pinpoint/Form, Edit, Hapus)
 *    tersinkronisasi langsung ke tabel 'odp' di Supabase Cloud.
 * 6. Bebas dari kabel distribusi, murni fokus pada aset titik ODP lapangan.
 * ============================================================================
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import '../leaflet-setup';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { parseTaskDetails } from '../utils/taskFormatter';
import {
  Layers,
  Check,
  MapPin,
  Plus,
  Filter,
  X,
  Edit2,
  Trash2,
  FolderTree,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Compass,
  Maximize2,
  Minimize2,
  Network,
  Crosshair,
  User,
  Radio,
  Wrench
} from 'lucide-react';

// Konfigurasi jenis pekerjaan, warna, bentuk penanda, dan badge
export function getTaskTypeConfig(jenisKerja = '') {
  const str = (jenisKerja || '').toLowerCase();

  if (str.includes('pasang baru') || str.includes('psb')) {
    return {
      type: 'Pasang Baru',
      code: 'PSB',
      badgeText: 'PASANG BARU',
      badgeBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      shapeClass: 'marker-shape-diamond',
      bgColor: '#0284c7',
      borderColor: '#7dd3fc',
      bgTw: 'bg-sky-600',
      borderTw: 'border-sky-300',
      textColor: 'text-sky-400',
      lineColor: '#0284c7'
    };
  }

  if (str.includes('kabel putus') || str.includes('cut') || str.includes('fo cut')) {
    return {
      type: 'Kabel Putus',
      code: 'CUT',
      badgeText: 'KABEL PUTUS',
      badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      shapeClass: 'marker-shape-octagon',
      bgColor: '#9333ea',
      borderColor: '#d8b4fe',
      bgTw: 'bg-purple-600',
      borderTw: 'border-purple-300',
      textColor: 'text-purple-400',
      lineColor: '#9333ea'
    };
  }

  if (str.includes('gangguan') || str.includes('los') || str.includes('repair')) {
    return {
      type: 'Gangguan',
      code: 'LOS',
      badgeText: 'GANGGUAN (LOS)',
      badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      shapeClass: 'marker-shape-triangle',
      bgColor: '#e11d48',
      borderColor: '#fca5a5',
      bgTw: 'bg-rose-600',
      borderTw: 'border-rose-300',
      textColor: 'text-rose-400',
      lineColor: '#e11d48'
    };
  }

  if (str.includes('perbaikan') || str.includes('maintenance')) {
    return {
      type: 'Perbaikan',
      code: 'PBK',
      badgeText: 'PERBAIKAN',
      badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      shapeClass: 'marker-shape-squircle',
      bgColor: '#d97706',
      borderColor: '#fde68a',
      bgTw: 'bg-amber-500',
      borderTw: 'border-amber-300',
      textColor: 'text-amber-400',
      lineColor: '#d97706'
    };
  }

  if (str.includes('odp') || str.includes('splitter')) {
    return {
      type: 'ODP',
      code: 'ODP',
      badgeText: 'ODP / SPLITTER',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      shapeClass: 'marker-shape-squircle',
      bgColor: '#059669',
      borderColor: '#6ee7b7',
      bgTw: 'bg-emerald-600',
      borderTw: 'border-emerald-300',
      textColor: 'text-emerald-400',
      lineColor: '#059669'
    };
  }

  return {
    type: 'Siaga',
    code: 'SBY',
    badgeText: 'SIAGA STO',
    badgeBg: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
    shapeClass: 'rounded-full',
    bgColor: '#475569',
    borderColor: '#94a3b8',
    bgTw: 'bg-slate-700',
    borderTw: 'border-slate-400',
    textColor: 'text-slate-300',
    lineColor: '#64748b'
  };
}

// Layer Peta Resmi (Google Satellite Hybrid, Esri Satellite + Street Label, Carto Voyager, Carto Dark, Esri Topo)
const MAP_LAYERS = {
  satellite: {
    id: 'satellite',
    name: 'Satelit Hybrid',
    desc: 'Citra Satelit & Street Label Jalan (Google Hybrid)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satelit & Label',
    maxZoom: 20
  },
  satellite_street_label: {
    id: 'satellite_street_label',
    name: 'Satelit + Street Label HD',
    desc: 'Citra Satelit Esri + Street Label Jalan Transparan',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & OpenStreetMap',
    maxZoom: 19
  },
  street: {
    id: 'street',
    name: 'Street View',
    desc: 'Peta Jalan & Bangunan Jelas (Carto Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 19
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    desc: 'Peta Jalan Lengkap (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    desc: 'Mode Gelap Kontras Tinggi (Carto Dark)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 19
  },
  topo: {
    id: 'topo',
    name: 'Topografi',
    desc: 'Kontur Wilayah & Ketinggian (Esri Topo)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Topo Map',
    maxZoom: 18
  }
};

// Helper validasi koordinat GPS aman (-90 s/d 90 dan -180 s/d 180, bukan 0,0)
export function isValidCoord(lat, lng) {
  const pLat = parseFloat(String(lat).replace(',', '.'));
  const pLng = parseFloat(String(lng).replace(',', '.'));
  return (
    !isNaN(pLat) &&
    !isNaN(pLng) &&
    pLat >= -90 &&
    pLat <= 90 &&
    pLng >= -180 &&
    pLng <= 180 &&
    (pLat !== 0 || pLng !== 0)
  );
}

// Helper konversi string koordinat (koma -> titik, presisi 6 digit float aman)
export function parseGpsCoord(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const str = String(val).replace(',', '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? fallback : Number(num.toFixed(6));
}

// Helper menentukan zona wilayah ODP
function getOdpWilayah(point) {
  const loc = (point.alamat || point.nama_lokasi || '').toLowerCase();
  if (loc.includes('koto nan iv') || loc.includes('soekarno')) return 'Koto Nan IV (Sentral STO)';
  if (loc.includes('balai nan duo')) return 'Balai Nan Duo (Payakumbuh Barat)';
  if (loc.includes('sudirman') || loc.includes('labuh basilang')) return 'Labuh Basilang & Ruko';
  if (loc.includes('pasar ibuh') || loc.includes('pasar')) return 'Sentra Pasar Ibuh';
  if (loc.includes('benteng') || loc.includes('payolansek')) return 'Simpang Benteng / Payolansek';
  if (loc.includes('tiakar') || loc.includes('timur')) return 'Kelurahan Tiakar (Payakumbuh Timur)';
  return 'Wilayah Payakumbuh Lainnya';
}

export default function WebGISMap({
  selectedOdpId = null,
  onSelectOdp = () => {},
  selectedTugasId = null,
  onSelectTugas = () => {},
  odpToEdit = null,
  onClearEditOdp = () => {},
  onEditOdp = null
}) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const currentLabelLayerRef = useRef(null);
  const layerGroupRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const odpMarkersRef = useRef({});
  const taskMarkersRef = useRef({});
  const tempMarkerRef = useRef(null);

  const { isDark } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClusterMode, setIsClusterMode] = useState(true);

  const {
    odp = [],
    tugas = [],
    users = [],
    STO_COORDINATES,
    addOdp,
    updateOdp,
    deleteOdp,
    currentUser,
    showToast
  } = useApp();

  const isPimpinan = currentUser?.role === 'pimpinan' || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?.role === 'pimpinan';
    } catch {
      return false;
    }
  })();

  // Armada Teknisi Lapangan (Live GPS)
  const fieldTechs = useMemo(() => {
    const techs = users.filter(u => u.role === 'teknisi');
    const tech1 = techs[0] || { id: 2, nama_lengkap: 'Ari Teknisi', phone: '0812-8921-3341' };
    const tech2 = techs[1] || { id: 3, nama_lengkap: 'Fadli Ramadhan', phone: '0812-8921-3342' };

    return [
      {
        ...tech1,
        lat: -0.2278,
        lng: 100.6322,
        status: 'Live GPS • Menuju Pelanggan',
        lokasi_tugas: 'Koto Nan IV, Payakumbuh'
      },
      {
        ...tech2,
        lat: -0.2295,
        lng: 100.6348,
        status: 'Live GPS • Sedang Bekerja Splicing',
        lokasi_tugas: 'Balai Nan Duo, Payakumbuh'
      }
    ];
  }, [users]);

  const [activeLayerId, setActiveLayerId] = useState(() => {
    return localStorage.getItem('sto_selected_map_layer') || 'satellite';
  });
  const [showLayerPicker, setShowLayerPicker] = useState(false);

  // Filter & Grouping State
  const [odpStatusFilter, setOdpStatusFilter] = useState('all'); // 'all' | 'Tersedia' | 'Penuh' | 'Maintenance'
  const [showOdpPoints, setShowOdpPoints] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(14);

  // Unified Add ODP Method Selection Modal
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    'Koto Nan IV (Sentral STO)': true,
    'Balai Nan Duo (Payakumbuh Barat)': true,
    'Labuh Basilang & Ruko': true,
    'Sentra Pasar Ibuh': true,
    'Simpang Benteng / Payolansek': true,
    'Kelurahan Tiakar (Payakumbuh Timur)': true,
    'Wilayah Payakumbuh Lainnya': true
  });

  // Pinpoint Mode & Modal Tambah
  const [isPinpointMode, setIsPinpointMode] = useState(false);
  const [pinpointCoords, setPinpointCoords] = useState({ lat: null, lng: null });
  const [showPinpointModal, setShowPinpointModal] = useState(false);
  const [isSubmittingOdp, setIsSubmittingOdp] = useState(false);
  const [pinpointForm, setPinpointForm] = useState({
    kode_odp: '',
    alamat: '',
    kapasitas_port: 8,
    port_terpakai: 0,
    redaman_dbm: '-18.5',
    status: 'Tersedia'
  });

  // Modal Edit ODP
  const [editingOdp, setEditingOdp] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Helper tutup modal edit ODP & bersihkan referensi parent
  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingOdp(null);
    if (typeof onClearEditOdp === 'function') {
      onClearEditOdp();
    }
  }, [onClearEditOdp]);

  // Sinkronisasi prop odpToEdit dari parent (WebGISTracking) ke modal edit ODP
  useEffect(() => {
    if (odpToEdit) {
      const target = typeof odpToEdit === 'object'
        ? odpToEdit
        : odp.find(o => Number(o.id) === Number(odpToEdit));
      if (target) {
        setEditingOdp({ ...target });
        setShowEditModal(true);
      }
    }
  }, [odpToEdit, odp]);

  // Expose global callback agar popup Leaflet bisa memanggil Edit/Delete
  useEffect(() => {
    window.__handleWebGisEditOdp = (id) => {
      const target = odp.find(o => Number(o.id) === Number(id));
      if (target) {
        if (typeof onEditOdp === 'function') {
          onEditOdp(target);
        } else {
          setEditingOdp(target);
          setShowEditModal(true);
        }
      }
    };

    window.__handleWebGisDeleteOdp = (id, kode) => {
      if (window.confirm(`Konfirmasi Hapus: Apakah Anda yakin ingin menghapus titik ODP '${kode}'?`)) {
        deleteOdp(id);
      }
    };

    return () => {
      delete window.__handleWebGisEditOdp;
      delete window.__handleWebGisDeleteOdp;
    };
  }, [odp, deleteOdp, onEditOdp]);

  // Kelompokkan ODP berdasarkan Wilayah
  const groupedOdps = useMemo(() => {
    const groups = {};
    odp.forEach(point => {
      if (odpStatusFilter !== 'all' && point.status !== odpStatusFilter) return;
      const wilayah = getOdpWilayah(point);
      if (!groups[wilayah]) {
        groups[wilayah] = [];
      }
      groups[wilayah].push(point);
    });
    return groups;
  }, [odp, odpStatusFilter]);

  // Apply Tile Layer
  const applyTileLayer = useCallback((map, layerKey) => {
    const config = MAP_LAYERS[layerKey] || MAP_LAYERS.satellite;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
      currentTileLayerRef.current = null;
    }
    if (currentLabelLayerRef.current) {
      map.removeLayer(currentLabelLayerRef.current);
      currentLabelLayerRef.current = null;
    }

    const tileLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom || 19,
      subdomains: 'abcd',
      attribution: config.attribution,
      keepBuffer: 8,
      updateWhenIdle: true,
      updateWhenZooming: false,
      crossOrigin: true
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;

    // Tambahkan lapisan Street Label transparan jika layer memilikinya
    if (config.labelUrl) {
      const labelLayer = L.tileLayer(config.labelUrl, {
        maxZoom: config.maxZoom || 19,
        subdomains: 'abcd',
        keepBuffer: 8,
        updateWhenIdle: true,
        crossOrigin: true,
        zIndex: 650
      }).addTo(map);
      currentLabelLayerRef.current = labelLayer;
    }
  }, []);

  // Inisialisasi Peta Leaflet (Aman dari "Map container is already initialized" & Memory Leak)
  useEffect(() => {
    if (!mapRef.current) return;

    // Bersihkan instance lama jika ada (cegah "Map container is already initialized")
    if (mapInstanceRef.current) {
      mapInstanceRef.current.off();
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Bersihkan ID internal Leaflet dari DOM container jika tersisa
    if (mapRef.current._leaflet_id) {
      delete mapRef.current._leaflet_id;
    }

    const initialLayer = localStorage.getItem('sto_selected_map_layer') || 'satellite';

    const safeCenterLat = isValidCoord(STO_COORDINATES?.lat, STO_COORDINATES?.lng) ? STO_COORDINATES.lat : -0.228582;
    const safeCenterLng = isValidCoord(STO_COORDINATES?.lat, STO_COORDINATES?.lng) ? STO_COORDINATES.lng : 100.624482;

    const map = L.map(mapRef.current, {
      center: [safeCenterLat, safeCenterLng],
      zoom: 14,
      preferCanvas: true, // Optimasi performa render canvas untuk puluhan/ratusan marker ODP & vector
      zoomControl: false,
      scrollWheelZoom: true, // Zoom responsif dengan scroll/mouse wheel
      doubleClickZoom: true, // Zoom dengan double-click
      touchZoom: true, // Zoom dengan pinch layar sentuh / touchpad
      boxZoom: true,
      keyboard: true,
      attributionControl: false
    });

    // Listener perubahan level zoom untuk dynamic tooltip visibility (Cegah overlap di zoom overview)
    map.on('zoomend', () => {
      if (mapInstanceRef.current) {
        setCurrentZoom(mapInstanceRef.current.getZoom());
      }
    });

    applyTileLayer(map, initialLayer);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Percepat load tampilan peta & cegah lag/blank grey tiles
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      if (tempMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(tempMarkerRef.current);
        tempMarkerRef.current = null;
      }
      if (currentLabelLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(currentLabelLayerRef.current);
        currentLabelLayerRef.current = null;
      }
      if (currentTileLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
        currentTileLayerRef.current = null;
      }
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        layerGroupRef.current = null;
      }
      odpMarkersRef.current = {};
      taskMarkersRef.current = {};
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapRef.current && mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id;
      }
    };
  }, [STO_COORDINATES, applyTileLayer]);

  // Ganti Base Layer
  const switchBaseLayer = useCallback((layerId) => {
    if (!mapInstanceRef.current) return;
    setActiveLayerId(layerId);
    localStorage.setItem('sto_selected_map_layer', layerId);
    applyTileLayer(mapInstanceRef.current, layerId);
    setShowLayerPicker(false);
  }, [applyTileLayer]);

  // Handler Fullscreen Peta (Mendukung Fullscreen API Native & CSS Fallback)
  const toggleFullscreen = useCallback(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          setIsFullscreen(prev => !prev);
        });
      } else {
        setIsFullscreen(prev => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  // Sinkronisasi status Fullscreen dan kalkulasi ulang ukuran canvas peta
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Helper buka modal manual tanpa klik peta (Selalu format 6 digit desimal bertitik)
  const handleOpenManualModal = useCallback(() => {
    const rawLat = STO_COORDINATES?.lat || -0.228582;
    const rawLng = STO_COORDINATES?.lng || 100.624482;
    const safeLat = parseGpsCoord(rawLat, -0.228582).toFixed(6);
    const safeLng = parseGpsCoord(rawLng, 100.624482).toFixed(6);

    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }

    setPinpointCoords({ lat: safeLat, lng: safeLng });
    setPinpointForm({
      kode_odp: `ODP-PYK-FA/${String(odp.length + 1).padStart(3, '0')}`,
      alamat: 'Jl. Soekarno Hatta, Payakumbuh',
      kapasitas_port: 8,
      port_terpakai: 0,
      redaman_dbm: '-18.5',
      status: 'Tersedia'
    });
    setIsPinpointMode(false);
    setShowPinpointModal(true);
  }, [odp.length, STO_COORDINATES]);

  // Helper tutup modal pinpoint & bersihkan temporary marker
  const handleClosePinpointModal = useCallback(() => {
    setShowPinpointModal(false);
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  }, []);

  // Update koordinat pinpoint sekaligus memperbarui posisi temporary marker (Sanitasi koma -> titik)
  const updatePinpointCoords = useCallback((newCoords) => {
    const latStr = String(newCoords.lat ?? '').replace(',', '.');
    const lngStr = String(newCoords.lng ?? '').replace(',', '.');
    setPinpointCoords({ lat: latStr, lng: lngStr });

    const numLat = parseFloat(latStr);
    const numLng = parseFloat(lngStr);
    if (tempMarkerRef.current && isValidCoord(numLat, numLng)) {
      tempMarkerRef.current.setLatLng([numLat, numLng]);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([numLat, numLng], { animate: true, duration: 0.5 });
      }
    }
  }, []);

  // Event listener untuk tombol Tambah ODP dari Header Utama Pimpinan (Buka Dialog Pemilihan Metode)
  useEffect(() => {
    const handleHeaderAddOdp = () => {
      setShowAddMethodModal(true);
    };
    window.addEventListener('sto:open-add-odp', handleHeaderAddOdp);
    return () => window.removeEventListener('sto:open-add-odp', handleHeaderAddOdp);
  }, []);

  // Shortcut keyboard ESC untuk membatalkan mode pinpoint
  useEffect(() => {
    if (!isPinpointMode) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPinpointMode(false);
        if (tempMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(tempMarkerRef.current);
          tempMarkerRef.current = null;
        }
        showToast('Mode Pinpoint dibatalkan', 'info');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinpointMode, showToast]);

  // Efek Mode Pinpoint: Crosshair & Tangkap Koordinat Klik Peta
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapRef.current;
    if (!map || !container) return;

    if (isPinpointMode) {
      container.style.cursor = 'crosshair';

      const handleMapPinpointClick = (e) => {
        const { lat, lng } = e.latlng;
        const latFixed = Number(lat.toFixed(6));
        const lngFixed = Number(lng.toFixed(6));

        // Hapus temporary preview marker lama jika ada
        if (tempMarkerRef.current && map) {
          map.removeLayer(tempMarkerRef.current);
          tempMarkerRef.current = null;
        }

        // Tampilkan Temporary Preview Pin pada titik yang baru saja diklik
        const tempIcon = L.divIcon({
          className: 'temporary-odp-pin',
          html: `
            <div class="flex flex-col items-center pointer-events-none" style="transform: translate(-50%, -100%);">
              <div class="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow-lg whitespace-nowrap mb-1 flex items-center gap-1 border border-white">
                <span>📍 Titik Baru</span>
              </div>
              <div class="w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-2xl flex items-center justify-center ring-4 ring-amber-400/40">
                <div class="w-2 h-2 rounded-full bg-slate-950"></div>
              </div>
            </div>
          `,
          iconSize: [28, 44],
          iconAnchor: [14, 44]
        });

        const tempMarker = L.marker([latFixed, lngFixed], {
          icon: tempIcon,
          zIndexOffset: 1000
        }).addTo(map);

        tempMarkerRef.current = tempMarker;

        setPinpointCoords({ lat: latFixed.toFixed(6), lng: lngFixed.toFixed(6) });
        setPinpointForm({
          kode_odp: `ODP-PYK-FA/${String(odp.length + 1).padStart(3, '0')}`,
          alamat: 'Jl. Soekarno Hatta, Payakumbuh',
          kapasitas_port: 8,
          port_terpakai: 0,
          redaman_dbm: '-18.5',
          status: 'Tersedia'
        });

        setIsPinpointMode(false);
        setShowPinpointModal(true);
        if (container) container.style.cursor = '';
      };

      map.on('click', handleMapPinpointClick);
      return () => {
        map.off('click', handleMapPinpointClick);
        if (container) container.style.cursor = '';
      };
    } else {
      if (container) container.style.cursor = '';
    }
  }, [isPinpointMode, odp.length]);

  // Handler simpan ODP baru dari pinpoint / modal
  const handleSavePinpointOdp = async (e) => {
    e.preventDefault();
    if (!pinpointForm.kode_odp || !pinpointForm.alamat) {
      showToast('Kode ODP dan Alamat wajib diisi!', 'warning');
      return;
    }

    setIsSubmittingOdp(true);
    try {
      const safeLat = parseGpsCoord(pinpointCoords.lat, STO_COORDINATES?.lat || -0.228582);
      const safeLng = parseGpsCoord(pinpointCoords.lng, STO_COORDINATES?.lng || 100.624482);

      const rawDbm = parseFloat(String(pinpointForm.redaman_dbm).replace(',', '.')) || -18.5;
      const safeDbm = rawDbm > 0 ? -rawDbm : rawDbm;

      const payload = {
        kode_odp: pinpointForm.kode_odp.toUpperCase().trim(),
        alamat: pinpointForm.alamat.trim(),
        nama_lokasi: pinpointForm.alamat.trim(),
        latitude: safeLat,
        longitude: safeLng,
        kapasitas_port: parseInt(pinpointForm.kapasitas_port, 10) || 8,
        port_terpakai: parseInt(pinpointForm.port_terpakai, 10) || 0,
        redaman_dbm: Number(safeDbm.toFixed(1)),
        status: pinpointForm.status || 'Tersedia'
      };

      await addOdp(payload);
      handleClosePinpointModal();

      if (mapInstanceRef.current && isValidCoord(safeLat, safeLng)) {
        mapInstanceRef.current.flyTo([safeLat, safeLng], 17, {
          duration: 1.2
        });
      }

      showToast(`🎯 ODP '${payload.kode_odp}' berhasil disimpan & tampil di WebGIS!`, 'success');
    } catch (err) {
      showToast('Gagal mendaftarkan titik ODP: ' + err.message, 'error');
    } finally {
      setIsSubmittingOdp(false);
    }
  };

  // Handler Update ODP
  const handleSaveEditOdp = async (e) => {
    e.preventDefault();
    if (!editingOdp) return;

    try {
      const safeLat = parseGpsCoord(editingOdp.latitude, STO_COORDINATES?.lat || -0.228500);
      const safeLng = parseGpsCoord(editingOdp.longitude, STO_COORDINATES?.lng || 100.633500);

      const rawDbm = parseFloat(String(editingOdp.redaman_dbm).replace(',', '.')) || -18.5;
      const safeDbm = rawDbm > 0 ? -rawDbm : rawDbm;

      await updateOdp(editingOdp.id, {
        kode_odp: editingOdp.kode_odp,
        alamat: editingOdp.alamat || editingOdp.nama_lokasi,
        nama_lokasi: editingOdp.alamat || editingOdp.nama_lokasi,
        latitude: safeLat,
        longitude: safeLng,
        kapasitas_port: parseInt(editingOdp.kapasitas_port, 10) || 8,
        port_terpakai: parseInt(editingOdp.port_terpakai, 10) || 0,
        redaman_dbm: Number(safeDbm.toFixed(1)),
        status: editingOdp.status
      });

      handleCloseEditModal();
      showToast(`Data ODP '${editingOdp.kode_odp}' berhasil diperbarui!`, 'success');
    } catch (err) {
      showToast('Gagal memperbarui data ODP: ' + err.message, 'error');
    }
  };

  // Fly to ODP dari drawer / list dengan validasi koordinat aman
  const flyToOdp = (point) => {
    if (mapInstanceRef.current && point) {
      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      if (isValidCoord(lat, lng)) {
        onSelectOdp(point.id);
        const marker = odpMarkersRef.current[point.id];
        if (marker && clusterGroupRef.current && typeof clusterGroupRef.current.zoomToShowLayer === 'function') {
          clusterGroupRef.current.zoomToShowLayer(marker, () => {
            marker.openPopup();
          });
        } else {
          mapInstanceRef.current.flyTo([lat, lng], 17, {
            duration: 1.2
          });
          if (marker) marker.openPopup();
        }
      } else {
        showToast('Koordinat titik ODP tidak valid!', 'warning');
      }
    }
  };

  // Render Penanda Titik ODP & Sentral STO
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    odpMarkersRef.current = {};
    taskMarkersRef.current = {};
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
      clusterGroupRef.current = null;
    }

    // 1. PENANDA KANTOR PUSAT STO TELKOM PAYAKUMBUH (Diferensiasi Merah-Putih & Icon Gedung/Tower)
    const stoLat = isValidCoord(STO_COORDINATES?.lat, STO_COORDINATES?.lng) ? STO_COORDINATES.lat : -0.228582;
    const stoLng = isValidCoord(STO_COORDINATES?.lat, STO_COORDINATES?.lng) ? STO_COORDINATES.lng : 100.624482;

    const stoIcon = L.divIcon({
      className: 'custom-sto-icon',
      html: `
        <div class="flex flex-col items-center cursor-pointer transition-transform hover:scale-110" style="transform: translate(-50%, -100%);">
          <!-- Pin Berlatar Merah-Putih Khas Kantor Sentral STO Telkom -->
          <div class="w-11 h-11 rounded-2xl bg-white border-2 border-rose-600 shadow-2xl flex items-center justify-center p-1.5 ring-4 ring-rose-500/30">
            <div class="w-full h-full rounded-xl bg-gradient-to-tr from-rose-700 to-rose-600 flex items-center justify-center shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                <path d="M10 6h4"/>
                <path d="M10 10h4"/>
                <path d="M10 14h4"/>
                <path d="M10 18h4"/>
              </svg>
            </div>
          </div>
          <div class="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r-2 border-b-2 border-rose-600 bg-white"></div>
        </div>
      `,
      iconSize: [44, 48],
      iconAnchor: [22, 48]
    });

    const stoMarker = L.marker([stoLat, stoLng], { icon: stoIcon })
      .bindTooltip(`
        <div class="px-2.5 py-0.5 rounded-full bg-white text-rose-700 font-extrabold text-[10px] border-2 border-rose-600 shadow-xl whitespace-nowrap flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-rose-600"></span>
          <span>KANTOR SENTRAL STO TELKOM</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -44],
        permanent: false,
        opacity: 1,
        className: 'odp-leaflet-tooltip'
      })
      .bindPopup(`
        <div class="p-3 text-xs min-w-[240px] text-slate-800 dark:text-slate-100">
          <div class="font-extrabold text-rose-600 text-sm flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
            <span>●</span> ${STO_COORDINATES?.name || 'Sentral STO Payakumbuh'}
          </div>
          <p class="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed text-[11px]">${STO_COORDINATES?.alamat || 'Jl. Soekarno Hatta No. 12, Koto Nan IV'}</p>
          <div class="mt-2.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
            Pusat Sentral Jaringan & Distribusi Logistik Telkom Akses Payakumbuh
          </div>
        </div>
      `);
    layerGroup.addLayer(stoMarker);

    // 2. PENANDA TITIK-TITIK ODP (DENGAN DUKUNGAN LEAFLET MARKERCLUSTER)
    if (showOdpPoints && Array.isArray(odp)) {
      // Inisialisasi wadah penampung ODP (Cluster Group atau Layer Group Biasa)
      let odpContainer = layerGroup;
      if (isClusterMode && typeof L.markerClusterGroup === 'function') {
        const clusterGroup = L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 45,
          spiderfyOnMaxZoom: true,
          zoomToBoundsOnClick: true,
          disableClusteringAtZoom: 17,
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: `
                <div class="flex items-center justify-center w-9 h-9 rounded-full bg-cyan-600 text-white font-black text-xs shadow-2xl ring-4 ring-cyan-500/40 border-2 border-white transition-transform hover:scale-110">
                  <span>${count}</span>
                </div>
              `,
              className: 'custom-cluster-marker',
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
          }
        });
        clusterGroupRef.current = clusterGroup;
        layerGroup.addLayer(clusterGroup);
        odpContainer = clusterGroup;
      }

      odp.forEach(point => {
        const lat = parseFloat(point.latitude);
        const lng = parseFloat(point.longitude);
        if (!isValidCoord(lat, lng)) return;

        if (odpStatusFilter !== 'all' && point.status !== odpStatusFilter) {
          return;
        }

        const isSelected = selectedOdpId === point.id;
        const totalPort = Number(point.kapasitas_port) || 8;
        const usedPort = Number(point.port_terpakai) || 0;
        const availablePort = Math.max(0, totalPort - usedPort);
        const percentUsed = Math.min(100, Math.round((usedPort / totalPort) * 100));

        // Status visual color (Konsisten 100% dengan Legenda)
        let statusBg = '#10b981'; // Emerald 500 (Tersedia)
        let statusBadge = 'bg-emerald-500';
        let statusText = 'TERSEDIA';

        if (point.status === 'Maintenance' || Number(point.redaman_dbm) <= -24) {
          statusBg = '#e11d48'; // Rose 600
          statusBadge = 'bg-rose-600';
          statusText = 'MAINTENANCE';
        } else if (availablePort === 0 || point.status === 'Penuh') {
          statusBg = '#e11d48'; // Rose 600 (Port Penuh)
          statusBadge = 'bg-rose-600';
          statusText = 'PORT PENUH';
        } else if (availablePort <= 2 || percentUsed >= 70) {
          statusBg = '#f59e0b'; // Amber 500 (Hampir Penuh)
          statusBadge = 'bg-amber-500';
          statusText = 'HAMPIR PENUH';
        }

        const odpIcon = L.divIcon({
          className: 'custom-odp-icon',
          html: `
            <div id="odp-marker-node-${point.id}" class="odp-marker-node flex flex-col items-center cursor-pointer transition-transform hover:scale-125" style="transform: translate(-50%, -100%);">
              <div class="w-8 h-8 rounded-xl border-2 border-white flex items-center justify-center shadow-xl text-white font-black text-xs" style="background-color: ${statusBg};">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div class="w-2 h-2 rotate-45 -mt-1 border-r-2 border-b-2 border-white" style="background-color: ${statusBg};"></div>
            </div>
          `,
          iconSize: [32, 36],
          iconAnchor: [16, 36]
        });

        const address = point.alamat || point.nama_lokasi || 'Koto Nan IV Payakumbuh';
        const rawOdpDbm = point.redaman_dbm != null ? Number(point.redaman_dbm) : 18.5;
        const odpDbmMag = !isNaN(rawOdpDbm) && rawOdpDbm !== 0 ? Math.abs(rawOdpDbm) : 18.5;
        const formattedOdpDbm = `-${odpDbmMag.toFixed(1)} dBm`;

        const pimpinanActions = isPimpinan ? `
          <div class="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-1.5">
            <button onclick="window.__handleWebGisEditOdp(${point.id})" class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer">
              ✏️ Edit ODP
            </button>
            <button onclick="window.__handleWebGisDeleteOdp(${point.id}, '${point.kode_odp}')" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer">
              🗑️ Hapus
            </button>
          </div>
        ` : '';

        const odpMarker = L.marker([lat, lng], { icon: odpIcon })
          .bindTooltip(`
            <div class="px-2 py-0.5 rounded-full ${statusBadge} text-white font-extrabold text-[9px] shadow-lg whitespace-nowrap flex items-center gap-1 border border-white/60">
              <span>${point.kode_odp}</span>
              <span class="bg-black/30 px-1 rounded text-[8px]">${usedPort}/${totalPort}</span>
            </div>
          `, {
            direction: 'top',
            offset: [0, -32],
            permanent: false,
            opacity: 1,
            className: 'odp-leaflet-tooltip'
          })
          .bindPopup(`
            <div class="p-3 text-xs min-w-[260px] text-slate-800 dark:text-slate-100">
              <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span class="font-black text-sm text-blue-600 dark:text-blue-400">${point.kode_odp}</span>
                  <div class="text-[10px] text-slate-400 font-mono">${getOdpWilayah(point)}</div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${statusBadge}">
                  ${statusText}
                </span>
              </div>

              <div class="mt-2.5 space-y-1.5 text-[11px]">
                <div>
                  <span class="text-slate-400 text-[10px]">Alamat / Lokasi Tiang:</span>
                  <div class="font-semibold text-slate-700 dark:text-slate-200">${address}</div>
                </div>

                <div class="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="text-slate-400">Okupansi Port:</span>
                    <strong>${usedPort} dari ${totalPort} Port Terpakai (${availablePort} Kosong)</strong>
                  </div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-1">
                    <div class="h-full rounded-full transition-all" style="width: ${percentUsed}%; background-color: ${statusBg};"></div>
                  </div>
                </div>

                <div class="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span class="text-slate-400">Redaman Optik:</span>
                  <span class="font-mono font-bold ${odpDbmMag > 24 ? 'text-rose-500' : 'text-emerald-500'}">${formattedOdpDbm}</span>
                </div>

                <div class="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <strong>Koordinat GPS:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}
                </div>

                ${pimpinanActions}
              </div>
            </div>
          `);

        odpMarker.on('click', () => {
          onSelectOdp(point.id);
        });

        odpMarkersRef.current[point.id] = odpMarker;
        odpContainer.addLayer(odpMarker);
      });
    }

    // 3. PENANDA TITIK TIKET / TUGAS LAPANGAN
    if (showTasks && Array.isArray(tugas)) {
      tugas.forEach(task => {
        const tLat = parseFloat(task.target_lat ?? task.latitude);
        const tLng = parseFloat(task.target_lng ?? task.longitude);
        if (!isValidCoord(tLat, tLng)) return;

        const config = getTaskTypeConfig(task.jenis_kerja);
        const cust = parseTaskDetails(task);
        const ticketNum = task.nomor_tiket || `TKG-${String(task.id).padStart(4, '0')}`;
        const assignedTech = users.find(u => Number(u.id) === Number(task.teknisi_id))?.nama_lengkap || task.teknisi_nama || 'Belum Ditugaskan';

        const taskIcon = L.divIcon({
          className: 'custom-task-marker',
          html: `
            <div id="task-marker-node-${task.id}" class="task-marker-node flex flex-col items-center cursor-pointer transition-transform hover:scale-125" style="transform: translate(-50%, -100%);">
              <div class="w-8 h-8 rounded-xl border-2 border-white flex items-center justify-center shadow-xl text-white font-black text-xs" style="background-color: ${config.bgColor};">
                <span class="text-[10px] font-bold">${config.code}</span>
              </div>
              <div class="w-2 h-2 rotate-45 -mt-1 border-r-2 border-b-2 border-white" style="background-color: ${config.bgColor};"></div>
            </div>
          `,
          iconSize: [32, 36],
          iconAnchor: [16, 36]
        });

        const taskMarker = L.marker([tLat, tLng], { icon: taskIcon })
          .bindTooltip(`
            <div class="px-2 py-0.5 rounded-full ${config.bgTw} text-white font-extrabold text-[9px] shadow-lg whitespace-nowrap flex items-center gap-1 border border-white/60">
              <span>${config.code}</span>
              <span>${cust.name || ticketNum}</span>
            </div>
          `, {
            direction: 'top',
            offset: [0, -32],
            permanent: false,
            opacity: 1,
            className: 'odp-leaflet-tooltip'
          })
          .bindPopup(`
            <div class="p-3 text-xs min-w-[250px] text-slate-800 dark:text-slate-100">
              <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span class="font-black text-sm text-blue-600 dark:text-blue-400">#${ticketNum}</span>
                  <div class="text-[10px] text-slate-400 font-semibold">${config.type}</div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${config.badgeBg}">
                  ${task.status || 'Open'}
                </span>
              </div>

              <div class="mt-2.5 space-y-1.5 text-[11px]">
                <div>
                  <span class="text-slate-400 text-[10px]">Pelanggan:</span>
                  <div class="font-bold text-slate-800 dark:text-slate-100">${cust.name} ${cust.telp ? `(${cust.telp})` : ''}</div>
                </div>

                <div>
                  <span class="text-slate-400 text-[10px]">Alamat Pemasangan:</span>
                  <div class="font-semibold text-slate-700 dark:text-slate-200">${cust.address || task.lokasi}</div>
                </div>

                <div class="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                  <span class="text-slate-400">Teknisi Penanggung Jawab:</span>
                  <span class="font-semibold text-slate-700 dark:text-slate-200">${assignedTech}</span>
                </div>

                <div class="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <strong>Koordinat GPS:</strong> ${tLat.toFixed(5)}, ${tLng.toFixed(5)}
                </div>
              </div>
            </div>
          `);

        taskMarker.on('click', () => {
          onSelectTugas(task.id);
        });

        taskMarkersRef.current[task.id] = taskMarker;
        layerGroup.addLayer(taskMarker);

        if (Number(selectedTugasId) === Number(task.id)) {
          setTimeout(() => {
            taskMarker.openPopup();
          }, 150);
        }
      });
    }

    // 4. PENANDA ARMADA TEKNISI LAPANGAN (LIVE GPS REALTIME - CYAN PIN)
    if (showTasks && Array.isArray(fieldTechs)) {
      fieldTechs.forEach(tech => {
        const techIcon = L.divIcon({
          className: 'custom-tech-marker',
          html: `
            <div class="flex flex-col items-center cursor-pointer transition-transform hover:scale-110" style="transform: translate(-50%, -100%);">
              <div class="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white shadow-2xl flex items-center justify-center text-white ring-4 ring-cyan-400/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="w-2 h-2 rotate-45 -mt-1 border-r-2 border-b-2 border-white bg-cyan-500"></div>
            </div>
          `,
          iconSize: [32, 38],
          iconAnchor: [16, 38]
        });

        const techMarker = L.marker([tech.lat, tech.lng], { icon: techIcon })
          .bindTooltip(`
            <div class="px-2.5 py-0.5 rounded-full bg-cyan-600 text-white font-extrabold text-[10px] border border-white shadow-xl whitespace-nowrap flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span>Teknisi: ${tech.nama_lengkap} (Live GPS)</span>
            </div>
          `, {
            direction: 'top',
            offset: [0, -36],
            permanent: false,
            opacity: 1,
            className: 'odp-leaflet-tooltip'
          })
          .bindPopup(`
            <div class="p-3 text-xs min-w-[240px] text-slate-800 dark:text-slate-100">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <div class="font-extrabold text-cyan-600 text-sm flex items-center gap-1.5">
                  <span>👷</span> ${tech.nama_lengkap}
                </div>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  LIVE GPS
                </span>
              </div>
              <div class="mt-2 space-y-1 text-[11px]">
                <div><strong>Status:</strong> ${tech.status}</div>
                <div><strong>Area Tugas:</strong> ${tech.lokasi_tugas}</div>
                <div><strong>Kontak:</strong> ${tech.phone || '0812-8921-3341'}</div>
                <div class="text-[10px] text-slate-400 pt-1 font-mono">
                  GPS: ${tech.lat.toFixed(4)}, ${tech.lng.toFixed(4)}
                </div>
              </div>
            </div>
          `);

        layerGroup.addLayer(techMarker);
      });
    }

    // Cleanup layer group saat effect me-render ulang atau unmount
    return () => {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current = null;
      }
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
      }
      odpMarkersRef.current = {};
      taskMarkersRef.current = {};
    };
  }, [odp, tugas, STO_COORDINATES, odpStatusFilter, showOdpPoints, showTasks, isPimpinan, onSelectOdp, onSelectTugas, currentZoom, isClusterMode, fieldTechs, users, selectedTugasId]);

  // Efek Seleksi ODP Ringan: Cukup buka popup & panTo tanpa re-render layer (Mendongkrak FPS)
  useEffect(() => {
    if (!selectedOdpId) {
      document.querySelectorAll('.odp-selected-node').forEach(el => {
        el.classList.remove('odp-selected-node', 'scale-125', 'z-50');
      });
      return;
    }

    const markers = odpMarkersRef.current;
    const targetMarker = markers[selectedOdpId];

    document.querySelectorAll('.odp-selected-node').forEach(el => {
      el.classList.remove('odp-selected-node', 'scale-125', 'z-50');
    });

    const activeNode = document.getElementById(`odp-marker-node-${selectedOdpId}`);
    if (activeNode) {
      activeNode.classList.add('odp-selected-node', 'scale-125', 'z-50');
    }

    if (targetMarker && mapInstanceRef.current) {
      if (clusterGroupRef.current && typeof clusterGroupRef.current.zoomToShowLayer === 'function') {
        clusterGroupRef.current.zoomToShowLayer(targetMarker, () => {
          targetMarker.openPopup();
        });
      } else {
        targetMarker.openPopup();
        const latlng = targetMarker.getLatLng();
        if (latlng) {
          mapInstanceRef.current.panTo(latlng, { animate: true, duration: 0.5 });
        }
      }
    }
  }, [selectedOdpId]);

  // Efek Seleksi & Navigasi Tiket di Peta (Reaktivitas Lacak Tiket Pimpinan)
  useEffect(() => {
    if (!selectedTugasId) {
      document.querySelectorAll('.task-selected-node').forEach(el => {
        el.classList.remove('task-selected-node', 'scale-125', 'z-50');
      });
      return;
    }

    // Pastikan layer tugas aktif agar penanda tiket terlihat di peta
    setShowTasks(true);

    document.querySelectorAll('.task-selected-node').forEach(el => {
      el.classList.remove('task-selected-node', 'scale-125', 'z-50');
    });

    const activeNode = document.getElementById(`task-marker-node-${selectedTugasId}`);
    if (activeNode) {
      activeNode.classList.add('task-selected-node', 'scale-125', 'z-50');
    }

    const marker = taskMarkersRef.current[selectedTugasId];
    if (marker && mapInstanceRef.current) {
      const latlng = marker.getLatLng();
      if (latlng) {
        mapInstanceRef.current.flyTo(latlng, 17, { animate: true, duration: 1.0 });
        marker.openPopup();
      }
    } else {
      // Fallback: Cari langsung di daftar tugas jika marker belum termount
      const targetTask = tugas.find(t => Number(t.id) === Number(selectedTugasId));
      if (targetTask && mapInstanceRef.current) {
        const tLat = parseFloat(targetTask.target_lat ?? targetTask.latitude);
        const tLng = parseFloat(targetTask.target_lng ?? targetTask.longitude);
        if (isValidCoord(tLat, tLng)) {
          mapInstanceRef.current.flyTo([tLat, tLng], 17, { animate: true, duration: 1.0 });
        }
      }
    }
  }, [selectedTugasId, tugas]);

  // Render Toolbar Kontrol Peta (Dapat digunakan di dalam map untuk desktop & di luar map untuk mobile)
  // Render Toolbar Kontrol Peta (Dikelompokkan rapi, elegan, adaptif Light/Dark Mode)
  const renderToolbarControls = () => (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
      {/* KELOMPOK 1: LAPISAN PETA & FILTER STATUS ODP */}
      <div className="flex items-center gap-1.5">
        {/* Dropdown Layer Peta */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerPicker(!showLayerPicker)}
            className={`h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-bold border shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap ${
              isDark
                ? 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700/80'
                : 'bg-white/95 hover:bg-slate-50 text-slate-800 border-slate-200'
            }`}
            title="Ganti Lapisan Peta"
          >
            <Layers className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{MAP_LAYERS[activeLayerId]?.name?.replace('Satelit Hybrid', 'Satelit') || 'Peta'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {showLayerPicker && (
            <div className={`absolute top-10 left-0 w-56 rounded-2xl border shadow-2xl p-2 text-xs space-y-1 z-50 animate-in fade-in zoom-in-95 ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Pilih Tampilan Peta
              </div>
              {Object.values(MAP_LAYERS).map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    switchBaseLayer(layer.id);
                    setShowLayerPicker(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                    activeLayerId === layer.id
                      ? 'bg-rose-600 text-white font-bold'
                      : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{layer.name}</div>
                    <div className="text-[10px] opacity-75">{layer.desc}</div>
                  </div>
                  {activeLayerId === layer.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Filter Status ODP */}
        <div className={`h-8 flex items-center rounded-xl border px-2 text-xs shadow-md ${
          isDark ? 'bg-slate-900/90 border-slate-700/80 text-white' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <Filter className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
          <select
            value={odpStatusFilter}
            onChange={(e) => setOdpStatusFilter(e.target.value)}
            className={`text-xs pr-1 py-0.5 focus:outline-none cursor-pointer font-bold border-none ${
              isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'
            }`}
          >
            <option value="all">Semua Status</option>
            <option value="Tersedia" className="text-emerald-500 font-bold">Tersedia</option>
            <option value="Penuh" className="text-rose-500 font-bold">Penuh</option>
            <option value="Maintenance" className="text-amber-500 font-bold">Maintenance</option>
          </select>
        </div>
      </div>

      {/* KELOMPOK 2: SEGMENTED CONTROL LAPISAN (Cluster | ODP | Tiket) */}
      <div className={`flex items-center rounded-xl p-0.5 border shadow-md backdrop-blur-md ${
        isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white/95 border-slate-200'
      }`}>
        {/* Toggle Cluster */}
        <button
          type="button"
          onClick={() => {
            setIsClusterMode(prev => {
              const next = !prev;
              showToast(next ? '🎯 Mode Cluster Aktif' : '📍 Mode Titik Individual Aktif', 'info');
              return next;
            });
          }}
          className={`h-7 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
            isClusterMode
              ? isDark
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-cyan-50 text-cyan-700 border border-cyan-300'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
          title={isClusterMode ? 'Nonaktifkan Cluster' : 'Aktifkan Pengelompokan Cluster'}
        >
          <Network className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>Cluster</span>
        </button>

        <div className={`w-px h-3.5 mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

        {/* Toggle ODP */}
        <button
          type="button"
          onClick={() => {
            setShowOdpPoints(prev => {
              const next = !prev;
              showToast(next ? '📍 Titik ODP ditampilkan' : 'Titik ODP disembunyikan', 'info');
              return next;
            });
          }}
          className={`h-7 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
            showOdpPoints
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
          title={showOdpPoints ? 'Sembunyikan ODP' : 'Tampilkan Titik ODP'}
        >
          <Radio className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>ODP</span>
        </button>

        <div className={`w-px h-3.5 mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

        {/* Toggle Tiket & Teknisi */}
        <button
          type="button"
          onClick={() => {
            setShowTasks(prev => {
              const next = !prev;
              showToast(next ? '👷 Layer Tiket & Teknisi ditampilkan' : 'Layer Tiket & Teknisi disembunyikan', 'info');
              return next;
            });
          }}
          className={`h-7 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
            showTasks
              ? isDark
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-blue-50 text-blue-700 border border-blue-300'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
          title={showTasks ? 'Sembunyikan Tiket & Teknisi' : 'Tampilkan Tiket & Teknisi'}
        >
          <User className="w-3 h-3 text-blue-400 shrink-0" />
          <span>Tiket</span>
        </button>
      </div>

      {/* KELOMPOK 3: DRAWER WILAYAH & PINPOINT ODP (LOGO KECIL JELAS) */}
      <div className="flex items-center gap-1.5">
        {/* Drawer Grouping Wilayah */}
        <button
          type="button"
          onClick={() => setShowGroupDrawer(prev => !prev)}
          className={`h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-bold border shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap ${
            showGroupDrawer
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
              : isDark
              ? 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Buka / Tutup Panel Pengelompokan ODP per Wilayah"
        >
          <FolderTree className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Wilayah ({odp.length})</span>
        </button>

        {/* Pinpoint ODP & Form Manual untuk Pimpinan */}
        {isPimpinan && (
          <div className={`flex items-center rounded-xl p-0.5 border shadow-md ${
            isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white/95 border-slate-200'
          }`}>
            {/* Tombol Pinpoint Klik Peta (Logo kecil namun jelas) */}
            <button
              type="button"
              onClick={() => {
                const nextMode = !isPinpointMode;
                setIsPinpointMode(nextMode);
                if (nextMode) {
                  showToast('🎯 Mode Pinpoint: Klik lokasi di peta untuk meletakkan titik ODP', 'info');
                } else {
                  if (tempMarkerRef.current && mapInstanceRef.current) {
                    mapInstanceRef.current.removeLayer(tempMarkerRef.current);
                    tempMarkerRef.current = null;
                  }
                  showToast('Mode Pinpoint dibatalkan', 'info');
                }
              }}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isPinpointMode
                  ? 'bg-amber-500 text-slate-950 shadow-sm animate-pulse'
                  : isDark
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/50'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
              }`}
              title={isPinpointMode ? 'Batalkan Pinpoint (Esc)' : 'Tambah ODP: Klik peta untuk letakkan titik baru'}
            >
              <MapPin className={`w-3.5 h-3.5 shrink-0 ${isPinpointMode ? 'text-slate-950' : 'text-emerald-500'}`} />
              <span>{isPinpointMode ? 'Batal' : '+ Pinpoint'}</span>
            </button>

            <div className={`w-px h-3.5 mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

            {/* Tombol Form Manual */}
            <button
              type="button"
              onClick={handleOpenManualModal}
              className={`h-7 px-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Input ODP Manual via Formulir"
            >
              <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Manual</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={mapContainerRef}
      className={`relative isolate flex flex-col gap-2.5 w-full h-full transition-all ${
        isFullscreen ? 'fixed inset-0 z-[500] w-screen h-screen bg-slate-950 p-2 rounded-none' : ''
      }`}
    >
      {/* Mobile Toolbar (di luar kontainer peta pada layar < md agar tidak menabrak kontrol zoom peta) */}
      <div className="flex md:hidden flex-wrap items-center gap-2 p-2 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-md">
        {renderToolbarControls()}
      </div>

      {/* Kontainer Utama Peta */}
      <div className={`relative isolate w-full h-full min-h-[420px] sm:min-h-[480px] overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 flex-1 ${
        isFullscreen ? 'rounded-xl' : 'rounded-2xl'
      }`}>
        {/* Map Container */}
        <div ref={mapRef} className="w-full h-full z-10" />

        {/* Floating Indicator Banner Saat Mode Pinpoint Aktif */}
        {isPinpointMode && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-amber-500 text-slate-950 px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2.5 animate-bounce">
            <Crosshair className="w-4 h-4 text-slate-950 animate-spin" />
            <span className="text-xs font-extrabold tracking-wide whitespace-nowrap">
              🎯 Mode Pinpoint Aktif: Klik lokasi mana saja di peta untuk meletakkan titik ODP!
            </span>
            <button
              type="button"
              onClick={() => {
                setIsPinpointMode(false);
                if (tempMarkerRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.removeLayer(tempMarkerRef.current);
                  tempMarkerRef.current = null;
                }
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-950 text-white font-bold text-[10px] hover:bg-slate-800 cursor-pointer ml-1"
            >
              Batal (Esc)
            </button>
          </div>
        )}

        {/* Desktop Top Floating Control Bar (Bebas tabrakan dengan zoom, rapi & scrollable horizontal jika resolusi sempit) */}
        <div className="hidden md:flex absolute top-3 left-3 right-14 z-30 items-center overflow-x-auto no-scrollbar pointer-events-auto">
          {renderToolbarControls()}
        </div>

        {/* Kontrol Kanan Atas: Tombol Fullscreen Icon-Only di Pojok Kanan Atas Bebas Tabrakan */}
        <div className="absolute top-3 right-3 z-30">
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xl transition active:scale-95 cursor-pointer backdrop-blur-md border ${
              isDark
                ? 'bg-slate-900/95 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700'
                : 'bg-white/95 hover:bg-slate-50 text-slate-700 hover:text-slate-950 border-slate-200'
            }`}
            title={isFullscreen ? 'Keluar Layar Penuh (ESC)' : 'Layar Penuh (Fullscreen)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>

      {/* DRAWER PENGELOMPOKAN (GROUPING) ODP PER WILAYAH */}
      {showGroupDrawer && (
        <div className={`absolute top-14 left-2 right-2 md:right-auto md:left-3 z-35 md:w-80 bottom-12 max-h-[calc(100%-72px)] overflow-y-auto rounded-3xl backdrop-blur-md border shadow-2xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-left-4 ${
          isDark
            ? 'bg-slate-900/95 border-slate-700 text-white'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-xl'
        }`}>
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-amber-400" />
              <div>
                <h4 className={`font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Pengelompokan ODP Wilayah</h4>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{odp.length} Total Titik Terdata</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGroupDrawer(false)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Tutup Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {Object.keys(groupedOdps).length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                Tidak ada ODP pada filter ini
              </div>
            ) : (
              Object.entries(groupedOdps).map(([wilayah, items]) => {
                const isExpanded = expandedGroups[wilayah] !== false;
                const totalPorts = items.reduce((acc, curr) => acc + (Number(curr.kapasitas_port) || 8), 0);
                const usedPorts = items.reduce((acc, curr) => acc + (Number(curr.port_terpakai) || 0), 0);

                return (
                  <div key={wilayah} className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [wilayah]: !isExpanded }))}
                      className="w-full p-2.5 flex items-center justify-between bg-slate-900/80 hover:bg-slate-800/80 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-200">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{wilayah}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {usedPorts}/{totalPorts} Port
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                          {items.length}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-2 space-y-1.5 border-t border-slate-800/80 divide-y divide-slate-800/40">
                        {items.map(point => {
                          const used = Number(point.port_terpakai) || 0;
                          const cap = Number(point.kapasitas_port) || 8;
                          const isFull = used >= cap || point.status === 'Penuh';

                          return (
                            <div
                              key={point.id}
                              className="pt-1.5 first:pt-0 flex items-center justify-between hover:bg-slate-900/50 p-1 rounded-lg transition"
                            >
                              <div
                                onClick={() => flyToOdp(point)}
                                className="cursor-pointer flex-1 pr-2"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-amber-400 text-[11px]">{point.kode_odp}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${isFull ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {point.status}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                  {point.alamat || point.nama_lokasi}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => flyToOdp(point)}
                                  className="p-1 text-slate-400 hover:text-white rounded"
                                  title="Arahkan Peta ke ODP ini"
                                >
                                  <Compass className="w-3.5 h-3.5 text-blue-400" />
                                </button>
                                {isPimpinan && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOdp(point);
                                        setShowEditModal(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-blue-400 rounded"
                                      title="Edit ODP"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Hapus ODP ${point.kode_odp}?`)) {
                                          deleteOdp(point.id);
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                                      title="Hapus ODP"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Overlay Legend Bar di Pojok Kiri Bawah Map */}
      <div className={`absolute bottom-3 left-3 z-30 flex flex-wrap items-center gap-3 backdrop-blur-md px-3.5 py-1.5 rounded-xl border shadow-xl text-xs pointer-events-auto ${
        isDark ? 'bg-slate-900/90 border-slate-700/80 text-white' : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
      }`}>
        {/* 1. Sentral STO */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3.5 h-3.5 rounded-md bg-white border border-rose-600 flex items-center justify-center shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          </span>
          <span className={`font-bold text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Sentral STO</span>
        </div>

        {/* 2. ODP Tersedia */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-xs"></span>
          <span className={`font-medium text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tersedia</span>
        </div>

        {/* 3. Hampir Penuh */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-xs"></span>
          <span className={`font-medium text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Hampir Penuh</span>
        </div>

        {/* 4. Port Penuh */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-white shadow-xs"></span>
          <span className={`font-medium text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Port Penuh</span>
        </div>

        {/* 5. Teknisi (GPS) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-500 border border-white flex items-center justify-center shadow-xs text-white ring-2 ring-cyan-400/30">
            <User className="w-2 h-2 text-white stroke-[3]" />
          </span>
          <span className={`font-medium text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Teknisi (GPS)</span>
        </div>

        {/* 6. Tiket Lapangan */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3.5 h-3.5 rounded-md bg-sky-600 border border-white flex items-center justify-center shadow-xs text-white font-black text-[8px]">
            TKG
          </span>
          <span className={`font-medium text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tiket</span>
        </div>

        {/* 7. Total ODP Terdata (Badge dengan margin dan padding yang pas) */}
        <div className={`flex items-center pl-2.5 pr-1 border-l shrink-0 ${isDark ? 'border-slate-700/80' : 'border-slate-200'}`}>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-mono text-[10px] font-bold shadow-xs whitespace-nowrap">
            {odp.length} ODP
          </span>
        </div>
      </div>
      </div>

      {/* MODAL 0: PILIH METODE TAMBAH ODP (UNIFIED MODAL DARI HEADER UTAMA) */}
      {showAddMethodModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl relative space-y-5 my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Tambah Titik ODP Baru
                  </h3>
                  <p className="text-[11px] text-slate-400">Pilih metode penentuan koordinat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMethodModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Opsi 1: Tandai di Peta (Pinpoint) */}
              <button
                type="button"
                onClick={() => {
                  setShowAddMethodModal(false);
                  setIsPinpointMode(true);
                  showToast('🎯 Mode Pinpoint Aktif: Klik lokasi pada peta untuk meletakkan titik ODP', 'info');
                }}
                className="w-full flex items-start gap-3.5 p-4 rounded-2xl bg-slate-800/70 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/60 transition group text-left cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition border border-emerald-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-white group-hover:text-emerald-300">
                      Tandai di Peta (Pinpoint)
                    </h4>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Rekomendasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Klik langsung pada posisi tiang di peta untuk mengambil titik koordinat GPS secara otomatis.
                  </p>
                </div>
              </button>

              {/* Opsi 2: Input Manual */}
              <button
                type="button"
                onClick={() => {
                  setShowAddMethodModal(false);
                  handleOpenManualModal();
                }}
                className="w-full flex items-start gap-3.5 p-4 rounded-2xl bg-slate-800/70 hover:bg-blue-950/40 border border-slate-700 hover:border-blue-500/60 transition group text-left cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition border border-blue-500/30">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-blue-300">
                    Input Manual
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Isi data dan koordinat ODP secara manual tanpa memilih lokasi di peta.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddMethodModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 1: FORM TAMBAH TITIK ODP BARU (PIMPINAN) */}
      {showPinpointModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl relative space-y-4 my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Tambah Titik ODP Baru
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePinpointModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Koordinat */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Koordinat Geospasial Peta:
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  Lat: {pinpointCoords.lat} | Lng: {pinpointCoords.lng}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 shadow">
                <Check className="w-3 h-3" />
                <span>Tersinkronisasi</span>
              </span>
            </div>

            <form onSubmit={handleSavePinpointOdp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Kode ODP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODP-PYK-FA/001"
                  value={pinpointForm.kode_odp}
                  onChange={(e) => setPinpointForm({ ...pinpointForm, kode_odp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Alamat / Lokasi Tiang ODP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jl. Soekarno Hatta No. 45, Koto Nan IV"
                  value={pinpointForm.alamat}
                  onChange={(e) => setPinpointForm({ ...pinpointForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Grid Koordinat Latitude & Longitude (Aman Format Titik Desimal 6 Digit) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Latitude (Koordinat) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="-0.228500"
                    value={pinpointCoords.lat ?? ''}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(',', '.');
                      updatePinpointCoords({ ...pinpointCoords, lat: cleanVal });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Longitude (Koordinat) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="100.633500"
                    value={pinpointCoords.lng ?? ''}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(',', '.');
                      updatePinpointCoords({ ...pinpointCoords, lng: cleanVal });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Grid Kapasitas Port, Port Terpakai & Redaman Optik */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Kapasitas Port
                  </label>
                  <select
                    value={pinpointForm.kapasitas_port}
                    onChange={(e) => setPinpointForm({ ...pinpointForm, kapasitas_port: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="8">8 Port (Splitter 1:8)</option>
                    <option value="16">16 Port (Splitter 1:16)</option>
                    <option value="24">24 Port (Multi-Splitter / Gedung)</option>
                    <option value="32">32 Port (Splitter 1:32)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Port Terpakai (Occupied)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={pinpointForm.kapasitas_port}
                    value={pinpointForm.port_terpakai}
                    onChange={(e) => setPinpointForm({ ...pinpointForm, port_terpakai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Redaman Optik (dBm)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="-18.5"
                    value={pinpointForm.redaman_dbm ?? '-18.5'}
                    onChange={(e) => setPinpointForm({ ...pinpointForm, redaman_dbm: e.target.value.replace(',', '.') })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-1">Standar Telkom: -15 s/d -22 dBm (&gt; -24 dBm anomali)</p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClosePinpointModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOdp}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingOdp ? 'Menyimpan...' : 'Simpan Titik ODP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: FORM EDIT ODP (PIMPINAN) */}
      {showEditModal && editingOdp && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl relative space-y-4 my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Edit Data ODP: {editingOdp.kode_odp}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOdp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Kode ODP
                </label>
                <input
                  type="text"
                  required
                  value={editingOdp.kode_odp}
                  onChange={(e) => setEditingOdp({ ...editingOdp, kode_odp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Alamat / Lokasi Tiang
                </label>
                <input
                  type="text"
                  required
                  value={editingOdp.alamat || editingOdp.nama_lokasi || ''}
                  onChange={(e) => setEditingOdp({ ...editingOdp, alamat: e.target.value, nama_lokasi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Latitude (Koordinat) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={editingOdp.latitude}
                    onChange={(e) => setEditingOdp({ ...editingOdp, latitude: e.target.value.replace(',', '.') })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Longitude (Koordinat) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={editingOdp.longitude}
                    onChange={(e) => setEditingOdp({ ...editingOdp, longitude: e.target.value.replace(',', '.') })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Kapasitas Port
                  </label>
                  <select
                    value={editingOdp.kapasitas_port}
                    onChange={(e) => setEditingOdp({ ...editingOdp, kapasitas_port: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="8">8 Port (Splitter 1:8)</option>
                    <option value="16">16 Port (Splitter 1:16)</option>
                    <option value="24">24 Port (Multi-Splitter / Gedung)</option>
                    <option value="32">32 Port (Splitter 1:32)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Port Terpakai
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={editingOdp.kapasitas_port}
                    value={editingOdp.port_terpakai}
                    onChange={(e) => setEditingOdp({ ...editingOdp, port_terpakai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Redaman (dBm)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="-18.5"
                    value={editingOdp.redaman_dbm !== undefined && editingOdp.redaman_dbm !== null ? String(editingOdp.redaman_dbm).replace(',', '.') : '-18.5'}
                    onChange={(e) => setEditingOdp({ ...editingOdp, redaman_dbm: e.target.value.replace(',', '.') })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editingOdp.status}
                    onChange={(e) => setEditingOdp({ ...editingOdp, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Hampir Penuh">Hampir Penuh</option>
                    <option value="Penuh">Penuh</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-1">Standar Telkom: -15 s/d -22 dBm (&gt; -24 dBm anomali)</p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-950 transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan ODP</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Leaflet Tooltip & Cluster & Zoom Control Styling */}
      <style>{`
        .leaflet-tooltip.odp-leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip.odp-leaflet-tooltip::before {
          display: none !important;
        }
        .custom-cluster-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-bar {
          border-radius: 12px !important;
          overflow: hidden !important;
          border: 1px solid #334155 !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4) !important;
        }
        .leaflet-bar a,
        .leaflet-touch .leaflet-bar a {
          background-color: rgba(15, 23, 42, 0.95) !important;
          color: #e2e8f0 !important;
          border-bottom: 1px solid #1e293b !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 30px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.15s ease !important;
        }
        .leaflet-bar a:hover,
        .leaflet-touch .leaflet-bar a:hover {
          background-color: #1e293b !important;
          color: #ffffff !important;
        }
      `}</style>

    </div>
  );
}
