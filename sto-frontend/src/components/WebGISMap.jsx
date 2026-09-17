import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import {
  Shield,
  LocateFixed,
  Layers,
  Check
} from 'lucide-react';

// Tile Layer Definitions for Google Maps-like Switcher with Labels on all layers
const MAP_LAYERS = {
  satellite: {
    id: 'satellite',
    name: 'Satelit Hybrid',
    desc: 'Citra Satelit & Label Jalan Asli',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    overlayUrl2: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Citra Satelit & Toponimi',
    thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=100&auto=format&fit=crop&q=80'
  },
  street: {
    id: 'street',
    name: 'Street View',
    desc: 'Peta Jalan, Gedung & Wilayah (OSM)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    thumbnail: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=100&auto=format&fit=crop&q=80'
  },
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    desc: 'Kontras Tinggi & Toponimi Gelap',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Dark Canvas',
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=100&auto=format&fit=crop&q=80'
  },
  topo: {
    id: 'topo',
    name: 'Topografi',
    desc: 'Kontur Ketinggian & Toponimi Wilayah',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Topo Map',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&auto=format&fit=crop&q=80'
  }
};

export default function WebGISMap({ selectedTugasId = null, onSelectTugas = () => {} }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const currentOverlayLayersRef = useRef([]);
  const layerGroupRef = useRef(null);

  const {
    trackingGps,
    tugas,
    users,
    STO_COORDINATES
  } = useApp();

  // Active Base Layer: read from localStorage, default to 'satellite' as requested
  const [activeLayerId, setActiveLayerId] = useState(() => {
    return localStorage.getItem('sto_selected_map_layer') || 'satellite';
  });
  const [showLayerPicker, setShowLayerPicker] = useState(false);

  // Overlay layer filters
  const [showRoutes, setShowRoutes] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showTechnicians, setShowTechnicians] = useState(true);

  // Helper to apply base tile and label overlays
  const applyTileLayer = useCallback((map, layerKey) => {
    const config = MAP_LAYERS[layerKey] || MAP_LAYERS.satellite;

    // Remove previous base tile
    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }
    // Remove previous overlays
    currentOverlayLayersRef.current.forEach(layer => map.removeLayer(layer));
    currentOverlayLayersRef.current = [];

    // Add base tile layer
    const tileLayer = L.tileLayer(config.url, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: config.attribution
    }).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // If layer has overlay label layers (e.g. Satellite Hybrid road and boundary names)
    if (config.overlayUrl) {
      const overlay1 = L.tileLayer(config.overlayUrl, {
        maxZoom: 19,
        pane: 'overlayPane',
        zIndex: 650
      }).addTo(map);
      currentOverlayLayersRef.current.push(overlay1);
    }
    if (config.overlayUrl2) {
      const overlay2 = L.tileLayer(config.overlayUrl2, {
        maxZoom: 19,
        pane: 'overlayPane',
        zIndex: 651
      }).addTo(map);
      currentOverlayLayersRef.current.push(overlay2);
    }
  }, []);

  // Initialize Map Once
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

    // Zoom control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [STO_COORDINATES, applyTileLayer]);

  // Handle Changing Base Tile Layer (Satellite, Street, Dark, Topo)
  const switchBaseLayer = useCallback((layerKey) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    applyTileLayer(map, layerKey);
    setActiveLayerId(layerKey);
    localStorage.setItem('sto_selected_map_layer', layerKey);
    setShowLayerPicker(false);
  }, [applyTileLayer]);

  // Update Markers & Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Kantor Pusat STO Telkom Akses Marker
    const stoIcon = L.divIcon({
      className: 'custom-sto-icon',
      html: `
        <div class="flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
          <div class="px-2.5 py-0.5 rounded-full bg-rose-700 text-white font-extrabold text-[10px] border border-white/40 shadow-xl whitespace-nowrap mb-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            <span>HQ STO TELKOM</span>
          </div>
          <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-800 to-rose-600 border-2 border-white flex items-center justify-center shadow-2xl shadow-rose-900/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [36, 52],
      iconAnchor: [18, 52]
    });

    const stoMarker = L.marker([STO_COORDINATES.lat, STO_COORDINATES.lng], { icon: stoIcon })
      .bindPopup(`
        <div class="p-2 text-xs">
          <div class="font-extrabold text-rose-600 text-sm flex items-center gap-1">
            <span>●</span> ${STO_COORDINATES.name}
          </div>
          <p class="text-slate-500 dark:text-slate-300 mt-1">${STO_COORDINATES.alamat}</p>
          <div class="mt-2 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
            Sentral Telepon Otomatis & Pusat Komando Operasional
          </div>
        </div>
      `);
    layerGroup.addLayer(stoMarker);

    // 2. Active Technician Markers with Live Pulsing Radar Beacon
    if (showTechnicians) {
      trackingGps.forEach(gps => {
        const technician = users.find(u => u.id === gps.teknisi_id);
        const assignedTask = tugas.find(t => t.id === gps.tugas_id && t.status !== 'Done');
        const isWorking = assignedTask && assignedTask.status === 'Progress';
        const isGpsActive = gps.is_active !== false;

        const techIcon = L.divIcon({
          className: 'custom-tech-icon',
          html: `
            <div class="flex flex-col items-center cursor-pointer" style="transform: translate(-50%, -100%);">
              <div class="px-2 py-0.5 rounded-full ${
                isWorking && isGpsActive
                  ? 'bg-rose-950/95 text-rose-300 border border-rose-500 shadow-rose-900/50 ring-2 ring-rose-500/40'
                  : 'bg-slate-900/90 text-sky-300 border border-sky-400'
              } font-bold text-[10px] shadow-lg whitespace-nowrap mb-1 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full ${isWorking && isGpsActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}"></span>
                <span>${technician ? technician.nama_lengkap.split(' ')[0] : 'Teknisi'}</span>
                ${isWorking && isGpsActive ? '<span class="text-[8px] bg-rose-600 text-white px-1 py-0.2 rounded font-black tracking-wider animate-pulse">BEKERJA</span>' : ''}
              </div>
              <div class="${isWorking && isGpsActive ? 'sonar-beacon' : 'radar-pulse'}">
                <div class="w-8 h-8 rounded-full ${
                  isWorking && isGpsActive
                    ? 'bg-gradient-to-tr from-rose-700 to-amber-500 border-2 border-white shadow-xl shadow-rose-600/70'
                    : 'bg-gradient-to-tr from-blue-700 to-sky-500 border-2 border-white shadow-lg shadow-sky-500/50'
                } flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                </div>
              </div>
            </div>
          `,
          iconSize: [32, 48],
          iconAnchor: [16, 48]
        });

        const techMarker = L.marker([gps.latitude, gps.longitude], { icon: techIcon })
          .bindPopup(`
            <div class="p-2.5 min-w-[230px] text-xs">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span class="font-extrabold text-blue-500">${technician?.nama_lengkap || 'Teknisi Lapangan'}</span>
                <span class="text-[9px] font-bold ${
                  isWorking && isGpsActive
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                } px-2 py-0.5 rounded-full">
                  ${isWorking && isGpsActive ? '● SEDANG BEKERJA' : 'ONLINE'}
                </span>
              </div>
              <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                <div><strong>Status Lapangan:</strong> ${gps.kecepatan}</div>
                <div><strong>Akurasi GPS:</strong> ${gps.akurasi}</div>
                <div><strong>Baterai HP:</strong> ${gps.baterai}%</div>
                <div><strong>Update Real-Time:</strong> ${gps.waktu_update}</div>
                ${assignedTask ? `
                  <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span class="text-[10px] text-slate-400">Pekerjaan Sedang Ditangani:</span>
                    <div class="font-bold text-rose-500">#${assignedTask.id} - ${assignedTask.jenis_kerja}</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${assignedTask.lokasi}</div>
                  </div>
                ` : '<div class="text-[10px] text-slate-400 mt-1 italic">Standby di Wilayah Payakumbuh</div>'}
              </div>
            </div>
          `);

        layerGroup.addLayer(techMarker);

        // 3. Connect Route line if active task exists
        if (showRoutes && assignedTask && assignedTask.target_lat && assignedTask.target_lng) {
          const polyline = L.polyline(
            [
              [gps.latitude, gps.longitude],
              [assignedTask.target_lat, assignedTask.target_lng]
            ],
            {
              color: isWorking && isGpsActive ? '#e11d48' : '#be123c',
              weight: 3.5,
              dashArray: '6, 8',
              opacity: 0.9
            }
          );
          layerGroup.addLayer(polyline);
        }
      });
    }

    // 4. Task Location Markers
    if (showTasks) {
      tugas.forEach(task => {
        if (!task.target_lat || !task.target_lng) return;

        let badgeBg = 'bg-amber-500';
        let badgeBorder = 'border-amber-300';
        if (task.jenis_kerja === 'Pasang Baru') {
          badgeBg = 'bg-blue-600';
          badgeBorder = 'border-blue-400';
        } else if (task.jenis_kerja === 'Gangguan') {
          badgeBg = 'bg-rose-600';
          badgeBorder = 'border-rose-400';
        } else if (task.jenis_kerja === 'ODP') {
          badgeBg = 'bg-purple-600';
          badgeBorder = 'border-purple-400';
        }

        const isDone = task.status === 'Done';
        const isSelected = selectedTugasId === task.id;

        const taskIcon = L.divIcon({
          className: 'custom-task-icon',
          html: `
            <div class="flex flex-col items-center cursor-pointer ${isSelected ? 'scale-125 z-50' : ''}" style="transform: translate(-50%, -100%);">
              <div class="px-2 py-0.5 rounded-full ${isDone ? 'bg-slate-700 text-slate-200' : `${badgeBg} text-white`} font-bold text-[10px] border ${badgeBorder} shadow-lg whitespace-nowrap mb-1">
                #${task.id} ${task.jenis_kerja}
              </div>
              <div class="w-7 h-7 rounded-xl ${isDone ? 'bg-emerald-600' : badgeBg} border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
                ${isDone ? '✓' : '!'}
              </div>
            </div>
          `,
          iconSize: [28, 44],
          iconAnchor: [14, 44]
        });

        const assignedTech = users.find(u => u.id === task.teknisi_id);

        const taskMarker = L.marker([task.target_lat, task.target_lng], { icon: taskIcon })
          .on('click', () => onSelectTugas(task.id))
          .bindPopup(`
            <div class="p-2 text-xs min-w-[220px]">
              <div class="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                <span class="font-extrabold">Tiket #${task.id}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  task.status === 'Done' ? 'bg-emerald-500/20 text-emerald-500' :
                  task.status === 'Progress' ? 'bg-blue-500/20 text-blue-500' :
                  'bg-amber-500/20 text-amber-500'
                }">${task.status}</span>
              </div>
              <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                <div><strong>Jenis:</strong> ${task.jenis_kerja}</div>
                <div><strong>Pelanggan:</strong> ${task.pelanggan_nama}</div>
                <div><strong>Alamat:</strong> ${task.lokasi}</div>
                <div><strong>Teknisi:</strong> ${assignedTech?.nama_lengkap || '-'}</div>
                <div class="text-[10px] text-slate-400 mt-1 italic">${task.keterangan}</div>
              </div>
            </div>
          `);

        layerGroup.addLayer(taskMarker);
      });
    }
  }, [trackingGps, tugas, users, STO_COORDINATES, showRoutes, showTasks, showTechnicians, selectedTugasId, onSelectTugas]);

  // Map Controls Helpers
  const resetToCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([STO_COORDINATES.lat, STO_COORDINATES.lng], 14, { duration: 1.2 });
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
      
      {/* Map DOM Element */}
      <div ref={mapRef} className="w-full h-full min-h-[480px] z-0" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl">
          <button
            onClick={resetToCenter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Pusatkan Peta ke HQ STO"
          >
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            <span>HQ STO</span>
          </button>
          <button
            onClick={fitAllMarkers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tampilkan Semua Titik & Armada"
          >
            <LocateFixed className="w-3.5 h-3.5 text-blue-500" />
            <span>Semua Titik</span>
          </button>
        </div>

        {/* Toggle Overlays */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-2 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 shadow-2xl">
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
            <span>Titik Tugas</span>
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

      {/* Google Maps-style Floating Layer Switcher (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="relative">
          {/* Main Switcher Thumbnail Card */}
          <button
            onClick={() => setShowLayerPicker(!showLayerPicker)}
            className="group flex items-center gap-2.5 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl hover:border-rose-500 transition-all cursor-pointer"
            title="Ganti Jenis Peta (Satelit, Street, Dark, Topo)"
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

          {/* Expanded Layer Selection Menu */}
          {showLayerPicker && (
            <div className="absolute bottom-16 left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl p-3 shadow-2xl w-64 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                Pilih Tampilan Peta (Leaflet GIS):
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

      {/* Real-Time Telemetry Status Pill (Bottom Right Overlay) */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              WebGIS Live Telemetri
            </div>
            <div className="text-xs font-black text-slate-800 dark:text-white leading-tight mt-0.5">
              STO Payakumbuh (Koto Nan IV)
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
