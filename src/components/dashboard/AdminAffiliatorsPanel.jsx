import React from 'react';
import { Check, Edit, Trash, Send, Users, Phone, Mail } from 'lucide-react';

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
  const activeCount = affiliators.filter(a => a.status === 'active').length;
  const pendingCount = affiliators.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Daftar Mitra</h3>
          <p className="text-xs text-gray-500">
            {affiliators.length} mitra &middot; {activeCount} aktif &middot; {pendingCount} pending
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={32} className="mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Loading...</p>
        </div>
      ) : affiliators.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-xl border border-white/10">
          <Users size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">Belum ada mitra terdaftar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {affiliators.map(a => (
            <div key={a.id} className="bg-black/30 border border-white/10 rounded-xl p-3 sm:p-4 hover:border-white/20 transition">
              {/* Mitra Info Header */}
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-sm sm:text-lg truncate">{a.nama}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                    <Mail size={12} className="shrink-0 text-gray-500" />
                    <span className="truncate">{a.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <Phone size={12} className="shrink-0 text-gray-500" />
                    <span className="font-mono">{a.nomor_wa}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[#D4AF37] font-bold text-sm sm:text-lg">{formatRupiah(a.current_balance || 0)}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold mt-1 ${
                    a.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {a.status === 'active' ? 'AKTIF' : 'PENDING'}
                  </span>
                </div>
              </div>

              {/* Action Buttons - responsive wrap */}
              <div className="grid grid-cols-2 sm:flex gap-2">
                {a.status === 'pending' && (
                  <button
                    onClick={() => handleApproveAffiliator(a.id, a.nama)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/20 text-green-300 text-xs font-bold rounded-lg hover:bg-green-500/40 transition"
                  >
                    <Check size={14} /> Setujui
                  </button>
                )}
                <button
                  onClick={() => handleEditAffiliator(a)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded-lg hover:bg-[#D4AF37]/40 transition"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteAffiliator(a.id, a.nama)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-300 text-xs font-bold rounded-lg hover:bg-red-500/40 transition"
                >
                  <Trash size={14} /> Hapus
                </button>
                <button
                  onClick={() => handleResendAffiliatorNotification(a)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-500/40 transition"
                  disabled={loading}
                >
                  <Send size={14} /> Notifikasi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
