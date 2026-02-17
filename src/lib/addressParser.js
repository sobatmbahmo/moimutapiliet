/**
 * Parse WhatsApp message containing customer info
 * Supports various formats with flexible field matching
 */

// Common field variations for parsing
const FIELD_PATTERNS = {
  nama: /^(?:nama(?:\s*penerima)?|name|penerima)\s*[:\-=]?\s*(.+)/i,
  phone: /^(?:no\.?\s*(?:hp|wa|telp|telepon|handphone)|hp|wa|whatsapp|phone|nomor[\s_]?(?:wa|hp|telepon)?)\s*[:\-=]?\s*([\d\s\-+]+)/i,
  alamat: /^(?:alamat(?:\s*(?:lengkap|pengiriman|kirim))?|address|jalan|jln?\.?|detail\s*alamat)\s*[:\-=]?\s*(.+)/i,
  kecamatan: /^(?:kecamatan|kec\.?)\s*[:\-=]?\s*(.+)/i,
  kelurahan: /^(?:kelurahan|kel\.?|desa)\s*[:\-=]?\s*(.+)/i,
  kabupaten: /^(?:kab(?:upaten)?|kota|kab\.?\/?kota|kabupaten\/?kota|city)\s*[:\-=]?\s*(.+)/i,
  provinsi: /^(?:provinsi|prov\.?|province)\s*[:\-=]?\s*(.+)/i,
  kodepos: /^(?:kode\s*pos|kodepos|zip\s*code|postal)\s*[:\-=]?\s*(.+)/i,
  metodeBayar: /^(?:metode\s*(?:pembayaran|bayar)?|payment|bayar|pembayaran|transfer\s*bank)\s*[:\-=]?\s*(.*)/i,
};

// Section headers to skip (emoji-based sections)
const SECTION_HEADERS = /^[📦📍💳✅🛒📋].*(DETAIL|DATA|ALAMAT|METODE|PESANAN|RINGKASAN)/i;

// Special section headers that indicate next line contains the value
const SECTION_VALUE_HEADERS = {
  alamat: /^[📍]?\s*ALAMAT\s*(LENGKAP)?$/i,
  metode: /^[💳]?\s*METODE\s*(PEMBAYARAN)?$/i,
};

