import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Check, X, MapPin, Truck, DollarSign, Calendar } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

export default function InvoicePage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*, users(*), order_items(*, products(*))')
        .eq('order_number', orderNumber)
        .single();

      if (queryError) throw new Error('Pesanan tidak ditemukan');
      if (!data) throw new Error('Pesanan tidak ada');

      setOrder(data);
      setApproved(data.status === 'WAITING_PACKING' || data.status === 'PROCESSING');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async () => {
    try {
      setApproving(true);
      
      // Update order status to WAITING_PACKING
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'WAITING_PACKING',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setOrder(data);
      setApproved(true);

      // Show success message
      setTimeout(() => {
        alert('✅ Pembayaran dikonfirmasi! Pesanan Anda sedang disiapkan untuk pengiriman.');
      }, 500);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Memuat invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <X size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-300 font-bold mb-4">{error || 'Pesanan tidak ditemukan'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#D4AF37] mb-2">INVOICE</h1>
          <p className="text-gray-400">Pesanan Anda</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-[#022c22] border-2 border-[#D4AF37] rounded-2xl p-8 space-y-6 shadow-2xl">
          
          {/* Order Number & Status */}
          <div className="flex justify-between items-start pb-4 border-b border-[#D4AF37]/30">
            <div>
              <p className="text-gray-400 text-sm mb-1">NOMOR PESANAN</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{order.order_number}</p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-4 py-2 rounded-lg font-bold text-sm ${
                approved
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-orange-500/20 text-orange-300'
              }`}>
                {approved ? '✓ DIKONFIRMASI' : 'MENUNGGU KONFIRMASI'}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-black/30 rounded-xl p-4 space-y-3">
            <p className="text-gray-400 text-sm">INFORMASI PELANGGAN</p>
            <div className="space-y-2">
              <p className="text-white">
                <span className="text-gray-400">Nama: </span>
                <span className="font-bold">{order.users?.nama}</span>
              </p>
              <p className="text-white flex items-center gap-2">
                <span className="text-gray-400">No WA: </span>
                <span className="font-bold">{order.users?.nomor_wa}</span>
              </p>
              <p className="text-white flex items-start gap-2">
                <MapPin size={16} className="text-[#D4AF37] mt-1 shrink-0" />
                <span className="text-sm">{order.alamat}</span>
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">BARANG PESANAN</p>
            <div className="space-y-2">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                  <div>
                    <p className="text-white font-bold">{item.products?.name}</p>
                    <p className="text-gray-400 text-sm">× {item.qty}</p>
                  </div>
                  <p className="font-bold text-[#D4AF37]">
                    {formatRupiah(item.qty * item.harga_satuan)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Cost Summary */}
          <div className="bg-black/30 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <p className="text-gray-400">Subtotal Barang:</p>
              <p className="text-white font-bold">{formatRupiah(order.total_produk)}</p>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-[#D4AF37]" />
                <p className="text-gray-400">{order.shipping_courier || 'Pengiriman'}</p>
              </div>
              <p className="text-white font-bold">{formatRupiah(order.shipping_cost || 0)}</p>
            </div>
            <div className="flex justify-between pt-3">
              <p className="text-white font-bold text-lg">TOTAL PEMBAYARAN:</p>
              <p className="text-3xl font-bold text-[#F4D03F]">{formatRupiah(order.total_bayar)}</p>
            </div>
          </div>

          {/* Payment Instructions */}
          {!approved && (
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
              <p className="text-[#F4D03F] font-bold text-sm">INSTRUKSI PEMBAYARAN</p>
              {order.metode_bayar === 'transfer' ? (
                <div className="text-sm text-gray-300 space-y-2">
                  <p>Silakan transfer sesuai total di atas ke rekening yang telah diberikan oleh admin.</p>
                  <p>Setelah melakukan transfer, silakan konfirmasi dengan tombol di bawah.</p>
                </div>
              ) : (
                <div className="text-sm text-gray-300 space-y-2">
                  <p>Metode pembayaran: <span className="font-bold">COD (Bayar saat diterima)</span></p>
                  <p>Silakan konfirmasi pesanan ini untuk melanjutkan proses packing.</p>
                </div>
              )}
            </div>
          )}

          {/* Approval Button */}
          {!approved ? (
            <div className="space-y-3">
              <button
                onClick={handleApprovePayment}
                disabled={approving}
                className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-[#D4AF37]/50 transition-all disabled:opacity-50"
              >
                {approving ? '⏳ Memproses...' : '✓ SETUJU & LANJUTKAN'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Dengan mengklik tombol ini, Anda menyetujui rincian pesanan dan biaya pengiriman.
              </p>
            </div>
          ) : (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-green-300 font-bold flex items-center justify-center gap-2">
                <Check size={20} /> Pesanan dikonfirmasi! Sedang diproses.
              </p>
              <p className="text-gray-400 text-sm mt-2">Admin akan menghubungi Anda segera.</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t border-white/10">
            <p>Tanggal Pesanan: {new Date(order.created_at).toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="text-[#D4AF37] hover:text-[#F4D03F] transition px-6 py-2 hover:bg-white/5 rounded-lg"
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
