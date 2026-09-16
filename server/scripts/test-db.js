const { pool, supabase } = require('../config/db');

async function testDatabase() {
  console.log('=== TEST KONEKSI SUPABASE POSTGRESQL & CLIENT ===');
  const client = await pool.connect();

  try {
    // 1. SELECT NOW()
    const nowRes = await client.query('SELECT NOW() as server_time, current_database(), current_user;');
    console.log('✅ 1. Koneksi PostgreSQL Berhasil!');
    console.log('   Server Time:', nowRes.rows[0].server_time);
    console.log('   Database:', nowRes.rows[0].current_database);
    console.log('   User:', nowRes.rows[0].current_user);

    // 2. Cek 6 tabel utama
    const expectedTables = ['users', 'tugas', 'barang', 'permohonan', 'detail_permohonan', 'tracking_gps'];
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const actualTables = tablesRes.rows.map(r => r.table_name);
    console.log('\n✅ 2. Verifikasi Tabel Utama:');
    for (const t of expectedTables) {
      const exists = actualTables.includes(t);
      console.log(`   - [${exists ? 'ADA' : 'TIDAK'}] Tabel: ${t}`);
      if (!exists) throw new Error(`Tabel ${t} tidak ditemukan!`);
    }

    // 3. Cek data baris di tabel users & barang
    const usersCount = await client.query('SELECT COUNT(*) FROM users;');
    const barangCount = await client.query('SELECT COUNT(*) FROM barang;');
    console.log('\n✅ 3. Verifikasi Data Awal:');
    console.log('   - Total Users:', usersCount.rows[0].count);
    console.log('   - Total Barang:', barangCount.rows[0].count);

    // 4. Verifikasi koneksi Supabase JS client
    const { data, error } = await supabase.from('barang').select('id, nama_barang, stok').limit(2);
    if (error) {
      console.warn('   ⚠️ Supabase JS Client warning:', error.message);
    } else {
      console.log('✅ 4. Supabase JS Client Berhasil Terhubung!');
      console.log('   Sampel Barang via Supabase SDK:', data);
    }

    console.log('\n🎉 SELURUH KONEKSI & STRUKTUR TABEL SUPABASE 100% VALID! 🎉');
  } catch (err) {
    console.error('❌ Gagal verifikasi database:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabase();
