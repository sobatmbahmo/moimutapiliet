/**
 * Indonesian Address API Integration using emsifa/api-wilayah-indonesia
 * Provides fuzzy matching for typo correction
 */
import Fuse from 'fuse.js';

// Emsifa API base URL (free, no API key needed)
const EMSIFA_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

// Cache for loaded data
let provincesCache = null;
let regenciesCache = {}; // keyed by province_id
let districtsCache = {}; // keyed by regency_id
let villagesCache = {}; // keyed by district_id

// Fuse.js options for fuzzy matching
const FUSE_OPTIONS = {
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  keys: ['name']
};

/**
 * Fetch provinces from API
 * @returns {Promise<Array>}
 */
export async function getProvinces() {
  if (provincesCache) return provincesCache;
  
  try {
    const response = await fetch(`${EMSIFA_BASE}/provinces.json`);
    if (!response.ok) throw new Error('Failed to fetch provinces');
    provincesCache = await response.json();
    return provincesCache;
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
}

/**
 * Fetch regencies (kabupaten/kota) for a province
 * @param {string} provinceId 
 * @returns {Promise<Array>}
 */
export async function getRegencies(provinceId) {
  if (!provinceId) return [];
  if (regenciesCache[provinceId]) return regenciesCache[provinceId];
  
  try {
    const response = await fetch(`${EMSIFA_BASE}/regencies/${provinceId}.json`);
    if (!response.ok) throw new Error('Failed to fetch regencies');
    regenciesCache[provinceId] = await response.json();
    return regenciesCache[provinceId];
  } catch (error) {
    console.error('Error fetching regencies:', error);
    return [];
  }
}

/**
 * Fetch districts (kecamatan) for a regency
 * @param {string} regencyId 
 * @returns {Promise<Array>}
 */
export async function getDistricts(regencyId) {
  if (!regencyId) return [];
  if (districtsCache[regencyId]) return districtsCache[regencyId];
  
  try {
    const response = await fetch(`${EMSIFA_BASE}/districts/${regencyId}.json`);
    if (!response.ok) throw new Error('Failed to fetch districts');
    districtsCache[regencyId] = await response.json();
    return districtsCache[regencyId];
  } catch (error) {
    console.error('Error fetching districts:', error);
    return [];
  }
}

/**
 * Fetch villages (kelurahan/desa) for a district
 * @param {string} districtId 
 * @returns {Promise<Array>}
 */
export async function getVillages(districtId) {
  if (!districtId) return [];
  if (villagesCache[districtId]) return villagesCache[districtId];
  
  try {
    const response = await fetch(`${EMSIFA_BASE}/villages/${districtId}.json`);
    if (!response.ok) throw new Error('Failed to fetch villages');
    villagesCache[districtId] = await response.json();
    return villagesCache[districtId];
  } catch (error) {
    console.error('Error fetching villages:', error);
    return [];
  }
}

/**
 * Fuzzy match a query against a list of locations
 * @param {string} query 
 * @param {Array} locations 
 * @returns {Object|null} Best match or null
 */
export function fuzzyMatch(query, locations) {
  if (!query || !locations || locations.length === 0) return null;
  
  // Clean query - remove common prefixes
  const cleanQuery = query
    .toLowerCase()
    .replace(/^(kota|kabupaten|kab\.?|provinsi|prov\.?|kecamatan|kec\.?|kelurahan|kel\.?|desa)\s+/i, '')
    .trim();
  
  const fuse = new Fuse(locations, FUSE_OPTIONS);
  const results = fuse.search(cleanQuery);
  
  if (results.length > 0) {
    return results[0].item;
  }
  
  return null;
}

/**
 * Validate and correct province name
 * @param {string} provinceName 
 * @returns {Promise<Object|null>}
 */
export async function validateProvince(provinceName) {
  const provinces = await getProvinces();
  return fuzzyMatch(provinceName, provinces);
}

/**
 * Validate and correct regency/city name
 * @param {string} regencyName 
 * @param {string} provinceId - Optional, to narrow search
 * @returns {Promise<Object|null>}
 */
export async function validateRegency(regencyName, provinceId = null) {
  if (provinceId) {
    const regencies = await getRegencies(provinceId);
    return fuzzyMatch(regencyName, regencies);
  }
  
  // Without province, search all provinces
  const provinces = await getProvinces();
  for (const prov of provinces) {
    const regencies = await getRegencies(prov.id);
    const match = fuzzyMatch(regencyName, regencies);
    if (match) {
      return { ...match, province: prov };
    }
  }
  
  return null;
}

/**
 * Validate and correct district (kecamatan) name
 * @param {string} districtName 
 * @param {string} regencyId - Optional
 * @returns {Promise<Object|null>}
 */
export async function validateDistrict(districtName, regencyId = null) {
  if (regencyId) {
    const districts = await getDistricts(regencyId);
    return fuzzyMatch(districtName, districts);
  }
  return null;
}

/**
 * Validate and correct village (kelurahan) name
 * @param {string} villageName 
 * @param {string} districtId 
 * @returns {Promise<Object|null>}
 */
export async function validateVillage(villageName, districtId) {
  if (!districtId) return null;
  const villages = await getVillages(districtId);
  return fuzzyMatch(villageName, villages);
}

/**
 * Full address validation and correction
 * @param {Object} parsedAddress - From addressParser.parseWAMessage
 * @returns {Promise<Object>} Validated/corrected address
 */
export async function validateAddress(parsedAddress) {
  if (!parsedAddress) return parsedAddress;
  
  const result = {
    ...parsedAddress,
    validated: false,
    corrections: []
  };
  
  try {
    // 1. Validate Province
    if (parsedAddress.provinsi) {
      const validProvince = await validateProvince(parsedAddress.provinsi);
      if (validProvince) {
        if (validProvince.name.toLowerCase() !== parsedAddress.provinsi.toLowerCase()) {
          result.corrections.push({
            field: 'provinsi',
            from: parsedAddress.provinsi,
            to: validProvince.name
          });
        }
        result.provinsi = validProvince.name;
        result.provinsi_id = validProvince.id;
      }
    }
    
    // 2. Validate Regency/City
    if (parsedAddress.kabupaten) {
      const validRegency = await validateRegency(parsedAddress.kabupaten, result.provinsi_id);
      if (validRegency) {
        if (validRegency.name.toLowerCase() !== parsedAddress.kabupaten.toLowerCase()) {
          result.corrections.push({
            field: 'kabupaten',
            from: parsedAddress.kabupaten,
            to: validRegency.name
          });
        }
        result.kabupaten = validRegency.name;
        result.kabupaten_id = validRegency.id;
        
        // If province was found via regency search
        if (validRegency.province && !result.provinsi_id) {
          result.provinsi = validRegency.province.name;
          result.provinsi_id = validRegency.province.id;
        }
      }
    }
    
    // 3. Validate District
    if (parsedAddress.kecamatan && result.kabupaten_id) {
      const validDistrict = await validateDistrict(parsedAddress.kecamatan, result.kabupaten_id);
      if (validDistrict) {
        if (validDistrict.name.toLowerCase() !== parsedAddress.kecamatan.toLowerCase()) {
          result.corrections.push({
            field: 'kecamatan',
            from: parsedAddress.kecamatan,
            to: validDistrict.name
          });
        }
        result.kecamatan = validDistrict.name;
        result.kecamatan_id = validDistrict.id;
      }
    }
    
    // 4. Validate Village
    if (parsedAddress.kelurahan && result.kecamatan_id) {
      const validVillage = await validateVillage(parsedAddress.kelurahan, result.kecamatan_id);
      if (validVillage) {
        if (validVillage.name.toLowerCase() !== parsedAddress.kelurahan.toLowerCase()) {
          result.corrections.push({
            field: 'kelurahan',
            from: parsedAddress.kelurahan,
            to: validVillage.name
          });
        }
        result.kelurahan = validVillage.name;
        result.kelurahan_id = validVillage.id;
      }
    }
    
    result.validated = true;
  } catch (error) {
    console.error('Error validating address:', error);
    result.validated = false;
  }
  
  return result;
}

/**
 * Format validated address to final string
 * @param {Object} validatedAddress 
 * @returns {string}
 */
export function formatValidatedAddress(validatedAddress) {
  if (!validatedAddress) return '';
  
  const parts = [];
  
  // Street address (keep original)
  if (validatedAddress.alamat_jalan) {
    parts.push(validatedAddress.alamat_jalan);
  }
  
  // Kelurahan
  if (validatedAddress.kelurahan) {
    parts.push(`Kel. ${validatedAddress.kelurahan}`);
  }
  
  // Kecamatan
  if (validatedAddress.kecamatan) {
    parts.push(`Kec. ${validatedAddress.kecamatan}`);
  }
  
  // Kabupaten/Kota
  if (validatedAddress.kabupaten) {
    parts.push(validatedAddress.kabupaten.toUpperCase());
  }
  
  // Provinsi
  if (validatedAddress.provinsi) {
    parts.push(validatedAddress.provinsi.toUpperCase());
  }
  
  // Kode Pos
  if (validatedAddress.kode_pos) {
    parts.push(validatedAddress.kode_pos);
  }
  
  return parts.join(', ');
}

/**
 * Clear all caches (useful for testing or refresh)
 */
export function clearCache() {
  provincesCache = null;
  regenciesCache = {};
  districtsCache = {};
  villagesCache = {};
}

export default {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
  fuzzyMatch,
  validateProvince,
  validateRegency,
  validateDistrict,
  validateVillage,
  validateAddress,
  formatValidatedAddress,
  clearCache
};
