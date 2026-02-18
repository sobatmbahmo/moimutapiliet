// ================================================================
// FONNTE PUSH - WhatsApp notification via Fonnte API
// ================================================================

// Get token from environment variables (NEVER hardcode in source!)
// For Vite projects, use import.meta.env.VITE_* variables
const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN;
const FONNTE_API_URL = 'https://api.fonnte.com/send';

// Validate token on load
if (!FONNTE_TOKEN) {
  console.warn('⚠️ Warning: VITE_FONNTE_TOKEN not found in .env file. WhatsApp notifications will not work.');
}

/**
 * Helper function untuk send WhatsApp message via Fonnte API
 * @param {string} phone - Nomor WA tujuan (format: 628xxx)
 * @param {string} message - Isi pesan
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
const sendFonntMessage = async (phone, message) => {
  try {
    // Normalize nomor jika dimulai dengan +62
    let normalizedPhone = phone;
    if (normalizedPhone.startsWith('+62')) {
      normalizedPhone = normalizedPhone.replace('+62', '62');
    }
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '62' + normalizedPhone.slice(1);
    }

    const response = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: normalizedPhone,
        message: message,
        countryCode: '62'
      })
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      return {
        success: false,
        error: result.reason || 'Failed to send message'
      };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Fonnte API error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send order confirmation message with detailed items and total payment
 * Template: Order diterima + detail produk + ongkir + total + metode bayar + konfirmasi
 */
