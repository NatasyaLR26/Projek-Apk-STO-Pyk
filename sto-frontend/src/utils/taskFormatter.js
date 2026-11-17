/**
 * ============================================================================
 * UTILITY: taskFormatter.js
 * Helper Parser & Formatter Pembersih String Clutter Pelanggan, Alamat, & Tanggal
 * ============================================================================
 */

export const parseTaskDetails = (item) => {
  if (!item) {
    return { name: 'Pelanggan STO', telp: null, address: 'Payakumbuh', note: null };
  }

  let rawName = (item.pelanggan_nama || '').trim();
  let rawTelp = (item.pelanggan_telp || item.telepon || '').trim();
  let rawLoc = (item.lokasi || item.alamat || '').trim();
  let rawNotes = (item.keterangan || item.catatan || '').trim();

  // Regex fleksibel nomor telepon (6 s/d 16 digit dengan awalan 08, +62, atau 0)
  const phonePattern = /(?:\+?62|08|0)[0-9\-\s]{6,16}/g;

  // 1. Ekstraksi no telepon jika rawTelp kosong
  if (!rawTelp) {
    const matchName = rawName.match(phonePattern);
    const matchLoc = rawLoc.match(phonePattern);
    const matchNotes = rawNotes.match(phonePattern);
    if (matchName) rawTelp = matchName[0].trim();
    else if (matchLoc) rawTelp = matchLoc[0].trim();
    else if (matchNotes) rawTelp = matchNotes[0].trim();
  }

  // 2. Ekstraksi catatan dari kurung siku [catatan] atau pola "| Catatan: ..."
  let extractedNote = '';
  const bracketNoteMatch = rawLoc.match(/\[(.*?)\]/);
  if (bracketNoteMatch) {
    extractedNote = bracketNoteMatch[1].trim();
    rawLoc = rawLoc.replace(/\[(.*?)\]/g, '').trim();
  }
  const pipeNoteMatch = rawLoc.match(/\|\s*Catatan:\s*([^|]+)/i);
  if (pipeNoteMatch) {
    extractedNote = pipeNoteMatch[1].trim();
    rawLoc = rawLoc.replace(/\|\s*Catatan:\s*[^|]+/gi, '').trim();
  }

  // 3. Ekstraksi nama pelanggan dari pola "Pelanggan:\s*([^|]+)"
  const pipePelangganMatch = rawLoc.match(/Pelanggan:\s*([^|•]+)/i);
  if (pipePelangganMatch) {
    if (!rawName || rawName.toLowerCase() === 'pelanggan' || rawName.toLowerCase() === 'pelanggan telkom' || rawName.toLowerCase() === 'pelanggan sto') {
      rawName = pipePelangganMatch[1].trim();
    }
    rawLoc = rawLoc.replace(/Pelanggan:\s*[^|•]+/gi, '').trim();
  }

  // 4. Ekstraksi telepon dari pola "Telp:\s*([^|]+)"
  const pipeTelpMatch = rawLoc.match(/Telp:\s*([^|•]+)/i);
  if (pipeTelpMatch) {
    if (!rawTelp) {
      rawTelp = pipeTelpMatch[1].trim();
    }
    rawLoc = rawLoc.replace(/Telp:\s*[^|•]+/gi, '').trim();
  }

  // 5. Bersihkan nomor telepon
  const digitsOnly = (rawTelp || '').replace(/[^0-9]/g, '');
  const cleanTelp = digitsOnly.length >= 7 ? rawTelp.replace(/[()—_]/g, '').replace(/\s+/g, ' ').trim() : null;

  // 6. Bersihkan nama dari format no HP, angka panjang, kurung kosong, dan simbol artefak
  let name = rawName
    .replace(phonePattern, '')
    .replace(/[0-9]{6,}/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/[|•()—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Jika ada nomor telepon yang bersih, pastikan digitnya tidak tertinggal di dalam string nama
  if (cleanTelp) {
    const rawDigits = cleanTelp.replace(/[^0-9]/g, '');
    if (rawDigits.length >= 7) {
      name = name.replace(new RegExp(rawDigits, 'g'), '').trim();
    }
  }

  // Jika nama masih default/kosong, cek apakah bagian awal lokasi sebelum '-' adalah nama
  if (!name || name.toLowerCase() === 'pelanggan' || name.toLowerCase() === 'pelanggan telkom' || name.toLowerCase() === 'pelanggan sto') {
    if (rawLoc.includes(' - ')) {
      const parts = rawLoc.split(' - ');
      const possibleName = parts[0]
        .replace(phonePattern, '')
        .replace(/[0-9]{6,}/g, '')
        .replace(/[•()—]/g, '')
        .trim();
      if (
        possibleName &&
        !possibleName.toLowerCase().startsWith('jl') &&
        !possibleName.toLowerCase().startsWith('jalan') &&
        !possibleName.toLowerCase().startsWith('kel') &&
        !possibleName.toLowerCase().startsWith('kec') &&
        possibleName.length < 35
      ) {
        name = possibleName;
        rawLoc = parts.slice(1).join(' - ');
      }
    }
  }
  if (!name) name = 'Pelanggan STO';

  // 7. Bersihkan lokasi dari nomor telepon, nama pelanggan yang berulang, dan artefak
  let loc = rawLoc
    .replace(phonePattern, '')
    .replace(/[0-9]{6,}/g, '');

  if (name && name.toLowerCase() !== 'pelanggan' && name.toLowerCase() !== 'pelanggan sto' && name.toLowerCase() !== 'pelanggan telkom') {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    loc = loc.replace(new RegExp(escapedName, 'gi'), ' ');
  }

  loc = loc
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/[|•()—]/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/^[-:,\s|•]+|[-:,\s|•]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 8. Normalisasi catatan
  let note = rawNotes;
  if (extractedNote && !note.toLowerCase().includes(extractedNote.toLowerCase())) {
    note = note ? `${note} (${extractedNote})` : extractedNote;
  }
  if (note && (note.toLowerCase() === loc.toLowerCase() || note.toLowerCase() === name.toLowerCase())) {
    note = '';
  }

  return {
    name,
    telp: cleanTelp,
    address: loc && loc !== '-' ? loc : 'Koto Nan IV Payakumbuh',
    note: note || null
  };
};

/**
 * Format tanggal pembuatan tiket secara konsisten dan rapi
 * Contoh hasil: "18 Nov 2026, 14:30 WIB"
 */
export const formatWaktuBuat = (item) => {
  const rawDate = item?.created_at || item?.waktu_request || item?.tanggal || item?.waktu_buat;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${mins} WIB`;
      }
      return String(rawDate);
    } catch {
      return String(rawDate);
    }
  }

  // Fallback ke waktu hari ini jika null
  const now = new Date();
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
};
