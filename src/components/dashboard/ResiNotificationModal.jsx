import React from 'react';
import { X, Send } from 'lucide-react';

/**
 * Modal untuk kirim notifikasi resi ke customer
 */
export default function ResiNotificationModal({
  isOpen,
  onClose,
  selectedOrder,
  resiNumber,
  setResiNumber,
  loading,
  errorMsg,
  onSend
}) {
  if (!isOpen || !selectedOrder) return null;

  const handleClose = () => {
    setResiNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[#D4AF37]">Kirim Notifikasi Resi</h2>
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
          <p className="text-sm text-gray-400">
            {selectedOrder.users?.nama || selectedOrder.nama_pembeli} • 
            {selectedOrder.users?.nomor_wa || selectedOrder.nomor_wa}
          </p>
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-sm font-bold text-[#D4AF37]">Kurir: {selectedOrder.courier_name}</p>
          </div>
        </div>

        {/* Resi Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-[#D4AF37] mb-2">Nomor Resi <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="Contoh: 1234567890AB"
              value={resiNumber}
              onChange={(e) => setResiNumber(e.target.value)}
              autoFocus
              className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Masukkan nomor resi dari sistem kurir
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
            onClick={onSend}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={18} /> {loading ? 'Mengirim...' : 'Kirim Notifikasi'}
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