export const sendOrderConfirmation = async (phoneNumber, customerName, orderNumber, items, subtotal, shippingCost, totalPayment, courierName, paymentMethod) => {
  // Build item list for message
  let itemsText = '';
  if (items && Array.isArray(items)) {
    items.forEach((item, index) => {
      const itemTotal = item.quantity * item.price;
      itemsText += `${index + 1}. ${item.product_name || 'Produk'} ${item.varian ? `(${item.varian})` : ''}\n`;
      itemsText += `   ${item.quantity}x @ Rp${item.price.toLocaleString('id-ID')}\n`;
      itemsText += `   = Rp${itemTotal.toLocaleString('id-ID')}\n\n`;
    });
  }

  const message = `
*Pesanan Anda Diterima! ✓*

Halo ${customerName},

*Detail Pesanan:*
Nomor: ${orderNumber}
Waktu: ${new Date().toLocaleString('id-ID')}

*Produk yang Dipesan:*
${itemsText}
*Subtotal:* Rp${subtotal.toLocaleString('id-ID')}
*Expedisi:* ${courierName}
*Biaya Pengiriman:* Rp${shippingCost.toLocaleString('id-ID')}
---
*TOTAL PEMBAYARAN:* Rp${totalPayment.toLocaleString('id-ID')}
---
*Metode Pembayaran:* ${paymentMethod === 'transfer' ? 'Transfer Bank' : 'COD'}

${paymentMethod === 'transfer' ? `*Pembayaran Order di Toko Kami Hanya Melalui Nomor Rekening Berikut:*

a/n AGUS MUNIB ABDULLAH

BRI: 313501022627531
BCA: 3240615851
SeaBank: 901504027451

` : ''}
*Mohon segera melakukan pembayaran agar pesanan Anda dapat langsung masuk ke antrean proses hari ini.*

*PENTING:* Jika ada kesalahan pada data di atas (produk, jumlah, harga, atau ongkir), segera hubungi kami via pesan ini agar dapat diperbaiki sebelum pengiriman.

Terima kasih telah berbelanja! 🙏

> Sent via tokonembahmo.com
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send invoice dengan detail pembelian
 * Template: Invoice lengkap dengan item, total, metode bayar
 */
export const sendInvoice = async (phoneNumber, orderData) => {
  let message = `*Invoice Pesanan Anda*\n\n`;
  message += `No Pesanan: ${orderData.orderNumber}\n`;
  message += `Tanggal: ${new Date(orderData.createdAt).toLocaleDateString('id-ID')}\n\n`;

  message += `*Detail Produk:*\n`;
  let subtotal = 0;

  if (orderData.items && Array.isArray(orderData.items)) {
    orderData.items.forEach((item, index) => {
      const itemTotal = (item.quantity || item.qty) * (item.harga_satuan || item.price);
      subtotal += itemTotal;
      message += `${index + 1}. ${item.nama || item.product_name}`;
      if (item.varian) {
        message += ` (${item.varian})`;
      }
      message += `\n   ${item.quantity || item.qty}x Rp${(
        item.harga_satuan || item.price
      ).toLocaleString('id-ID')}\n`;
      message += `   = Rp${itemTotal.toLocaleString('id-ID')}\n\n`;
    });
  }

  message += `*Ringkasan Biaya:*\n`;
  message += `Subtotal: Rp${subtotal.toLocaleString('id-ID')}\n`;
  message += `Ongkos Kirim: Rp${(orderData.shipping || 0).toLocaleString('id-ID')}\n`;
  message += `*Total: Rp${(orderData.total || 0).toLocaleString('id-ID')}*\n\n`;

  if (orderData.paymentMethod === 'transfer') {
    message += `*Metode Pembayaran: Transfer Bank*\n`;
    message += `Silakan transfer sesuai total di atas ke rekening yang sudah diberikan.\n`;
    message += `Pesanan akan diproses setelah pembayaran dikonfirmasi.\n`;
  } else {
    message += `*Metode Pembayaran: COD (Bayar saat diterima)*\n`;
    message += `Anda akan membayar saat barang tiba.\n`;
  }

  message += `\nTerima kasih! 🙏`;

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send resi/tracking number
 * Template: Paket sudah dikirim + nomor resi + nama kurir
 */
export const sendResiNotification = async (
  phoneNumber,
  resi,
  courierName = 'JNE',
  orderNumber = null
) => {
  let message = `*Paket Anda Sudah Dikirim! 📦*\n\n`;

  if (orderNumber) {
    message += `No Pesanan: ${orderNumber}\n`;
  }

  message += `No Resi: *${resi}*\n`;
  message += `Kurir: ${courierName}\n\n`;
  message += `Terus pantau perkembangan paket Anda ya!\n\n`;
  message += `Terima kasih 🙏`;

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send payment confirmation
 * Template: Pembayaran diterima + akan dikirim soon
 */
export const sendPaymentConfirmation = async (phoneNumber, orderNumber) => {
  const message = `
*Pembayaran Diterima! ✓*

Nomor Pesanan: ${orderNumber}
Waktu Konfirmasi: ${new Date().toLocaleString('id-ID')}

Terima kasih! Pembayaran Anda sudah kami terima. Paket segera kami siapkan dan dikirim.

Anda akan menerima notifikasi lagi ketika paket dikirim beserta nomor resi.

🙏
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send withdrawal approval notification
 * Template: Penarikan dana sudah disetujui
 */
export const sendWithdrawalApprovalNotification = async (
  phoneNumber,
  nominal,
  accountName,
  bankName
) => {
  const message = `
*Pencairan Dana Disetujui* ✓

Nominal: Rp${nominal.toLocaleString('id-ID')}
Nama Bank: ${bankName}
Atas Nama: ${accountName}

Dana akan masuk ke rekening Anda dalam 1-3 hari kerja.

Terima kasih atas kerja sama yang luar biasa! 🙏
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send withdrawal rejection notification
 * Template: Penarikan dana ditolak + alasan
 */
export const sendWithdrawalRejectionNotification = async (
  phoneNumber,
  nominal,
  reason = 'Data tidak lengkap'
) => {
  const message = `
*Pencairan Dana Ditolak*

Nominal: Rp${nominal.toLocaleString('id-ID')}
Alasan: ${reason}

Silakan periksa kembali data rekening bank Anda dan mencoba lagi.

Hubungi admin jika ada pertanyaan.
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send affiliator assignment notification
 * Template: Customer berhasil di-binding ke affiliator
 */
export const sendAffiliatorAssignmentNotification = async (
  phoneNumber,
  affiliatorName,
  affiliatorPhone
) => {
  const message = `
*Narahubung Anda*

Nama: ${affiliatorName}
No WA: ${affiliatorPhone}

Untuk informasi tentang produk dan tanya-jawab, silakan hubungi narahubung Anda.

Anda terikat dengan narahubung ini untuk 90 hari ke depan.

Terima kasih 🙏
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send binding expiry reminder
 * Template: Pengingat jika binding mau habis (7 hari sebelum)
 */
export const sendBindingExpiryReminder = async (phoneNumber, daysLeft, affiliatorName) => {
  const message = `
*Pengingat: Binding dengan Narahubung*

Narahubung: ${affiliatorName}

Masa binding Anda akan berakhir dalam ${daysLeft} hari lagi.

Setelah habis, Anda bebas memilih narahubung yang baru. 😊

Terima kasih 🙏
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send order cancellation notification
 * Template: Pesanan dibatalkan + alasan
 */
export const sendOrderCancellationNotification = async (
  phoneNumber,
  orderNumber,
  reason = 'Dibatalkan oleh sistem'
) => {
  const message = `
*Pesanan Dibatalkan*

No Pesanan: ${orderNumber}
Alasan: ${reason}

Pesanan Anda tidak akan diproses lebih lanjut.

Jika ada pertanyaan, hubungi admin kami.

Terima kasih 🙏
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send general admin notification (internal)
 * Template: Notifikasi untuk admin tentang event penting
 */
export const sendAdminNotification = async (adminPhone, subject, details) => {
  let message = `*${subject}*\n\n`;
  message += details;

  return sendFonntMessage(adminPhone, message);
};

/**
 * Send new order alert to affiliator/admin
 * Template: Order baru dari customer via affiliator
 */
export const sendNewOrderAlertToAdmin = async (
  adminPhone,
  orderNumber,
  customerName,
  customerPhone,
  total,
  affiliatorName = null
) => {
  let message = `*Order Baru! 📦*\n\n`;
  message += `No Pesanan: ${orderNumber}\n`;
  message += `Customer: ${customerName}\n`;
  message += `No WA: ${customerPhone}\n`;

  if (affiliatorName) {
    message += `Narahubung: ${affiliatorName}\n`;
  }

  message += `Total: Rp${total.toLocaleString('id-ID')}\n`;
  message += `Waktu: ${new Date().toLocaleString('id-ID')}\n\n`;
  message += `Silakan proses order ini.`;

  return sendFonntMessage(adminPhone, message);
};

/**
 * Send affiliator registration approval notification
 * Sent when admin approves new affiliator registration
 */
export const sendAffiliatorApprovalNotification = async (
  phoneNumber,
  affiliatorName,
  email,
  bankName,
  accountNumber,
  password
) => {
  const message = `
*Pendaftaran Anda Disetujui! 🎉*

Halo ${affiliatorName},

Selamat! Pendaftaran Anda sebagai Mitra telah *disetujui oleh admin*.

*DATA AKUN ANDA:*
Nama: ${affiliatorName}
Email: ${email}
Password: ${password}
Bank: ${bankName}
No. Rekening: ${accountNumber}

*LANGKAH SELANJUTNYA:*
1. Login ke dashboard dengan email & password di atas
2. Lengkapi profil TikTok Anda (jika ada)
3. Mulai membagikan produk dan dapatkan komisi! 💰

Butuh bantuan? Hubungi tim support kami.

Terima kasih telah bergabung! 🙏
`.trim();

  return sendFonntMessage(phoneNumber, message);
};

/**
 * Test Fonnte connection
 */
export const testFontneConnection = async (phoneNumber = '6289xxx1234') => {
  const message = `*Test Pesan* - Jika Anda menerima pesan ini, koneksi Fonnte sudah bekerja dengan baik! ✓`;
  return sendFonntMessage(phoneNumber, message);
};

/**
 * Send invoice notification to customer with approval link
 * @param {string} phone - Customer phone number
 * @param {string} orderNumber - Order number
 * @param {string} customerName - Customer name
 * @param {number} subtotal - Product subtotal
 * @param {number} shippingCost - Shipping cost
 * @param {string} courierName - Courier name (e.g., JNE, Tiki)
 * @returns {Promise}
 */
export const sendInvoiceNotification = async (
  phone,
  orderNumber,
  customerName,
  subtotal,
  shippingCost,
  courierName = 'Pengiriman'
) => {
  const total = subtotal + shippingCost;

  let message = `*Pesanan Dikonfirmasi! ✅*\n\n`;
  message += `Halo ${customerName},\n\n`;
  message += `Pesanan Anda nomor *${orderNumber}* telah dikonfirmasi.\n\n`;
  message += `*RINCIAN BIAYA:*\n`;
  message += `Subtotal: Rp${subtotal.toLocaleString('id-ID')}\n`;
  message += `Ongkos Kirim (${courierName}): Rp${shippingCost.toLocaleString('id-ID')}\n`;
  message += `*Total: Rp${total.toLocaleString('id-ID')}*\n\n`;
  message += `Terima kasih telah berbelanja! 🙏`;

  return sendFonntMessage(phone, message);
};
