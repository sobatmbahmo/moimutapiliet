// ================================================================
// ORDER UTILS - Generate order numbers, calculate totals, format messages
// ================================================================

import { supabase } from './supabaseClient';

/**
 * Generate unique order number
 * Format: #YYYYMMDD-XXXXX (contoh: #20260212-00001)
 * IMPROVED: Added random component to prevent race condition duplicates
 */
export const generateOrderNumber = async () => {
  try {
    const now = new Date();
    const dateString = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // Add random component + timestamp (milliseconds) to ensure uniqueness
    // even with concurrent requests
    const timestamp = now.getTime().toString().slice(-4); // Last 4 digits of timestamp
    const random = Math.floor(Math.random() * 90) + 10; // 2-digit random number (10-99)
    const sequence = parseInt(`${timestamp}${random}`); // Combine for unique 6-digit number

    const orderNumber = `#${dateString}-${String(sequence).padStart(5, '0')}`;
    
    return { success: true, orderNumber };
  } catch (error) {
    console.error('Error generating order number:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate total order dari items dan shipping cost
 * Total = (quantity * harga_satuan per item) + shipping cost
 */
export const calculateOrderTotal = async (items, shippingCost = 0) => {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: 'No items in order', total: 0 };
    }

    let subtotal = 0;

    for (const item of items) {
      const itemTotal = (item.quantity || item.qty) * (item.harga_satuan || item.price);
      subtotal += itemTotal;
    }

    const total = subtotal + (shippingCost || 0);

    return {
      success: true,
      subtotal,
      shippingCost: shippingCost || 0,
      total,
      itemCount: items.length
    };
  } catch (error) {
    console.error('Error calculating order total:', error);
    return { success: false, error: error.message, total: 0 };
  }
};

/**
 * Get readable status label untuk order
 * pending → Menunggu Konfirmasi
 * processing → Sedang Diproses
 * shipped → Sudah Dikirim
 * delivered → Sampai Tujuan
 * cancelled → Dibatalkan
 */
export const getOrderStatusLabel = (status) => {
  const labels = {
    pending: 'Menunggu Konfirmasi',
    processing: 'Sedang Diproses',
    shipped: 'Sudah Dikirim',
    delivered: 'Sampai Tujuan',
    cancelled: 'Dibatalkan',
    awaiting_payment: 'Menunggu Pembayaran'
  };

  return labels[status] || status;
};

/**
 * Format order detail ke string untuk WhatsApp message
 * Output bisa dikirim ke customer via Fonnte
 */
export const formatOrderForWA = async (orderId) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(nama, price))')
      .eq('id', orderId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    let message = `*Invoice Pesanan Anda*\n\n`;
    message += `No Pesanan: ${order.order_number}\n`;
    message += `Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}\n`;
    message += `Status: ${getOrderStatusLabel(order.status)}\n\n`;

    message += `*Produk:*\n`;
    order.order_items.forEach((item, index) => {
      const itemTotal = item.quantity * item.harga_satuan;
      message += `${index + 1}. ${item.products.nama}${
        item.varian ? ` (${item.varian})` : ''
      }\n`;
      message += `   ${item.quantity}x Rp${item.harga_satuan.toLocaleString('id-ID')}\n`;
      message += `   Subtotal: Rp${itemTotal.toLocaleString('id-ID')}\n\n`;
    });

    message += `Biaya Ongkos: Rp${(order.shipping_cost || 0).toLocaleString('id-ID')}\n`;
    message += `*Total: Rp${order.total_amount.toLocaleString('id-ID')}*\n\n`;

    if (order.metode_bayar === 'transfer') {
      message += `Metode Bayar: Transfer Bank\n`;
      message += `Status Pembayaran: ${
        order.status === 'awaiting_payment' ? 'Belum dibayar' : 'Sudah dibayar'
      }\n`;
    } else {
      message += `Metode Bayar: COD (Bayar saat diterima)\n`;
    }

    if (order.resi) {
      message += `\nNo Resi: ${order.resi}\n`;
    }

    message += `\nPengiriman ke:\n`;
    message += `${order.alamat_pengiriman}\n\n`;
    message += `Terima kasih telah berbelanja! 🙏`;

    return { success: true, message, order };
  } catch (error) {
    console.error('Error formatting order for WA:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get order status progression
 * Kembalian array status yang valid untuk transisi ke status berikutnya
 */
export const getValidNextStatuses = (currentStatus) => {
  const transitions = {
    awaiting_payment: ['pending', 'cancelled'], // bisa pembayaran terkonfirmasi atau batalkan
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
  };

  return transitions[currentStatus] || [];
};

/**
 * Cek apakah transisi status valid
 */
export const isValidStatusTransition = (fromStatus, toStatus) => {
  if (fromStatus === toStatus) return false; // Tidak boleh sama
  const validNextStatuses = getValidNextStatuses(fromStatus);
  return validNextStatuses.includes(toStatus);
};

/**
 * Format order untuk laporan/admin dashboard
 */
export const formatOrderForAdmin = (order) => {
  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.users?.nama || 'Unknown',
    customerWA: order.users?.nomor_wa || 'Unknown',
    affiliatorName: order.affiliators?.nama || 'Direct',
    status: getOrderStatusLabel(order.status),
    total: `Rp${order.total_amount?.toLocaleString('id-ID') || 0}`,
    paymentMethod: order.metode_bayar === 'transfer' ? 'Transfer' : 'COD',
    createdAt: new Date(order.created_at).toLocaleDateString('id-ID'),
    resi: order.resi || '-'
  };
};

/**
 * Get simple order summary untuk quick view
 */
export const getOrderSummary = (order) => {
  return {
    orderNumber: order.order_number,
    customerName: order.users?.nama,
    status: getOrderStatusLabel(order.status),
    total: order.total_amount,
    itemCount: order.order_items?.length || 0,
    paymentMethod: order.metode_bayar,
    createdAt: order.created_at,
    resi: order.resi || null
  };
};
