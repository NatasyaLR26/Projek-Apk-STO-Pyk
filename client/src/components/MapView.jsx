import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet icon paths so they never break in bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Technician Live Marker with Telkom Red pulse animation
export const createTechnicianIcon = (name = 'Teknisi') => {
  return L.divIcon({
    className: 'technician-marker-container',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: rgba(15, 23, 42, 0.9); color: #fff; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; border: 1px solid #ef4444; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.4);">
          ${name} (Live)
        </div>
        <div class="custom-marker-pulse" style="width: 32px; height: 32px; background: #ED1C24; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(237, 28, 36, 0.6);">
          <svg style="width: 18px; height: 18px; fill: white;" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ED1C24;"></div>
      </div>
    `,
    iconSize: [32, 54],
    iconAnchor: [16, 54],
    popupAnchor: [0, -50]
  });
};


// Custom STO Payakumbuh Base Office Icon
export const createStoOfficeIcon = () => {
  return L.divIcon({
    className: 'sto-office-container',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #ED1C24; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-bottom: 3px; border: 1px solid white;">
          STO PAYAKUMBUH
        </div>
        <div style="width: 32px; height: 32px; background: #0f172a; border: 2px solid #ED1C24; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.7);">
          <svg style="width: 18px; height: 18px; fill: #ED1C24;" viewBox="0 0 24 24">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 50],
    iconAnchor: [16, 50],
    popupAnchor: [0, -45]
  });
};

// Helper component to auto-pan when selected target updates
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    try {
      if (center && !isNaN(center[0]) && !isNaN(center[1])) {
        map.flyTo(center, zoom || 14, { duration: 1.2 });
      }
    } catch (e) {
      console.warn('Leaflet map navigation skipped:', e.message);
    }
  }, [center, zoom, map]);
  return null;
}

const STO_PYK_COORDS = [-0.2289, 100.6308]; // Koordinat STO Telkom Payakumbuh

const MapView = ({
  trackingData = [],
  selectedTracking = null,
  height = '500px',
  center = STO_PYK_COORDS,
  zoom = 13
}) => {
  const selLat = Number(selectedTracking?.latitude);
  const selLng = Number(selectedTracking?.longitude);
  const hasValidSelected = !isNaN(selLat) && !isNaN(selLng) && (selLat !== 0 || selLng !== 0);

  const effectiveCenter = hasValidSelected
    ? [selLat, selLng]
    : (center && !isNaN(center[0]) ? center : STO_PYK_COORDS);

  return (
    <div style={{ height, width: '100%', position: 'relative' }} className="rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={effectiveCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#020617' }}
        scrollWheelZoom={true}
      >
        {/* Modern Dark Matter Tile Layer for sleek dark mode GIS */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapUpdater center={effectiveCenter} zoom={zoom} />

        {/* STO Central Office Marker */}
        <Marker position={STO_PYK_COORDS} icon={createStoOfficeIcon()}>
          <Popup>
            <div className="p-1 text-slate-100">
              <h4 className="font-bold text-red-500 text-sm">Kantor STO Telkom Payakumbuh</h4>
              <p className="text-xs text-slate-300 mt-1">Pusat Operasional Lapangan & Inventaris Gudang</p>
              <p className="text-xs text-slate-400 mt-0.5">Payakumbuh, Sumatera Barat</p>
            </div>
          </Popup>
        </Marker>

        {/* Dynamic Technician Markers */}
        {trackingData.map((item) => {
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);
          if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
          const pos = [lat, lng];

          return (
            <Marker
              key={item.tugas_id || `${item.latitude}-${item.longitude}`}
              position={pos}
              icon={createTechnicianIcon(item.nama_teknisi || 'Teknisi')}
            >
              <Popup>
                <div className="p-2 min-w-[200px] text-slate-100">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                    <span className="font-bold text-red-400 text-sm">{item.nama_teknisi || 'Teknisi'}</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {item.status_tugas || 'Aktif'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300">
                    <p><strong className="text-slate-400">Pekerjaan:</strong> {item.jenis_kerja || '-'}</p>
                    <p><strong className="text-slate-400">Lokasi:</strong> {item.lokasi || '-'}</p>
                    <p><strong className="text-slate-400">Koordinat:</strong> {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}</p>
                    <p><strong className="text-slate-400">Update:</strong> {item.waktu_update ? new Date(item.waktu_update).toLocaleTimeString('id-ID') : 'Baru saja'}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
