import React from 'react';
import { Edit, Trash, Users, Phone, Hash, CreditCard } from 'lucide-react';

export default function AdminAffiliatorsPanel({
  affiliators,
  loading,
  handleEditAffiliator,
  handleDeleteAffiliator
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Daftar Mitra (Otomatis Aktif)</h3>
          <p className="text-xs text-gray-500">
            {affiliators.length} mitra terdaftar
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
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-sm sm:text-lg truncate">{a.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                    <Hash size={12} className="shrink-0 text-[#D4AF37]" />
                    <span className="font-bold text-[#D4AF37]">{a.ref_code}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                    <Phone size={12} className="shrink-0 text-gray-500" />
                    <span className="font-mono">{a.whatsapp_number}</span>
                  </div>
                  {a.bank_info && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-400 mt-1">
                      <CreditCard size={12} className="shrink-0 text-gray-500 mt-0.5" />
                      <span className="line-clamp-2">{a.bank_info}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Earnings Info */}
              <div className="bg-black/50 border border-white/5 rounded-lg p-3 mb-3 text-xs flex justify-between">
                <div className="text-center flex-1 border-r border-white/10">
                  <p className="text-gray-500 mb-1">Tertunda</p>
                  <p className="font-bold text-yellow-500">Rp {(a.total_pending || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="text-center flex-1 border-r border-white/10">
                  <p className="text-gray-500 mb-1">Bisa Cair</p>
                  <p className="font-bold text-green-500">Rp {(a.total_cleared || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-gray-500 mb-1">Dibayar</p>
                  <p className="font-bold text-[#D4AF37]">Rp {(a.total_paid || 0).toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteAffiliator(a.id, a.name)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-300 text-xs font-bold rounded-lg hover:bg-red-500/40 transition"
                >
                  <Trash size={14} /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
