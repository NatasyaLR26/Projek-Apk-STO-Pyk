import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/axiosInstance';

// perbaikan icon default Leaflet yang sering rusak di React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// koordinat default: area Payakumbuh
const DEFAULT_CENTER = [-0.2283, 100.3737];

function WebGISTracking() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackingData = async () => {
    try {
      const resTugas = await api.get('/tugas/aktif');
      const tugasList = resTugas.data.tugas;

      const markersData = await Promise.all(
        tugasList.map(async (tugas) => {
          try {
            const resTracking = await api.get(`/tracking/${tugas.id}`);
            const t = resTracking.data.tracking;
            return {
              tugasId: tugas.id,
              namaTeknisi: tugas.teknisi?.nama_lengkap || 'Tidak diketahui',
              jenisKerja: tugas.jenis_kerja,
              lokasi: tugas.lokasi,
              status: tugas.status,
              lat: t.latitude,
              lng: t.longitude,
            };
          } catch {
            return null; // belum ada data tracking untuk tugas ini
          }
        })
      );

      setMarkers(markersData.filter((m) => m !== null));
    } catch (err) {
      console.error('Gagal mengambil data tracking', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    // auto-refresh tiap 10 detik biar posisi ter-update
    const interval = setInterval(fetchTrackingData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Live Tracking Teknisi</h1>

      {loading ? (
        <p className="text-gray-400">Memuat peta...</p>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ height: '500px' }}>
          <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {markers.map((m) => (
              <Marker key={m.tugasId} position={[m.lat, m.lng]}>
                <Popup>
                  <b>{m.namaTeknisi}</b>
                  <br />
                  {m.jenisKerja} — {m.lokasi}
                  <br />
                  Status: {m.status}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {!loading && markers.length === 0 && (
        <p className="text-gray-400 mt-3">Belum ada teknisi yang sedang tracking lokasi.</p>
      )}
    </div>
  );
}

export default WebGISTracking;