// Lines to completely skip
const SKIP_PATTERNS = [
  /^[📦📋🛒].*(DETAIL PESANAN|RINGKASAN)/i,
  /^\d+\.\s+[A-Z]+.*\(.*\)/i, 
  /^\(Kode:/i,
  /^Subtotal/i,
  /^Ongkos Kirim/i,
  /^Total:/i,
  /^Pesanan sudah tersimpan/i,
  /^[✅📦].*/,
];

/**
 * 💡 FUNGSI TAMBAHAN: Sanitasi Karakter
 * Menghapus emoji dan karakter aneh yang tidak diizinkan API/Database
 */
function sanitizeString(str) {
  if (!str) return '';
  // Hanya izinkan Huruf, Angka, Spasi, Titik, Koma, Strip, dan Garis Miring
  return str.replace(/[^\w\s.,\-\/]/gi, '').trim();
}

/**
 * Clean phone number to standard format
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62') && cleaned.length >= 9) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Clean line from emojis and extra whitespace
 */
function cleanLine(line) {
  return line.replace(/^[^\w\s]*/, '').trim();
}

/**
 * Parse raw WA message text into structured data
 */
export function parseWAMessage(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const result = {
    nama: '',
    nomor_wa: '',
    alamat_jalan: '',
    kelurahan: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: '',
    kode_pos: '',
    metode_bayar: '',
    raw_text: text
  };

  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentField = null;
  let multiLineCollector = '';
  let inAlamatSection = false;
  let nextLineIsValue = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    const cleanedForSection = cleanLine(line);
    if (SECTION_VALUE_HEADERS.alamat.test(cleanedForSection)) {
      nextLineIsValue = 'alamat';
      inAlamatSection = true;
      continue;
    }
    if (SECTION_VALUE_HEADERS.metode.test(cleanedForSection)) {
      nextLineIsValue = 'metode';
      continue;
    }
    
    if (SECTION_HEADERS.test(line)) {
      inAlamatSection = /ALAMAT/i.test(line);
      continue;
    }
    
    if (SKIP_PATTERNS.some(p => p.test(line))) {
      continue;
    }
    
    line = cleanLine(line);
    if (!line) continue;
    
    if (nextLineIsValue === 'alamat' && line) {
      result.alamat_jalan = sanitizeString(line); // 💡 Sanitasi
      nextLineIsValue = null;
      continue;
    }
    if (nextLineIsValue === 'metode' && line) {
      const metodeLower = line.toLowerCase();
      if (metodeLower.includes('transfer')) {
        result.metode_bayar = 'transfer';
      } else if (metodeLower.includes('cod') || metodeLower.includes('bayar di tempat')) {
        result.metode_bayar = 'cod';
      } else {
        result.metode_bayar = sanitizeString(line); // 💡 Sanitasi
      }
      nextLineIsValue = null;
      continue;
    }
    
    let matched = false;

    if (inAlamatSection && !FIELD_PATTERNS.nama.test(line) && !FIELD_PATTERNS.phone.test(line)) {
      if (!result.alamat_jalan) {
        result.alamat_jalan = sanitizeString(line); // 💡 Sanitasi
        matched = true;
      }
    }

    for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
      const match = line.match(pattern);
      if (match) {
        if (currentField === 'alamat' && multiLineCollector) {
          result.alamat_jalan = sanitizeString(multiLineCollector); // 💡 Sanitasi
          multiLineCollector = '';
        }
        
        const value = sanitizeString(match[1]); // 💡 Sanitasi setiap hasil match
        
        switch (field) {
          case 'nama':
            result.nama = value;
            break;
          case 'phone':
            result.nomor_wa = cleanPhoneNumber(value);
            break;
          case 'alamat':
            multiLineCollector = value;
            currentField = 'alamat';
            break;
          case 'kecamatan':
            result.kecamatan = value;
            currentField = null;
            if (multiLineCollector) {
              result.alamat_jalan = sanitizeString(multiLineCollector); // 💡 Sanitasi
              multiLineCollector = '';
            }
            break;
          case 'kelurahan':
            result.kelurahan = value;
            currentField = null;
            if (multiLineCollector) {
              result.alamat_jalan = sanitizeString(multiLineCollector); // 💡 Sanitasi
              multiLineCollector = '';
            }
            break;
          case 'kabupaten':
            result.kabupaten = value;
            currentField = null;
            break;
          case 'provinsi':
            result.provinsi = value;
            currentField = null;
            break;
          case 'kodepos':
            result.kode_pos = value.replace(/\D/g, '');
            currentField = null;
            break;
          case 'metodeBayar':
            result.metode_bayar = value;
            currentField = null;
            break;
        }
        matched = true;
        break;
      }
    }

    if (!matched && currentField === 'alamat') {
      multiLineCollector += ' ' + line;
    }
  }

  if (currentField === 'alamat' && multiLineCollector) {
    result.alamat_jalan = sanitizeString(multiLineCollector); // 💡 Sanitasi
  }

  // --- Logic for inline address parsing ---
  if (result.alamat_jalan && !result.kabupaten) {
    const inlineMatch = result.alamat_jalan.match(/,\s*(KABUPATEN|KAB\.?|KOTA)\s+([^,]+),\s*([A-Z\s]+)$/i);
    if (inlineMatch) {
      const kabType = inlineMatch[1].toUpperCase();
      const kabName = inlineMatch[2].trim();
      const provName = inlineMatch[3].trim();
      
      result.kabupaten = sanitizeString((kabType.startsWith('KAB') ? 'KABUPATEN ' : 'KOTA ') + kabName.toUpperCase());
      result.provinsi = sanitizeString(provName.toUpperCase());
      
      result.alamat_jalan = sanitizeString(result.alamat_jalan.replace(/,\s*(KABUPATEN|KAB\.?|KOTA)\s+[^,]+,\s*[A-Z\s]+$/i, '').trim());
      
      const kecMatch = result.alamat_jalan.match(/,\s*([^,]+)$/);
      if (kecMatch) {
        const potentialKec = kecMatch[1].trim();
        if (potentialKec.length < 50 && /^[A-Z\s]+$/i.test(potentialKec)) {
          result.kecamatan = sanitizeString(potentialKec);
          result.alamat_jalan = sanitizeString(result.alamat_jalan.replace(/,\s*[^,]+$/, '').trim());
        }
      }
    }
  }

  return result;
}

/**
 * Format parsed address into single line for database
 */
export function formatAddressString(parsed) {
  if (!parsed) return '';

  const parts = [];
  
  if (parsed.alamat_jalan) {
    parts.push(sanitizeString(parsed.alamat_jalan)); // 💡 Sanitasi
  }
  
  if (parsed.kelurahan) {
    parts.push(`Kel. ${sanitizeString(parsed.kelurahan)}`); // 💡 Sanitasi
  }
  
  if (parsed.kecamatan) {
    parts.push(`Kec. ${sanitizeString(parsed.kecamatan)}`); // 💡 Sanitasi
  }
  
  if (parsed.kabupaten) {
    parts.push(sanitizeString(parsed.kabupaten.toUpperCase())); // 💡 Sanitasi
  }
  
  if (parsed.provinsi) {
    parts.push(sanitizeString(parsed.provinsi.toUpperCase())); // 💡 Sanitasi
  }
  
  if (parsed.kode_pos) {
    parts.push(parsed.kode_pos.replace(/\D/g, ''));
  }

  return parts.join(', ');
}

export function detectPaymentMethod(text) {
  if (!text) return 'transfer';
  const lower = text.toLowerCase();
  if (lower.includes('cod') || lower.includes('bayar di tempat') || lower.includes('cash on delivery')) {
    return 'cod';
  }
  return 'transfer';
}

export function normalizeRTRW(text) {
  if (!text) return text;
  return text
    .replace(/rt\s*(\d+)\s*[\/\\]\s*rw?\s*(\d+)/gi, 'RT $1/RW $2')
    .replace(/rt\s*[:\s]+(\d+)\s+rw?\s*[:\s]+(\d+)/gi, 'RT $1/RW $2')
    .replace(/(\d+)\s*[\/\\]\s*(\d+)(?=\s|$)/g, 'RT $1/RW $2');
}

export default {
  parseWAMessage,
  formatAddressString,
  detectPaymentMethod,
  normalizeRTRW,
  cleanPhoneNumber
};
