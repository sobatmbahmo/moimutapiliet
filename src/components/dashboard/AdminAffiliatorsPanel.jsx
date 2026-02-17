import React from 'react';
import { Check, Edit, Trash, Send } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

export default function AdminAffiliatorsPanel({
  affiliators,
  loading,
  handleApproveAffiliator,
  handleEditAffiliator,
  handleDeleteAffiliator,
  handleResendAffiliatorNotification
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Daftar Mitra ({affiliators.length})</h3>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid gap-4">
          {affiliators.map(a => (
            <div key={a.id} className="bg-black/30 border border-white/10 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="font-bold text-white text-lg">{a.nama}</p>
                  <p className="text-sm text-gray-400">{a.email}</p>
                  <p className="text-sm text-gray-400">{a.nomor_wa}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#D4AF37] font-bold text-lg">{formatRupiah(a.current_balance || 0)}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                    a.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {a.status === 'active' ? '✅ AKTIF' : '⏳ PENDING'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {a.status === 'pending' && (
                  <button
                    onClick={() => handleApproveAffiliator(a.id, a.nama)}
                    className="flex-1 px-3 py-2 bg-green-500/20 text-green-300 text-xs font-bold rounded hover:bg-green-500/40 transition"
                  >
                    <Check size={14} className="inline mr-1" /> Setujui
                  </button>
                )}
                <button
                  onClick={() => handleEditAffiliator(a)}
                  className="flex-1 px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/40 transition"
                >
                  <Edit size={14} className="inline mr-1" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteAffiliator(a.id, a.nama)}
                  className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 text-xs font-bold rounded hover:bg-red-500/40 transition"
                >
                  <Trash size={14} className="inline mr-1" /> Hapus
                </button>
                <button
                  onClick={() => handleResendAffiliatorNotification(a)}
                  className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded hover:bg-blue-500/40 transition"
                  disabled={loading}
                >
                  <Send size={14} className="inline mr-1" /> Kirim Ulang Notifikasi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
