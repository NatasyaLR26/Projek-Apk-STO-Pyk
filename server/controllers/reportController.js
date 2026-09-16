const { pool } = require('../config/db');

// Laporan Audit: Data rekapitulasi tugas selesai, material terpakai, dan foto bukti
const getAuditReport = async (req, res) => {
  try {
    const reportQuery = `
      SELECT 
        t.id AS tugas_id,
        t.jenis_kerja,
        t.lokasi,
        t.status,
        t.foto_bukti,
        u_pim.nama_lengkap AS nama_pimpinan,
        u_tek.nama_lengkap AS nama_teknisi,
        u_tek.email AS email_teknisi,
        (
          SELECT tg.waktu_update 
          FROM tracking_gps tg 
          WHERE tg.tugas_id = t.id 
          ORDER BY tg.id DESC 
          LIMIT 1
        ) AS waktu_terakhir,
        (
          SELECT json_agg(
            json_build_object(
              'permohonan_id', p.id,
              'waktu_request', p.waktu_request,
              'status', p.status,
              'items', (
                SELECT json_agg(
                  json_build_object(
                    'nama_barang', b.nama_barang,
                    'jumlah', dp.jumlah_minta,
                    'satuan', b.satuan
                  )
                )
                FROM detail_permohonan dp
                JOIN barang b ON b.id = dp.barang_id
                WHERE dp.permohonan_id = p.id
              )
            )
          )
          FROM permohonan p
          WHERE p.tugas_id = t.id AND p.status = 'Released'
        ) AS material_terpakai
      FROM tugas t
      LEFT JOIN users u_pim ON u_pim.id = t.pimpinan_id
      LEFT JOIN users u_tek ON u_tek.id = t.teknisi_id
      WHERE t.status = 'Done'
      ORDER BY t.id DESC
    `;

    const summaryQuery = `
      SELECT 
        COUNT(t.id) AS total_tugas_selesai,
        (
          SELECT COUNT(DISTINCT t2.teknisi_id) 
          FROM tugas t2 
          WHERE t2.status = 'Done'
        ) AS total_teknisi_terlibat,
        (
          SELECT COALESCE(SUM(dp.jumlah_minta), 0)
          FROM permohonan p
          JOIN detail_permohonan dp ON dp.permohonan_id = p.id
          JOIN tugas t3 ON t3.id = p.tugas_id
          WHERE t3.status = 'Done' AND p.status = 'Released'
        ) AS total_material_keluar
      FROM tugas t
      WHERE t.status = 'Done';
    `;

    const [reportResult, summaryResult] = await Promise.all([
      pool.query(reportQuery),
      pool.query(summaryQuery)
    ]);

    return res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        records: reportResult.rows
      }
    });
  } catch (err) {
    console.error('Error fetching audit report:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghasilkan laporan audit.' });
  }
};

module.exports = {
  getAuditReport
};
