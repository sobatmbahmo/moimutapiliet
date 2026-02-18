/**
 * Parse WhatsApp message containing customer info
 * Supports various formats with flexible field matching
 */

// Common field variations for parsing
// Separator is now optional - can be : - = or just space
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
const SECTION_HEADERS = /^[📦📍💳✅🛒📋].*(DETAIL|DATA|ALAMAT|METODE|PESANAN|RINGKASAN)/iu;

// Special section headers that indicate next line contains the value
const SECTION_VALUE_HEADERS = {
  alamat: /^[📍]?\s*ALAMAT\s*(LENGKAP)?$/iu,
  metode: /^[💳]?\s*METODE\s*(PEMBAYARAN)?$/iu,
};

// Lines to completely skip
const SKIP_PATTERNS = [
  /^[📦📋🛒].*(DETAIL PESANAN|RINGKASAN)/iu,
  /^\d+\.\s+[A-Z]+.*\(.*\)/i, // Order items like "1. PAKET KOMPLIT - GGSA (1x)"
  /^\(Kode:/i,
  /^Subtotal/i,
  /^Ongkos Kirim/i,
  /^Total:/i,
  /^Pesanan sudah tersimpan/i,
  /^[✅📦].*/u,
];

/**
 * Clean phone number to standard format
 * @param {string} phone 
 * @returns {string}
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Indonesian formats
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62') && cleaned.length >= 9) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

/**
 * Clean line from emojis and extra whitespace
 * @param {string} line 
 * @returns {string}
 */
function cleanLine(line) {
  // Remove emojis and special characters at start
  return line.replace(/^[^\w\s]*/, '').trim();
}

/**
 * Parse raw WA message text into structured data
 * @param {string} text - Raw message text
 * @returns {Object} Parsed data object
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

  // Split by lines and process each
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentField = null;
  let multiLineCollector = '';
  let inAlamatSection = false;
  let nextLineIsValue = null; // Track if next line should be captured as a specific field

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for section headers that indicate NEXT LINE is the value
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
    
    // Skip section headers with emojis
    if (SECTION_HEADERS.test(line)) {
      // Check if entering ALAMAT section
      if (/ALAMAT/i.test(line)) {
        inAlamatSection = true;
      } else {
        inAlamatSection = false;
      }
      continue;
    }
    
    // Skip irrelevant lines (order items, totals, etc.)
    if (SKIP_PATTERNS.some(p => p.test(line))) {
      continue;
    }
    
    // Clean line from emojis
    line = cleanLine(line);
    if (!line) continue;
    
    // Handle if this line is supposed to be a value from section header
    if (nextLineIsValue === 'alamat' && line) {
      result.alamat_jalan = line;
      nextLineIsValue = null;
      continue;
    }
    if (nextLineIsValue === 'metode' && line) {
      // Clean metode - extract just the type
      const metodeLower = line.toLowerCase();
      if (metodeLower.includes('transfer')) {
        result.metode_bayar = 'transfer';
      } else if (metodeLower.includes('cod') || metodeLower.includes('bayar di tempat')) {
        result.metode_bayar = 'cod';
      } else {
        result.metode_bayar = line;
      }
      nextLineIsValue = null;
      continue;
    }
    
    let matched = false;

    // If we're in alamat section and line doesn't match any field, it's the address
    if (inAlamatSection && !FIELD_PATTERNS.nama.test(line) && !FIELD_PATTERNS.phone.test(line)) {
      if (!result.alamat_jalan) {
        result.alamat_jalan = line;
        matched = true;
      }
    }

    // Try to match each field pattern
    for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
      const match = line.match(pattern);
      if (match) {
        // Save previous multi-line field if any
        if (currentField === 'alamat' && multiLineCollector) {
          result.alamat_jalan = multiLineCollector.trim();
          multiLineCollector = '';
        }
        
        const value = match[1].trim();
        
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
            // Save alamat if we transition to kecamatan
            if (multiLineCollector) {
              result.alamat_jalan = multiLineCollector.trim();
              multiLineCollector = '';
            }
            break;
          case 'kelurahan':
            result.kelurahan = value;
            currentField = null;
            if (multiLineCollector) {
              result.alamat_jalan = multiLineCollector.trim();
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

    // If not matched and we're collecting alamat, append
    if (!matched && currentField === 'alamat') {
      multiLineCollector += ' ' + line;
    }
  }

  // Final save of multi-line alamat
  if (currentField === 'alamat' && multiLineCollector) {
    result.alamat_jalan = multiLineCollector.trim();
  }

  // Try to extract KABUPATEN/KOTA and PROVINSI from inline address
  // Format: "alamat, KECAMATAN, KABUPATEN XXX, PROVINSI"
  if (result.alamat_jalan && !result.kabupaten) {
    const inlineMatch = result.alamat_jalan.match(/,\s*(KABUPATEN|KAB\.?|KOTA)\s+([^,]+),\s*([A-Z\s]+)$/i);
    if (inlineMatch) {
      const kabType = inlineMatch[1].toUpperCase();
      const kabName = inlineMatch[2].trim();
      const provName = inlineMatch[3].trim();
      
      // Extract kabupaten
      result.kabupaten = (kabType.startsWith('KAB') ? 'KABUPATEN ' : 'KOTA ') + kabName.toUpperCase();
      result.provinsi = provName.toUpperCase();
      
      // Clean alamat - remove kabupaten and provinsi from it
      result.alamat_jalan = result.alamat_jalan.replace(/,\s*(KABUPATEN|KAB\.?|KOTA)\s+[^,]+,\s*[A-Z\s]+$/i, '').trim();
      
      // Try to extract kecamatan from remaining address
      const kecMatch = result.alamat_jalan.match(/,\s*([^,]+)$/);
      if (kecMatch) {
        const potentialKec = kecMatch[1].trim();
        // If it looks like a kecamatan name (ALL CAPS or proper case, not too long)
        if (potentialKec.length < 50 && /^[A-Z\s]+$/i.test(potentialKec)) {
          result.kecamatan = potentialKec;
          result.alamat_jalan = result.alamat_jalan.replace(/,\s*[^,]+$/, '').trim();
        }
      }
    }
  }

  // Handle metode_bayar: clean "Transfer Bank - xxx" to just "transfer"
  if (result.metode_bayar) {
    const metodeLower = result.metode_bayar.toLowerCase();
    if (metodeLower.includes('transfer')) {
      result.metode_bayar = 'transfer';
    } else if (metodeLower.includes('cod') || metodeLower.includes('bayar di tempat')) {
      result.metode_bayar = 'cod';
    }
  }

  return result;
}

/**
 * Format parsed address into single line for database
 * @param {Object} parsed - Parsed address object
 * @returns {string} Formatted address
 */
export function formatAddressString(parsed) {
  if (!parsed) return '';

  const parts = [];
  
  // Street address
  if (parsed.alamat_jalan) {
    parts.push(parsed.alamat_jalan);
  }
  
  // Kelurahan
  if (parsed.kelurahan) {
    parts.push(`Kel. ${parsed.kelurahan}`);
  }
  
  // Kecamatan
  if (parsed.kecamatan) {
    parts.push(`Kec. ${parsed.kecamatan}`);
  }
  
  // Kabupaten/Kota
  if (parsed.kabupaten) {
    // Normalize kota/kabupaten prefix
    let kab = parsed.kabupaten;
    if (!/^(kota|kabupaten|kab\.?)\s+/i.test(kab)) {
      // Try to detect if it's a city or regency
      kab = kab.toUpperCase();
    } else {
      kab = kab.toUpperCase();
    }
    parts.push(kab);
  }
  
  // Provinsi
  if (parsed.provinsi) {
    parts.push(parsed.provinsi.toUpperCase());
  }
  
  // Kode Pos
  if (parsed.kode_pos) {
    parts.push(parsed.kode_pos);
  }

  return parts.join(', ');
}

/**
 * Detect payment method from text
 * @param {string} text 
 * @returns {string} 'transfer' or 'cod'
 */
export function detectPaymentMethod(text) {
  if (!text) return 'transfer';
  
  const lower = text.toLowerCase();
  
  if (lower.includes('cod') || lower.includes('bayar di tempat') || lower.includes('cash on delivery')) {
    return 'cod';
  }
  
  return 'transfer';
}

/**
 * Normalize RT/RW format
 * @param {string} text 
 * @returns {string}
 */
export function normalizeRTRW(text) {
  if (!text) return text;
  
  // Normalize various RT/RW formats
  return text
    .replace(/rt\s*(\d+)\s*[/\\]\s*rw?\s*(\d+)/gi, 'RT $1/RW $2')
    .replace(/rt\s*[:\s]+(\d+)\s+rw?\s*[:\s]+(\d+)/gi, 'RT $1/RW $2')
    .replace(/(\d+)\s*[/\\]\s*(\d+)(?=\s|$)/g, 'RT $1/RW $2');
}

export default {
  parseWAMessage,
  formatAddressString,
  detectPaymentMethod,
  normalizeRTRW,
  cleanPhoneNumber
};
