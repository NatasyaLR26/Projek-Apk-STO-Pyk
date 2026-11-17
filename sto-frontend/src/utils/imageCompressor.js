/**
 * ============================================================================
 * UTILITY: imageCompressor.js (Standar Telkom Akses Lapangan)
 * ============================================================================
 * Kompresi gambar client-side performa tinggi menggunakan HTML Canvas:
 * 1. Menjaga rasio aspek (aspect ratio) gambar dengan batas maksimal 1280px.
 * 2. Mengonversi ke format 'image/jpeg' dengan kualitas kompresi 0.75 - 0.8.
 * 3. Memangkas ukuran foto kamera resolusi tinggi (~4-12 MB) menjadi ~200-400 KB.
 * 4. Mencegah lag memori browser, quota exceeded LocalStorage, dan beban bandwidth.
 * ============================================================================
 */

export async function compressImage(file, maxDimension = 1280, quality = 0.8) {
  if (!file) return null;

  // Jika input sudah berupa string URL atau Data URL lama, kembalikan langsung
  if (typeof file === 'string') {
    return {
      dataUrl: file,
      originalSize: 0,
      compressedSize: Math.round((file.length * 3) / 4),
      savedPercent: 0,
      width: 0,
      height: 0
    };
  }

  // Pastikan tipe MIME adalah gambar
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan merupakan format gambar yang valid');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Gagal membaca file gambar dari perangkat'));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Gagal mendekode gambar ke memori browser'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung scaling rasio aspek proporsional
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context tidak didukung di browser ini'));
        }

        // Terapkan image smoothing untuk hasil foto yang tetap tajam dan jelas untuk BASTP
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke format JPEG dengan kualitas 0.8
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        const originalSize = file.size || 0;
        const compressedSize = Math.round((dataUrl.length * 3) / 4);
        const savedPercent = originalSize > 0
          ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
          : 0;

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          savedPercent,
          width,
          height
        });
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format ukuran byte ke string terbaca (KB / MB)
 */
export function formatFileSize(bytes = 0) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
