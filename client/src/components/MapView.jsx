import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  Circle,
  Polyline,
  ZoomControl,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { showSuccess } from '../utils/toast';
import {
  Satellite,
  Moon,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Crosshair,
  Copy,
  ExternalLink,
  Activity,
  X,
  Radio,
  Wifi,
  Navigation,
  Compass,
  Info
} from 'lucide-react';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Koordinat STO Telkom Payakumbuh
const STO_PYK_COORDS = [-0.2289, 100.6308];

// Data Titik Sebaran ODP (Optical Distribution Point) Fiber Telkom Payakumbuh
const ODP_POINTS = [
  {
    id: 'ODP-PYK-FA/01',
    nama: 'ODP Sudirman 01',
    lokasi: 'Jl. Jenderal Sudirman No. 24, Payakumbuh Barat',
    lat: -0.2268,
    lng: 100.6335,
    kapasitas: '7/8 Port',
    redaman: '-18.4 dBm',
    status: 'Normal',
    tipe: 'ODP-SOLID 8'
  },
  {
    id: 'ODP-PYK-FB/02',
    nama: 'ODP Ngalau Indah',
    lokasi: 'Kawasan Wisata Ngalau Indah, Jl. Raya Bukittinggi',
    lat: -0.2395,
    lng: 100.6180,
    kapasitas: '6/8 Port',
    redaman: '-19.2 dBm',
    status: 'Normal',
    tipe: 'ODP-CLOSURE 8'
  },
  {
    id: 'ODP-PYK-FC/03',
    nama: 'ODP Simpang Benteng',
    lokasi: 'Simpang Benteng, Daya Bangun, Payakumbuh Kota',
    lat: -0.2225,
    lng: 100.6272,
    kapasitas: '8/8 Port',
    redaman: '-21.8 dBm',
    status: 'Penuh (Full)',
    tipe: 'ODP-POLE 16'
  },
  {
    id: 'ODP-PYK-FD/04',
    nama: 'ODP Tiakar Permai',
    lokasi: 'Kelurahan Tiakar, Payakumbuh Timur',
    lat: -0.2312,
    lng: 100.6450,
    kapasitas: '5/8 Port',
    redaman: '-17.6 dBm',
    status: 'Normal',
    tipe: 'ODP-SOLID 8'
  },
  {
    id: 'ODP-PYK-FE/05',
    nama: 'ODP Koto Nan Ampek',
    lokasi: 'Balai Nan Duo, Koto Nan Ampek',
    lat: -0.2345,
    lng: 100.6358,
    kapasitas: '4/8 Port',
    redaman: '-16.9 dBm',
    status: 'Normal',
    tipe: 'ODP-POLE 8'
  },
  {
    id: 'ODP-PYK-FF/06',
    nama: 'ODP Tanjuang Pauh',
    lokasi: 'Tanjuang Pauh, Payakumbuh Barat',
    lat: -0.2201,
    lng: 100.6402,
    kapasitas: '7/8 Port',
    redaman: '-18.1 dBm',
    status: 'Normal',
    tipe: 'ODP-SOLID 8'
  }
];

// Haversine formula untuk hitung jarak akurat
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 1) {
    return `${Math.round(d * 1000)} meter`;
  }
  return `${d.toFixed(2)} km`;
}

// Custom Marker: Kantor STO Payakumbuh
const createStoOfficeIcon = () => {
  return L.divIcon({
    className: 'sto-office-container',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #ED1C24; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; margin-bottom: 3px; border: 1.5px solid white; box-shadow: 0 4px 10px rgba(237,28,36,0.6); white-space: nowrap;">
          🏢 STO TELKOM PAYAKUMBUH
        </div>
        <div style="width: 36px; height: 36px; background: #0f172a; border: 2.5px solid #ED1C24; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 14px rgba(0,0,0,0.8);">
          <svg style="width: 20px; height: 20px; fill: #ED1C24;" viewBox="0 0 24 24">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ED1C24;"></div>
      </div>
    `,
    iconSize: [36, 54],
    iconAnchor: [18, 54],
    popupAnchor: [0, -50]
  });
};

// Custom Marker: Teknisi Lapangan
const createTechnicianIcon = (name = 'Teknisi', jenisKerja = '') => {
  const isGangguan = jenisKerja.toLowerCase().includes('gangguan');
  const isOdp = jenisKerja.toLowerCase().includes('odp');
  
  let primaryColor = '#3b82f6'; // Biru: Pasang Baru
  let badgeLabel = jenisKerja || 'Tugas';
  if (isGangguan) {
    primaryColor = '#f59e0b'; // Amber: Gangguan
  } else if (isOdp) {
    primaryColor = '#10b981'; // Emerald: ODP Maintenance
  }

  return L.divIcon({
    className: 'technician-marker-container',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: rgba(15, 23, 42, 0.95); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1.5px solid ${primaryColor}; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; items-center; gap: 4px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22c55e; margin-top: 4px;"></span>
          <span>${name}</span>
        </div>
        <div class="custom-marker-pulse" style="width: 34px; height: 34px; background: ${primaryColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px ${primaryColor}80;">
          <svg style="width: 18px; height: 18px; fill: white;" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${primaryColor};"></div>
      </div>
    `,
    iconSize: [34, 56],
    iconAnchor: [17, 56],
    popupAnchor: [0, -52]
  });
};

