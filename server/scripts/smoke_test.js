const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`[${response.status}] ${json.message || response.statusText}`);
  }
  return json;
}

async function runSmokeTest() {
  console.log('--- STARTING SERVER API SMOKE TEST ---');

  // 1. Healthcheck
  const health = await request('/api/health');
  console.log('1. Healthcheck:', health.status);

  // 2. Login Pimpinan
  const loginPim = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@sto.telkom.co.id', password: 'admin123' }
  });
  const tokenPim = loginPim.token;
  console.log('2. Login Pimpinan: OK, token received, user:', loginPim.user.nama_lengkap);

  // 3. Login Teknisi
  const loginTek = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'ari@sto.telkom.co.id', password: 'teknisi123' }
  });
  const tokenTek = loginTek.token;
  const teknisiId = loginTek.user.id;
  console.log('3. Login Teknisi: OK, user:', loginTek.user.nama_lengkap, 'ID:', teknisiId);

  // 4. Login Gudang
  const loginGud = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'gudang@sto.telkom.co.id', password: 'gudang123' }
  });
  const tokenGud = loginGud.token;
  console.log('4. Login Gudang: OK, user:', loginGud.user.nama_lengkap);

  // 5. Cek Stok Awal Barang
  const barangAwal = await request('/api/barang', {
    headers: { Authorization: `Bearer ${tokenPim}` }
  });
  console.log('5. Stok barang awal:', barangAwal.data.map(b => `${b.nama_barang}: ${b.stok} ${b.satuan}`).join(', '));
  const targetBarang = barangAwal.data.find(b => b.nama_barang.includes('Dropcore')) || barangAwal.data[0];
  const targetBarang2 = barangAwal.data.find(b => b.nama_barang.includes('Modem')) || barangAwal.data[1];

  // 6. Pimpinan membuat tiket tugas
  const buatTugas = await request('/api/tugas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenPim}` },
    body: {
      teknisi_id: Number(teknisiId),
      jenis_kerja: 'Pasang Baru',
      lokasi: 'Jl. Sudirman No. 45, Payakumbuh'
    }
  });
  const tugasId = buatTugas.data.id;
  console.log('6. Pimpinan buat tugas: OK, Tugas ID:', tugasId);

  // 7. Teknisi mengajukan permohonan material
  const mintaQty = 2;
  const buatPermohonan = await request('/api/permohonan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenTek}` },
    body: {
      tugas_id: Number(tugasId),
      items: [
        { barang_id: Number(targetBarang.id), jumlah_minta: mintaQty },
        { barang_id: Number(targetBarang2.id), jumlah_minta: 1 }
      ]
    }
  });
  const permohonanId = buatPermohonan.data.id;
  console.log('7. Teknisi ajukan permohonan material: OK, Permohonan ID:', permohonanId);

  // 8. Pimpinan approve permohonan
  const approveRes = await request(`/api/permohonan/${permohonanId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenPim}` }
  });
  console.log('8. Pimpinan approve permohonan: OK, Status:', approveRes.data.status);

  // 9. Gudang release permohonan & potong stok (ACID transaction)
  const releaseRes = await request(`/api/permohonan/${permohonanId}/release`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenGud}` }
  });
  console.log('9. Gudang release & potong stok (ACID):', releaseRes.message);

  // Verifikasi stok terpotong
  const barangAkhir = await request('/api/barang', {
    headers: { Authorization: `Bearer ${tokenGud}` }
  });
  const updatedBarang = barangAkhir.data.find(b => b.id === targetBarang.id);
  console.log(`   Verifikasi stok '${targetBarang.nama_barang}': Dari ${targetBarang.stok} -> ${updatedBarang.stok} (Terpotong ${mintaQty})`);
  if (targetBarang.stok - updatedBarang.stok !== mintaQty) {
    throw new Error('Pemotongan stok tidak sesuai!');
  }

  // 10. Teknisi kirim koordinat GPS WebGIS
  const gpsRes = await request('/api/tracking/update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenTek}` },
    body: {
      tugas_id: Number(tugasId),
      latitude: -0.2289,
      longitude: 100.6308
    }
  });
  console.log('10. Teknisi update GPS WebGIS:', gpsRes.message, 'Coord:', gpsRes.data.latitude, gpsRes.data.longitude);

  // 11. Pimpinan cek semua marker aktif WebGIS
  const allTracking = await request('/api/tracking/active/all', {
    headers: { Authorization: `Bearer ${tokenPim}` }
  });
  console.log('11. Pimpinan ambil active WebGIS tracking: OK, Total unit aktif:', allTracking.data.length);

  // 12. Teknisi selesaikan tugas dengan upload foto bukti
  const selesaiRes = await request(`/api/tugas/${tugasId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenTek}` },
    body: {
      status: 'Done',
      foto_bukti: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=60'
    }
  });
  console.log('12. Teknisi selesaikan tugas & kirim foto bukti: OK, Status:', selesaiRes.data.status);

  // 13. Pimpinan cek Laporan Audit
  const auditReport = await request('/api/reports/audit', {
    headers: { Authorization: `Bearer ${tokenPim}` }
  });
  console.log('13. Laporan Audit: OK, Summary:', auditReport.data.summary);
  console.log('    Total records:', auditReport.data.records.length);

  console.log('\n🌟 ALL SERVER TESTS PASSED 100% SUCCESSFULLY! 🌟');
}

runSmokeTest()
  .then(() => {
    console.log('Smoke test completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('SMOKE TEST FAILED:', err);
    process.exit(1);
  });
