import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal konfirmasi ongkir untuk order
 */
export default function ShippingModal({
  isOpen,
  onClose,
  selectedOrder,
  setSelectedOrder,
  couriername,
  setCourierName,
  couriersWithBill,
  billOrder,
  setBillOrder,
  shippingCost,
  errorMsg,
  loading,
  onConfirm,
  formatRupiah
}) {
  if (!isOpen || !selectedOrder) return null;

  const handleClose = () => {
    setBillOrder('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[#D4AF37]">Konfirmasi Ongkir</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Order Details */}
        <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-2">
          <p className="font-bold text-white">{selectedOrder.order_number}</p>
          <p className="text-sm text-gray-400">{selectedOrder.users?.nama || selectedOrder.nama_pembeli} • {selectedOrder.users?.nomor_wa || selectedOrder.nomor_wa}</p>
          <div className="mt-3 pt-3 border-t border-white/20">
            {selectedOrder.order_items?.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 mb-2">
                <span className="flex-1 text-sm text-gray-300">{item.products?.name} × {item.qty}</span>
                <input
                  type="number"
                  className="w-24 px-2 py-1 bg-black/40 border border-[#D4AF37]/50 rounded text-white text-sm"
                  value={item.harga_satuan}
                  min={0}
                  onChange={e => {
                    const newOrder = { ...selectedOrder };
                    newOrder.order_items = [...newOrder.order_items];
                    newOrder.order_items[idx] = { ...newOrder.order_items[idx], harga_satuan: parseInt(e.target.value) || 0 };
                    newOrder.total_produk = newOrder.order_items.reduce((sum, i) => sum + (i.qty * i.harga_satuan), 0);
                    setSelectedOrder(newOrder);
                  }}
                />
                <span className="text-xs text-[#D4AF37] font-bold ml-2">= {formatRupiah(item.qty * item.harga_satuan)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-sm text-gray-400">Subtotal:</p>
            <p className="text-lg font-bold text-[#D4AF37]">{formatRupiah(selectedOrder.total_produk)}</p>
          </div>
        </div>

        {/* Shipping Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-[#D4AF37] mb-2">Ekspedisi</label>
            <select
              value={couriername}
              onChange={(e) => setCourierName(e.target.value)}
              className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
            >
              <option value="J&T">J&T</option>
              <option value="WAHANA">WAHANA</option>
              <option value="ID Express">ID Express</option>
              <option value="Indah Cargo">Indah Cargo</option>
              <option value="JNE">JNE</option>
              <option value="Tiki">Tiki</option>
              <option value="Pos Indonesia">Pos Indonesia</option>
              <option value="Grab Express">Grab Express</option>
              <option value="GoSend">GoSend</option>
            </select>
          </div>

          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-3">
            <p className="text-xs text-gray-300 mb-2">Total Pembayaran:</p>
            <p className="text-2xl font-bold text-[#F4D03F]">
              {formatRupiah((selectedOrder.total_produk || 0) + (parseInt(shippingCost) || 0))}
            </p>
          </div>
        </div>

        {/* Error Messages */}
        {errorMsg && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : '✓ Simpan & Buat Invoice'}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
