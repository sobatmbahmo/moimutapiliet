// ================================================================
// ERROR HANDLING UTILITIES
// ================================================================

/**
 * Error Classification & User-Friendly Messages
 */

export class AppError extends Error {
  constructor(code, userMessage, technicalDetails = null) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.technicalDetails = technicalDetails;
  }
}

/**
 * Classify error dan return user-friendly message
 */
export const handleError = (error) => {
  console.error('Error caught:', error);

  // Network errors
  if (error.message?.includes('fetch') || error.code === 'ERR_NETWORK') {
    return {
      userMessage: '❌ Gagal terhubung ke server. Periksa koneksi internet Anda.',
      code: 'NETWORK_ERROR',
      severity: 'error'
    };
  }

  // Timeout
  if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
    return {
      userMessage: '⏱️ Permintaan timeout. Coba lagi dalam beberapa saat.',
      code: 'TIMEOUT',
      severity: 'error'
    };
  }

  // Authentication errors
  if (error.status === 401 || error.message?.includes('unauthorized')) {
    return {
      userMessage: '🔐 Sesi Anda sudah berakhir. Silakan login kembali.',
      code: 'AUTH_ERROR',
      severity: 'error'
    };
  }

  // Forbidden
  if (error.status === 403 || error.message?.includes('forbidden')) {
    return {
      userMessage: '⛔ Anda tidak memiliki akses untuk operasi ini.',
      code: 'FORBIDDEN',
      severity: 'error'
    };
  }

  // Not found
  if (error.status === 404) {
    return {
      userMessage: '🔍 Data yang dicari tidak ditemukan.',
      code: 'NOT_FOUND',
      severity: 'warning'
    };
  }

  // Duplicate / Conflict
  if (error.status === 409 || error.message?.includes('duplicate')) {
    return {
      userMessage: '⚠️ Data sudah ada. Tidak bisa membuat duplikat.',
      code: 'DUPLICATE',
      severity: 'warning'
    };
  }

  // Database errors
  if (error.code === 'PGRST301' || error.code === 'PGRST302') {
    // RLS policy violation
    return {
      userMessage: '🔐 Anda tidak memiliki akses ke data ini (RLS Policy).',
      code: 'RLS_VIOLATION',
      severity: 'error'
    };
  }

  if (error.code?.includes('22P02')) {
    // Invalid input syntax
    return {
      userMessage: '❌ Format data tidak valid.',
      code: 'INVALID_FORMAT',
      severity: 'error'
    };
  }

  if (error.code?.includes('UNIQUE')) {
    // Unique constraint violation
    return {
      userMessage: '⚠️ Data ini sudah terdaftar sebelumnya.',
      code: 'UNIQUE_VIOLATION',
      severity: 'warning'
    };
  }

  // Supabase specific errors
  if (error.error_description) {
    // Supabase auth error
    return {
      userMessage: `🔐 Error: ${error.error_description}`,
      code: 'AUTH_ERROR',
      severity: 'error'
    };
  }

  if (error.message?.includes('JSON')) {
    // JSON parse error
    return {
      userMessage: '❌ Error parsing data. Hubungi support.',
      code: 'JSON_ERROR',
      severity: 'error'
    };
  }

  // API specific errors (Fonnte, etc)
  if (error.message?.includes('Fonnte')) {
    return {
      userMessage: '📱 Gagal mengirim pesan WhatsApp. Coba lagi nanti.',
      code: 'API_ERROR',
      severity: 'error'
    };
  }

  // Generic fallback
  return {
    userMessage: '⚠️ Terjadi error yang tidak diketahui. Tim support sudah diberitahu.',
    code: 'UNKNOWN_ERROR',
    severity: 'error',
    technicalDetails: error.message || 'Unknown'
  };
};

/**
 * Safe API call wrapper dengan error handling otomatis
 * 
 * Usage:
 * const result = await safeApiCall(
 *   () => supabase.from('orders').select(),
 *   'Loading orders'
 * );
 */
export const safeApiCall = async (apiFunction, context = 'API Call') => {
  try {
    const response = await apiFunction();
    return {
      success: true,
      data: response.data || response,
      error: null
    };
  } catch (error) {
    const errorInfo = handleError(error);
    console.error(`${context} failed:`, errorInfo);

    return {
      success: false,
      data: null,
      error: errorInfo
    };
  }
};

/**
 * Async operation dengan timeout
 */
export const withTimeout = (promise, timeoutMs = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

/**
 * Retry logic untuk network-sensitive operations
 */
export const retryWithBackoff = async (fn, maxRetries = 3, delayMs = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Usage examples:
 */

/*
// Example 1: Safe API call
const result = await safeApiCall(
  () => supabase.from('orders').select(),
  'Load orders'
);

if (!result.success) {
  setErrorMsg(result.error.userMessage);
  return;
}

// Example 2: With timeout
try {
  const data = await withTimeout(
    someApiCall(),
    5000
  );
} catch (err) {
  // Handle timeout
}

// Example 3: Retry with backoff
const data = await retryWithBackoff(
  () => sendFonntMessage(phone, message),
  3, // max 3 retries
  1000 // start with 1s delay
);
*/

// Export error utilities
export const errorUtils = {
  handleError,
  safeApiCall,
  withTimeout,
  retryWithBackoff,
  AppError
};
