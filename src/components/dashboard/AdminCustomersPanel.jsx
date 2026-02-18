import React, { useState } from 'react';
import { Search, Edit2, Trash, Plus, Phone, MapPin, X } from 'lucide-react';

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
        <h2 className="text-xl font-bold text-white">
          Daftar Pelanggan ({customers.length})
        </h2>
        <button
          onClick={onAddCustomer}
          className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama, nomor WA, atau alamat..."
          className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none transition"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Memuat data pelanggan...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? `Tidak ada pelanggan yang cocok dengan "${searchTerm}"` : 'Belum ada data pelanggan'}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="bg-black/30 border border-white/10 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-3 hover:border-[#D4AF37]/30 transition"
            >
              {/* Customer Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-bold text-white text-lg truncate">{customer.nama}</p>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Phone size={14} className="text-[#D4AF37] shrink-0" />
                  <span className="font-mono">{customer.nomor_wa}</span>
                </div>
                {customer.alamat && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{customer.alamat}</span>
                  </div>
                )}
                <p className="text-xs text-gray-600">
                  Ditambahkan: {new Date(customer.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {deletingId === customer.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-300">Hapus?</span>
                    <button
                      onClick={() => handleConfirmDelete(customer.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition disabled:opacity-50"
                    >
                      Ya
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded hover:bg-gray-700 transition"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onEditCustomer(customer)}
                      className="px-3 py-1.5 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/30 transition flex items-center gap-1"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(customer.id)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-300 text-xs font-bold rounded hover:bg-red-500/30 transition flex items-center gap-1"
                    >
                      <Trash size={14} /> Hapus
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