// Custom Marker: ODP Fiber Box
const createOdpIcon = (odp) => {
  const isPenuh = odp.status.toLowerCase().includes('penuh');
  const color = isPenuh ? '#f59e0b' : '#06b6d4';

  return L.divIcon({
    className: 'odp-marker-container',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: rgba(15, 23, 42, 0.9); color: ${color}; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid ${color}; white-space: nowrap; margin-bottom: 2px;">
          ${odp.id.split('/')[0]}
        </div>
        <div style="width: 26px; height: 26px; background: #0f172a; border: 2px solid ${color}; border-radius: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.6);">
          <svg style="width: 14px; height: 14px; fill: ${color};" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [26, 42],
    iconAnchor: [13, 42],
    popupAnchor: [0, -38]
  });
};

// Custom Marker: Titik Inspeksi Klik Pengguna
const createInspectionIcon = () => {
  return L.divIcon({
    className: 'inspect-marker-container',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #9333ea; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; border: 1px solid white; box-shadow: 0 4px 8px rgba(147,51,234,0.5);">
          Titik Inspeksi
        </div>
        <div style="width: 28px; height: 28px; background: #9333ea; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <svg style="width: 16px; height: 16px; fill: white;" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #9333ea;"></div>
      </div>
    `,
    iconSize: [28, 48],
    iconAnchor: [14, 48],
    popupAnchor: [0, -44]
  });
};

// Helper komponen untuk auto-pan / trigger navigasi peta
function MapController({ center, zoom, fitBoundsTarget, isFullscreen }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);

  useEffect(() => {
    if (fitBoundsTarget && fitBoundsTarget.length > 0) {
      try {
        const bounds = L.latLngBounds(fitBoundsTarget);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } catch (e) {
        console.warn('Fit bounds error:', e);
      }
    }
  }, [fitBoundsTarget, map]);

  useEffect(() => {
    try {
      if (center && !isNaN(center[0]) && !isNaN(center[1])) {
        map.flyTo(center, zoom || 14, { duration: 1.2 });
      }
    } catch (e) {
      console.warn('Leaflet flyTo error:', e);
    }
  }, [center, zoom, map]);

  return null;
}

// Handler klik peta untuk inspeksi titik
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

const MapView = ({
  trackingData = [],
  selectedTracking = null,
  height = '540px'
}) => {
  // State Basemap
  const [basemap, setBasemap] = useState('dark'); // 'dark' | 'satellite' | 'streets'
  // State Toggles
  const [showOdp, setShowOdp] = useState(true);
  const [showRadius, setShowRadius] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [filterJob, setFilterJob] = useState('all'); // 'all' | 'Pasang Baru' | 'Gangguan' | 'ODP'
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Titik klik inspeksi
  const [clickedPoint, setClickedPoint] = useState(null);
  // FitBounds Trigger
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(null);

  // Filter tracking data berdasarkan job type
  const filteredTracking = useMemo(() => {
    if (filterJob === 'all') return trackingData;
    return trackingData.filter((item) =>
      item.jenis_kerja?.toLowerCase().includes(filterJob.toLowerCase())
    );
  }, [trackingData, filterJob]);

  // Posisi terpilih
  const selLat = Number(selectedTracking?.latitude);
  const selLng = Number(selectedTracking?.longitude);
  const hasValidSelected = !isNaN(selLat) && !isNaN(selLng) && (selLat !== 0 || selLng !== 0);

  const effectiveCenter = hasValidSelected
    ? [selLat, selLng]
    : STO_PYK_COORDS;

  // Handler Fit All Bounds
  const handleFitAll = () => {
    const points = [STO_PYK_COORDS];
    filteredTracking.forEach((t) => {
      const lat = Number(t.latitude);
      const lng = Number(t.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        points.push([lat, lng]);
      }
    });
    if (showOdp) {
      ODP_POINTS.forEach((o) => points.push([o.lat, o.lng]));
    }
    setFitBoundsTrigger([...points]);
  };

  // Salin koordinat ke clipboard
  const handleCopyCoord = (lat, lng, label = 'Koordinat') => {
    const text = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    navigator.clipboard.writeText(text);
    showSuccess('Koordinat Disalin', `${label} (${text}) tersimpan di clipboard.`);
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? '!fixed inset-0 !z-[9999] !rounded-none !w-screen !h-screen' : ''
      }`}
      style={{ height: isFullscreen ? '100vh' : height, width: '100%' }}
    >
      {/* 1. TOP-LEFT OVERLAY: Filter Jenis Pekerjaan & Status Info */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2 max-w-xs sm:max-w-md">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span className="hidden sm:inline">Filter:</span>
          </span>
          {['all', 'Pasang Baru', 'Gangguan', 'ODP'].map((job) => (
            <button
              key={job}
              onClick={() => setFilterJob(job)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                filterJob === job
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {job === 'all' ? 'Semua Unit' : job}
            </button>
          ))}
        </div>

        {/* Live Active Counter Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-800 text-[11px] text-slate-300 shadow-lg w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>
            <strong className="text-white">{filteredTracking.length}</strong> Teknisi Lapangan Terdeteksi
          </span>
        </div>
      </div>

      {/* 2. TOP-RIGHT OVERLAY: Basemap Switcher, Layer Toggles, Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
        {/* Basemap Switcher Toolbar */}
        <div className="flex items-center p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl">
          <button
            onClick={() => setBasemap('dark')}
            title="Tampilan Peta Mode Gelap (CARTO)"
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
              basemap === 'dark'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => setBasemap('satellite')}
            title="Tampilan Citra Satelit Hybrid (Esri World Imagery)"
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
              basemap === 'satellite'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Satelit</span>
          </button>

          <button
            onClick={() => setBasemap('streets')}
            title="Tampilan Peta Jalanan (OpenStreetMap)"
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
              basemap === 'streets'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Jalan</span>
          </button>
        </div>

        {/* Feature Toggles & Control Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl">
          <button
            onClick={() => setShowOdp(!showOdp)}
            title="Tampilkan / Sembunyikan Titik Distribusi ODP Fiber"
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              showOdp
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>ODP</span>
          </button>

          <button
            onClick={() => setShowRadius(!showRadius)}
            title="Tampilkan / Sembunyikan Radius Coverage STO Payakumbuh"
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              showRadius
                ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Radius</span>
          </button>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            title="Tampilkan / Sembunyikan Garis Rute Jarak ke Teknisi"
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              showRoutes
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Rute</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Center to STO */}
          <button
            onClick={() => setFitBoundsTrigger([STO_PYK_COORDS])}
            title="Pusatkan Layar ke Kantor STO Telkom Payakumbuh"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Crosshair className="w-4 h-4 text-red-400" />
          </button>

          {/* Fit Bounds All Units */}
          <button
            onClick={handleFitAll}
            title="Perluas Zoom untuk Melihat Seluruh Unit & Titik"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Navigation className="w-4 h-4 text-blue-400" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh Command Center'}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-amber-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 3. BOTTOM-CENTER: Clicked Point Coordinate Inspector */}
      {clickedPoint && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-11/12 max-w-lg bg-slate-900/95 backdrop-blur-md border border-purple-500/40 rounded-2xl p-3.5 shadow-2xl shadow-purple-950/40 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                <Crosshair className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Inspeksi Titik Peta</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                    Jarak ke STO: {calculateDistance(STO_PYK_COORDS[0], STO_PYK_COORDS[1], clickedPoint.lat, clickedPoint.lng)}
                  </span>
                </div>
                <p className="font-mono text-slate-300 text-[11px] mt-0.5">
                  📍 {clickedPoint.lat.toFixed(5)}, {clickedPoint.lng.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopyCoord(clickedPoint.lat, clickedPoint.lng, 'Titik Inspeksi')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/20 text-slate-300 hover:text-purple-300 border border-slate-700 transition-colors"
                title="Salin Koordinat"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${clickedPoint.lat},${clickedPoint.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-slate-700 transition-colors"
                title="Buka Navigasi Rute Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setClickedPoint(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                title="Tutup Panel Inspeksi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM-LEFT: Collapsible Map Legend Widget */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        {showLegend ? (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl text-[11px] text-slate-300 min-w-[200px] animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-red-500" />
                Legenda Jaringan WebGIS
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-500 hover:text-white p-0.5 rounded"
                title="Sembunyikan Legenda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-600 border border-white"></span>
                <span>Kantor STO Telkom Pusat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse border border-white"></span>
                <span>Teknisi Pasang Baru</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse border border-white"></span>
                <span>Teknisi Gangguan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-cyan-500 border border-cyan-300"></span>
                <span>Titik ODP Fiber Optik</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-red-500/60"></span>
                <span>Radius Cakupan 3 km & 5 km</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-cyan-400"></span>
                <span>Kabel Fiber / Rute Lapangan</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLegend(true)}
            className="px-2.5 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white shadow-xl flex items-center gap-1.5"
            title="Tampilkan Legenda Peta"
          >
            <Info className="w-3.5 h-3.5 text-red-500" />
            <span>Legenda</span>
          </button>
        )}
      </div>

      {/* 5. MAIN LEAFLET MAP CONTAINER */}
      <MapContainer
        center={effectiveCenter}
        zoom={13}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#020617' }}
        scrollWheelZoom={true}
      >
        {/* Kontrol Zoom di sudut kanan bawah agar tidak bertumpukan dengan filter di kiri atas */}
        <ZoomControl position="bottomright" />
        {/* Basemap 1: Esri World Dark Gray Canvas (Default, Bebas Watermark) */}
        {basemap === 'dark' && (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
            <TileLayer
              attribution=""
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
          </>
        )}

        {/* Basemap 2: Satelit Hybrid (Esri World Imagery + Road & Place Labels) */}
        {basemap === 'satellite' && (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <TileLayer
              attribution=""
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </>
        )}

        {/* Basemap 3: OpenStreetMap Standard Street */}
        {basemap === 'streets' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* Controller Navigasi dan Handler Klik Peta */}
        <MapController center={effectiveCenter} zoom={13} fitBoundsTarget={fitBoundsTrigger} isFullscreen={isFullscreen} />
        <MapClickHandler onMapClick={(latlng) => setClickedPoint({ lat: latlng.lat, lng: latlng.lng })} />

        {/* STO Payakumbuh Coverage Zone Radius Circles */}
        {showRadius && (
          <>
            {/* Primary Core Zone: 3 km */}
            <Circle
              center={STO_PYK_COORDS}
              radius={3000}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: '4, 6'
              }}
            >
              <Tooltip direction="top" className="custom-map-tooltip">
                Radius Layanan Utama STO Payakumbuh (3 km)
              </Tooltip>
            </Circle>

            {/* Extended Coverage Zone: 5 km */}
            <Circle
              center={STO_PYK_COORDS}
              radius={5000}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#dc2626',
                fillOpacity: 0.02,
                weight: 1,
                dashArray: '6, 10'
              }}
            >
              <Tooltip direction="top" className="custom-map-tooltip">
                Batas Jangkauan Maksimal STO Payakumbuh (5 km)
              </Tooltip>
            </Circle>
          </>
        )}

        {/* STO Payakumbuh Central Office Marker */}
        <Marker position={STO_PYK_COORDS} icon={createStoOfficeIcon()}>
          <Popup>
            <div className="p-2 min-w-[240px] text-slate-100">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
                  🏢
                </div>
                <div>
                  <h4 className="font-bold text-red-400 text-sm">Kantor STO Telkom Payakumbuh</h4>
                  <p className="text-[10px] text-slate-400">Pusat Distribusi & Operasional</p>
                </div>
              </div>

              <div className="text-xs space-y-1 text-slate-300">
                <p>
                  <strong className="text-slate-400">Alamat:</strong> Jl. Soekarno Hatta No. 45, Payakumbuh
                </p>
                <p>
                  <strong className="text-slate-400">Koordinat:</strong> {STO_PYK_COORDS[0]}, {STO_PYK_COORDS[1]}
                </p>
                <p>
                  <strong className="text-slate-400">Unit Terpantau:</strong>{' '}
                  <span className="font-bold text-emerald-400">{filteredTracking.length} Teknisi Aktif</span>
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCoord(STO_PYK_COORDS[0], STO_PYK_COORDS[1], 'STO Payakumbuh')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin Koordinat</span>
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${STO_PYK_COORDS[0]},${STO_PYK_COORDS[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-[11px] font-bold text-white flex items-center justify-center gap-1 shadow-md shadow-red-900/30 transition-colors"
                  title="Buka di Google Maps"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Dynamic Technician Markers & Polylines */}
        {filteredTracking.map((item) => {
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);
          if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
          const pos = [lat, lng];

          const isGangguan = item.jenis_kerja?.toLowerCase().includes('gangguan');
          const lineColor = isGangguan ? '#f59e0b' : '#38bdf8';
          const distanceStr = calculateDistance(STO_PYK_COORDS[0], STO_PYK_COORDS[1], lat, lng);

          return (
            <React.Fragment key={item.tugas_id || `${lat}-${lng}`}>
              {/* Glowing Dashed Fiber Cable Polyline to STO */}
              {showRoutes && (
                <Polyline
                  positions={[STO_PYK_COORDS, pos]}
                  pathOptions={{
                    color: lineColor,
                    weight: 2.5,
                    dashArray: '6, 8',
                    opacity: 0.75,
                    className: 'animated-fiber-cable'
                  }}
                >
                  <Tooltip sticky className="custom-map-tooltip">
                    Rute {item.nama_teknisi}: {distanceStr} dari STO
                  </Tooltip>
                </Polyline>
              )}

              {/* Technician Marker */}
              <Marker
                position={pos}
                icon={createTechnicianIcon(item.nama_teknisi || 'Teknisi', item.jenis_kerja || '')}
              >
                <Popup>
                  <div className="p-2 min-w-[240px] text-slate-100">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                      <div>
                        <h4 className="font-bold text-red-400 text-sm">{item.nama_teknisi || 'Teknisi'}</h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          TGS-{String(item.tugas_id).padStart(3, '0')}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {item.status_tugas || 'Aktif'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-300">
                      <p>
                        <strong className="text-slate-400">Pekerjaan:</strong>{' '}
                        <span className="text-white font-medium">{item.jenis_kerja || '-'}</span>
                      </p>
                      <p>
                        <strong className="text-slate-400">Lokasi Pelanggan:</strong> {item.lokasi || '-'}
                      </p>
                      <p>
                        <strong className="text-slate-400">Jarak ke STO:</strong>{' '}
                        <span className="font-mono text-amber-400 font-bold">{distanceStr}</span>
                      </p>
                      <p>
                        <strong className="text-slate-400">Koordinat:</strong> {lat.toFixed(5)}, {lng.toFixed(5)}
                      </p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        Sinkronisasi:{' '}
                        {item.waktu_update ? new Date(item.waktu_update).toLocaleTimeString('id-ID') : 'Baru saja'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCoord(lat, lng, `Teknisi ${item.nama_teknisi}`)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Koordinat</span>
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-[11px] font-bold text-white flex items-center justify-center gap-1 shadow-md shadow-blue-900/30 transition-colors"
                        title="Buka Rute Navigasi Google Maps"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Optical Distribution Points (ODP) Layer */}
        {showOdp &&
          ODP_POINTS.map((odp) => (
            <Marker key={odp.id} position={[odp.lat, odp.lng]} icon={createOdpIcon(odp)}>
              <Popup>
                <div className="p-2 min-w-[220px] text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <span className="font-bold text-cyan-400 text-xs font-mono">{odp.id}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        odp.status.includes('Penuh')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {odp.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-300">
                    <p className="font-semibold text-white">{odp.nama}</p>
                    <p className="text-[11px] text-slate-400">{odp.lokasi}</p>
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Kapasitas:</span>
                      <strong className="font-mono text-cyan-300">{odp.kapasitas}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Redaman Optik:</span>
                      <strong className="font-mono text-emerald-400">{odp.redaman}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Jarak ke STO:</span>
                      <strong className="font-mono text-slate-200">
                        {calculateDistance(STO_PYK_COORDS[0], STO_PYK_COORDS[1], odp.lat, odp.lng)}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCoord(odp.lat, odp.lng, odp.id)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin Koordinat</span>
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${odp.lat},${odp.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-[11px] font-bold text-white flex items-center justify-center gap-1 shadow-md shadow-cyan-900/30 transition-colors"
                      title="Rute ke ODP Ini"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Titik Inspeksi Klik Pengguna */}
        {clickedPoint && (
          <Marker position={[clickedPoint.lat, clickedPoint.lng]} icon={createInspectionIcon()}>
            <Popup>
              <div className="p-2 text-xs text-slate-100 min-w-[180px]">
                <h4 className="font-bold text-purple-400 mb-1">Titik Inspeksi Dipilih</h4>
                <p className="font-mono text-[11px] text-slate-300">
                  {clickedPoint.lat.toFixed(5)}, {clickedPoint.lng.toFixed(5)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jarak ke STO: {calculateDistance(STO_PYK_COORDS[0], STO_PYK_COORDS[1], clickedPoint.lat, clickedPoint.lng)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export { ODP_POINTS };
export default MapView;
