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

  let rawName = String(item.pelanggan_nama || '').trim();
  let rawTelp = String(item.pelanggan_telp || item.telepon || '').trim();
  let rawLoc = String(item.lokasi || item.alamat || '').trim();
  let rawNotes = String(item.keterangan || item.catatan || '').trim();
  let extractedNote = '';

  // 1. Ekstraksi Catatan Terlebih Dahulu
  const bracketMatch = (rawLoc + ' ' + rawName).match(/\[(.*?)\]/);
  if (bracketMatch) {
    extractedNote = bracketMatch[1].trim();
    rawLoc = rawLoc.replace(/\[(.*?)\]/g, ' ').trim();
    rawName = rawName.replace(/\[(.*?)\]/g, ' ').trim();
  }

  const notePattern = /(?:Catatan|Ket|Keterangan)\s*:\s*([^|•\n()\[\]]+)/i;
  const matchNoteLoc = rawLoc.match(notePattern);
  const matchNoteName = rawName.match(notePattern);
  if (matchNoteLoc) {
    if (!extractedNote) extractedNote = matchNoteLoc[1].trim();
    rawLoc = rawLoc.replace(/(?:Catatan|Ket|Keterangan)\s*:\s*[^|•\n()\[\]]+/gi, ' ').trim();
  }
  if (matchNoteName) {
    if (!extractedNote) extractedNote = matchNoteName[1].trim();
    rawName = rawName.replace(/(?:Catatan|Ket|Keterangan)\s*:\s*[^|•\n()\[\]]+/gi, ' ').trim();
  }

  // 2. Ekstraksi dari blok tanda kurung lengkap: (Pelanggan: ... | Telp: ...)
  const parenBlockMatch = rawLoc.match(/\(([^)]*(?:pelanggan|telp|hp)[^)]*)\)/i);
  if (parenBlockMatch) {
    const inside = parenBlockMatch[1];
    const pM = inside.match(/pelanggan\s*:\s*([^|•]+)/i);
    if (pM) rawName = pM[1].trim();
    const tM = inside.match(/(?:telp|hp|telepon)\s*:\s*([^|•]+)/i);
    if (tM && !rawTelp) rawTelp = tM[1].trim();
    rawLoc = rawLoc.replace(parenBlockMatch[0], ' ').trim();
  }

  // 3. Ekstraksi Nomor Telepon dan Pelanggan dari rawLoc & rawName
  const pelPattern = /Pelanggan\s*:\s*(.*?)(?=\s*(?:\||•|Telp:|Catatan:|Ket:|Hp:|No\.?\s*Hp:|Alamat:|\(|$))/i;
  const telPattern = /(?:Telp|Hp|Telepon|No\.?\s*Hp)\s*:\s*(.*?)(?=\s*(?:\||•|Catatan:|Ket:|Pelanggan:|Alamat:|\(|$))/i;

  // Ekstrak telepon dari rawLoc & rawName sebelum nama dioverwrite
  const matchTelLoc = rawLoc.match(telPattern);
  if (matchTelLoc && matchTelLoc[1].trim() && !rawTelp) {
    rawTelp = matchTelLoc[1].trim();
    rawLoc = rawLoc.replace(telPattern, ' ').trim();
  }

  const matchTelName = rawName.match(telPattern);
  if (matchTelName && matchTelName[1].trim() && !rawTelp) {
    rawTelp = matchTelName[1].trim();
    rawName = rawName.replace(telPattern, ' ').trim();
  }

  // Ekstrak nama pelanggan dari rawLoc
  const matchPelLoc = rawLoc.match(pelPattern);
  if (matchPelLoc && matchPelLoc[1].trim()) {
    if (!rawName || rawName.toLowerCase().includes('pelanggan')) {
      rawName = matchPelLoc[1].trim();
    }
    rawLoc = rawLoc.replace(pelPattern, ' ').trim();
  }

  // Ekstrak nama pelanggan dari rawName
  const matchPelName = rawName.match(pelPattern);
  if (matchPelName && matchPelName[1].trim()) {
    const prefix = rawName.substring(0, rawName.indexOf(matchPelName[0])).trim();
    if (prefix && (prefix.toLowerCase().startsWith('jl') || prefix.toLowerCase().startsWith('jalan') || !rawLoc || rawLoc.toLowerCase() === 'payakumbuh')) {
      rawLoc = prefix + (rawLoc && rawLoc !== 'Payakumbuh' ? `, ${rawLoc}` : '');
    }
    rawName = matchPelName[1].trim();
  }

  // 4. Deteksi format " - " di rawLoc (contoh: "siti rahma (0888081280) - Jl. Soekarno Hatta...")
  if (rawLoc.includes(' - ')) {
    const parts = rawLoc.split(' - ');
    const candidateName = parts[0].trim();
    const restLoc = parts.slice(1).join(' - ').trim();

    if (
      (!rawName || rawName.toLowerCase().includes('pelanggan')) &&
      !candidateName.toLowerCase().startsWith('jl') &&
      !candidateName.toLowerCase().startsWith('jalan') &&
      !candidateName.toLowerCase().startsWith('kel') &&
      !candidateName.toLowerCase().startsWith('kec') &&
      candidateName.length < 50
    ) {
      const parenPhoneMatch = candidateName.match(/\(([^)]+)\)/);
      if (parenPhoneMatch) {
        if (!rawTelp) rawTelp = parenPhoneMatch[1].trim();
        rawName = candidateName.replace(/\([^)]+\)/g, '').trim();
      } else {
        rawName = candidateName;
      }
      rawLoc = restLoc;
    }
  }

  // 5. Ekstraksi pemisah bullet "•" atau pipe "|" di rawName (contoh: "dea • 3422342" atau "Raka • 081212121")
  if (rawName.includes('•') || rawName.includes('|')) {
    const parts = rawName.split(/[•|]/);
    const candidateName = parts[0].trim();
    const candidateTelp = parts.slice(1).join(' ').trim();
    if (candidateName) rawName = candidateName;
    if (candidateTelp && !rawTelp) rawTelp = candidateTelp;
  }

  // 6. Ekstraksi nomor telepon jika masih belum ada
  const phonePattern = /(?:\+?62|08|0)[0-9\-\s]{6,16}/;
  if (!rawTelp) {
    const mName = rawName.match(phonePattern);
    const mLoc = rawLoc.match(phonePattern);
    const mNotes = rawNotes.match(phonePattern);
    if (mName) {
      rawTelp = mName[0].trim();
      rawName = rawName.replace(mName[0], '').trim();
    } else if (mLoc) {
      rawTelp = mLoc[0].trim();
      rawLoc = rawLoc.replace(mLoc[0], '').trim();
    } else if (mNotes) {
      rawTelp = mNotes[0].trim();
    }
  }

  // Sanitasi Nomor Telepon
  let cleanTelp = null;
  if (rawTelp) {
    const digitsOnly = rawTelp.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 6) {
      cleanTelp = rawTelp.replace(/[()—_]/g, '').replace(/\s+/g, ' ').trim();
    }
  }

  // 7. Sanitasi NAMA PELANGGAN (Strict)
  let name = rawName
    .replace(/(?:Pelanggan|Telp|Telepon|Hp|Catatan|Ket|Keterangan)\s*:/gi, '')
    .replace(/(?:\+?62|08|0)[0-9\-\s]{6,16}/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/[|•()—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanTelp) {
    const rawDigits = cleanTelp.replace(/[^0-9]/g, '');
    if (rawDigits.length >= 6) {
      name = name.replace(new RegExp(rawDigits, 'g'), '').trim();
    }
  }

  if (cleanTelp) {
    name = name.replace(/\b[0-9]{5,}\b/g, '').trim();
  }

  const roadKeywords = ['jl.', 'jalan', 'gang', 'komplek', 'lorong', 'kel.', 'kelurahan', 'kec.', 'kecamatan'];
  const nameLower = name.toLowerCase();
  for (const rk of roadKeywords) {
    if (nameLower.startsWith(rk)) {
      if (!rawLoc || rawLoc.toLowerCase() === 'payakumbuh') {
        rawLoc = name;
      }
      name = 'Pelanggan STO';
      break;
    }
  }

  if (!name || name.toLowerCase() === 'pelanggan' || name.toLowerCase() === 'pelanggan sto' || name.toLowerCase() === 'pelanggan telkom') {
    name = 'Pelanggan STO';
  } else {
    name = name
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // 8. Sanitasi ALAMAT (Strict)
  let loc = rawLoc
    .replace(/(?:Pelanggan|Telp|Telepon|Hp|Catatan|Ket|Keterangan)\s*:/gi, '')
    .replace(/(?:\+?62|08|0)[0-9\-\s]{6,16}/g, '');

  if (name && name !== 'Pelanggan STO') {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    loc = loc.replace(new RegExp('\\b' + escapedName + '\\b', 'gi'), ' ');
  }

  if (cleanTelp) {
    const rawDigits = cleanTelp.replace(/[^0-9]/g, '');
    if (rawDigits.length >= 6) {
      loc = loc.replace(new RegExp(rawDigits, 'g'), ' ');
    }
  }

  loc = loc
    .replace(/\((?:[^)]*(?:pelanggan|telp|hp|catatan|baru|psb|gangguan|los|repair)[^)]*)\)/gi, ' ')
    .replace(/\([^)]*$/g, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/[|•—_]/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  // Bersihkan karakter simbol yang tersisa di awal dan akhir
  while (loc.endsWith('(') || loc.endsWith('[') || loc.endsWith('-') || loc.endsWith('|') || loc.endsWith(',') || loc.endsWith('.')) {
    loc = loc.slice(0, -1).trim();
  }
  while (loc.startsWith('(') || loc.startsWith(')') || loc.startsWith('-') || loc.startsWith('|') || loc.startsWith(',') || loc.startsWith('.')) {
    loc = loc.slice(1).trim();
  }

  // Unmatched ')' at end
  const openCount = (loc.match(/\(/g) || []).length;
  const closeCount = (loc.match(/\)/g) || []).length;
  if (closeCount > openCount && loc.endsWith(')')) {
    loc = loc.slice(0, -1).trim();
  }

  if (!loc || loc === '-') {
    loc = 'Payakumbuh';
  }

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
    address: loc,
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

/**
 * Format tanggal dari string ISO atau Date object ke format Indonesia: "17 Nov 2026, 17:14 WIB"
 */
export const formatDateId = (rawDate) => {
  if (!rawDate) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
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
};
