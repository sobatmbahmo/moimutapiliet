// ================================================================
// VALIDATION UTILITIES - Centralized input validation & sanitization
// ================================================================

/**
 * Sanitize: Remove dangerous characters to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>\"\']/g, '') // Remove < > " '
    .trim();
};

/**
 * Validate Name
 * Requirements: 2-100 chars, letters/spaces/hyphens/dots only
 */
export const validateNama = (nama) => {
  if (!nama || typeof nama !== 'string') {
    return 'Nama harus diisi';
  }

  if (nama.trim().length < 2) {
    return 'Nama minimal 2 karakter';
  }

  if (nama.length > 100) {
    return 'Nama maksimal 100 karakter';
  }

  // Allow: letters, numbers, spaces, hyphens, dots, apostrophes
  if (!/^[a-zA-Z\s\-.\''ąćęłńóśźżА-Яа-я0-9]+$/.test(nama)) {
    return 'Nama hanya boleh mengandung huruf, angka, spasi, dan karakter (-.\')';
  }

  return null;
};

/**
 * Validate Phone Number (Indonesia)
 * Formats: 08123456789, +628123456789, 628123456789
 */
export const validateNomorWA = (nomor) => {
  if (!nomor || typeof nomor !== 'string') {
    return 'Nomor WhatsApp harus diisi';
  }

  // Remove spaces and dashes
  const cleaned = nomor.replace(/[\s\-]/g, '');

  // Check format: must be valid Indonesian phone
  // 62 or 0 prefix, followed by 9-12 digits
  const phoneRegex = /^(?:\+62|62|0)(?:8|9)[0-9]{7,10}$/;

  if (!phoneRegex.test(cleaned)) {
    return 'Format nomor WhatsApp tidak valid. Gunakan format: 08xxx atau +628xxx';
  }

  return null;
};

/**
 * Validate Email
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return 'Email harus diisi';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return 'Format email tidak valid';
  }

  if (email.length > 255) {
    return 'Email terlalu panjang';
  }

  return null;
};

/**
 * Validate Password
 * Requirements: min 8 chars, 1 uppercase, 1 number, 1 special char
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password harus diisi';
  }

  if (password.length < 6) {
    return 'Password minimal 6 karakter';
  }

  // Only allow lowercase letters (a-z) and numbers (0-9)
  if (!/^[a-z0-9]+$/.test(password)) {
    return 'Password hanya boleh menggunakan huruf kecil (a-z) dan angka (0-9)';
  }

  return null;
};

/**
 * Validate that passwords match
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return 'Password dan konfirmasi password tidak sesuai';
  }
  return null;
};

/**
 * Validate Number (for quantities, prices, etc)
 */
export const validateNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const num = parseInt(value);

  if (isNaN(num)) {
    return 'Nilai harus berupa angka';
  }

  if (num < min) {
    return `Nilai minimal ${min}`;
  }

  if (num > max) {
    return `Nilai maksimal ${max}`;
  }

  return null;
};

/**
 * Validate Alamat (Address)
 */
export const validateAlamat = (alamat) => {
  if (!alamat || typeof alamat !== 'string') {
    return 'Alamat harus diisi';
  }

  if (alamat.length < 5) {
    return 'Alamat minimal 5 karakter';
  }

  if (alamat.length > 500) {
    return 'Alamat maksimal 500 karakter';
  }

  // Allow letters, numbers, spaces, and common address chars
  if (!/^[a-zA-Z0-9\s\-.,#no\/\\()ąćęłńóśźżА-Яа-я]+$/.test(alamat)) {
    return 'Alamat mengandung karakter yang tidak diizinkan';
  }

  return null;
};

/**
 * Validate Resi Number
 */
export const validateResi = (resi) => {
  if (!resi || typeof resi !== 'string') {
    return 'Nomor resi harus diisi';
  }

  const cleaned = resi.trim();

  if (cleaned.length < 5) {
    return 'Nomor resi minimal 5 karakter';
  }

  if (cleaned.length > 50) {
    return 'Nomor resi maksimal 50 karakter';
  }

  // Allow alphanumeric and dashes
  if (!/^[a-zA-Z0-9\-]+$/.test(cleaned)) {
    return 'Nomor resi hanya boleh mengandung huruf, angka, dan strip (-)';
  }

  return null;
};

/**
 * Validate Ongkir (Shipping Cost)
 */
export const validateOngkir = (ongkir) => {
  const error = validateNumber(ongkir, 0, 10000000);
  if (error) return 'Ongkir harus berupa angka (Rp0 - Rp10.000.000)';
  return null;
};

/**
 * BATCH VALIDATION - Validate multiple fields at once
 * Returns: { isValid: boolean, errors: { fieldName: errorMessage } }
 */
export const validateForm = (data, schema) => {
  const errors = {};

  for (const [field, validator] of Object.entries(schema)) {
    const value = data[field];
    const error = validator(value);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Example usage:
 * const schema = {
 *   nama: validateNama,
 *   nomorWA: validateNomorWA,
 *   email: validateEmail,
 *   password: validatePassword
 * };
 *
 * const result = validateForm(formData, schema);
 * if (!result.isValid) {
 *   console.log(result.errors); // { nama: 'Nama minimal 2 karakter', ... }
 * }
 */

// Export all validators as a group
export const validators = {
  sanitizeInput,
  validateNama,
  validateNomorWA,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateNumber,
  validateAlamat,
  validateResi,
  validateOngkir,
  validateForm
};
