import React, { useState } from 'react';
import { Search, Edit2, Trash, Plus, Phone, MapPin, X, Users } from 'lucide-react';

export default function AdminCustomersPanel({
  customers,
  loading,
  onEditCustomer,
  onDeleteCustomer,
  onAddCustomer
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Filter customers by search
  const filtered = customers.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.nama || '').toLowerCase().includes(q) ||
      (c.nomor_wa || '').toLowerCase().includes(q) ||
      (c.alamat || '').toLowerCase().includes(q)
    );
  });

  const handleConfirmDelete = (customerId) => {
    onDeleteCustomer(customerId);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">Daftar Pelanggan</h2>
          <p className="text-xs text-gray-500">{customers.length} pelanggan terdaftar</p>
        </div>
        <button
          onClick={onAddCustomer}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:bg-[#F4D03F] transition w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Tambah Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama, nomor WA, atau alamat..."
          className="w-full pl-10 pr-10 py-2.5 bg-black/40 border border-white/15 rounded-xl text-white text-sm placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none transition"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={32} className="mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Memuat data pelanggan...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-xl border border-white/10">
          <Users size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">
            {searchTerm ? `Tidak ada pelanggan yang cocok dengan "${searchTerm}"` : 'Belum ada data pelanggan'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="bg-black/30 border border-white/10 rounded-xl p-3 sm:p-4 hover:border-[#D4AF37]/30 transition"
            >
              {/* Customer Info */}
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold text-white text-sm sm:text-base truncate">{customer.nama}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Phone size={12} className="text-[#D4AF37] shrink-0" />
                    <span className="font-mono">{customer.nomor_wa}</span>
                  </div>
                  {customer.alamat && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-500">
                      <MapPin size={12} className="text-[#D4AF37] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{customer.alamat}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-600 shrink-0">
                  {new Date(customer.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                {deletingId === customer.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xs text-red-300 flex-1">Yakin hapus?</span>
                    <button
                      onClick={() => handleConfirmDelete(customer.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                      Ya
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onEditCustomer(customer)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded-lg hover:bg-[#D4AF37]/30 transition"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(customer.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/15 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/25 transition"
                    >
                      <Trash size={13} /> Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
