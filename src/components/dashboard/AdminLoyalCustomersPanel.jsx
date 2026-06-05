import React, { useState } from 'react';
import { Search, Phone, MapPin, Award, TrendingUp, Gift } from 'lucide-react';

export default function AdminLoyalCustomersPanel({
  customers,
  orders,
  loading
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('orders'); // 'orders' | 'spent'

  // Kumpulkan order yang valid (terkirim/selesai)
  const validOrders = orders.filter(o => o.status === 'delivered' || o.status === 'COMPLETED');

  // Kelompokkan berdasarkan nomor WA
  const customerMap = {};
  validOrders.forEach(o => {
    const wa = o.users?.nomor_wa || o.nomor_wa;
    if (!wa) return; // Lewati jika tidak ada nomor WA
    
    if (!customerMap[wa]) {
      customerMap[wa] = {
        id: wa, // Gunakan WA sebagai ID unik
        nomor_wa: wa,
        nama: o.users?.nama || o.nama_pembeli || 'Pelanggan',
        alamat: o.alamat || '',
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: o.created_at
      };
    } else {
      // Perbarui nama/alamat jika sebelumnya kosong atau Pelanggan
      const betterName = o.users?.nama || o.nama_pembeli;
      if ((!customerMap[wa].nama || customerMap[wa].nama === 'Pelanggan') && betterName) {
        customerMap[wa].nama = betterName;
      }
      if (!customerMap[wa].alamat && o.alamat) {
        customerMap[wa].alamat = o.alamat;
      }
    }
    
    customerMap[wa].orderCount += 1;
    customerMap[wa].totalSpent += (Number(o.total_bayar) || 0);
    
    // Update last order date
    if (new Date(o.created_at) > new Date(customerMap[wa].lastOrderDate)) {
      customerMap[wa].lastOrderDate = o.created_at;
    }
  });

  const loyalCustomers = Object.values(customerMap)
    .filter(c => c.orderCount >= 1) // Tampilkan walau baru 1x order sukses
    .sort((a, b) => {
      if (sortBy === 'spent') {
        return b.totalSpent - a.totalSpent || b.orderCount - a.orderCount;
      }
      return b.orderCount - a.orderCount || b.totalSpent - a.totalSpent;
    });

  const filtered = loyalCustomers.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.nama || '').toLowerCase().includes(q) ||
      (c.nomor_wa || '').toLowerCase().includes(q)
    );
  });

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(number);
  };

  const handleSendBonusMsg = (phone, name) => {
    const msg = `Halo Kak ${name}! Terima kasih banyak sudah menjadi pelanggan setia Moimuta. Sebagai apresiasi, kami ingin memberikan bonus khusus untuk Kakak...`;
    const url = `https://wa.me/${phone.replace(/^0/, '62')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Award className="text-[#D4AF37]" size={20} />
            Data Pelanggan Setia (Loyal)
          </h2>
          <p className="text-xs text-gray-500">
            Ada {loyalCustomers.length} pelanggan yang sudah repeat order.
          </p>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Cari nama atau nomor WA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              Tutup
            </button>
          )}
        </div>
        
        <div className="flex bg-black/50 border border-white/10 rounded-lg p-1 shrink-0 overflow-hidden">
          <button
            onClick={() => setSortBy('orders')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              sortBy === 'orders' ? 'bg-[#D4AF37] text-black shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Terbanyak Order
          </button>
          <button
            onClick={() => setSortBy('spent')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              sortBy === 'spent' ? 'bg-[#D4AF37] text-black shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Terbesar Belanja
          </button>
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Award size={32} className="mx-auto mb-2 animate-pulse text-[#D4AF37]" />
          <p className="text-sm">Menganalisa data loyalitas pelanggan...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-xl border border-white/10">
          <Award size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">
            {searchTerm ? `Tidak ada pelanggan loyal yang cocok dengan "${searchTerm}"` : 'Belum ada data pelanggan yang repeat order.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((customer, index) => (
            <div
              key={customer.id}
              className="bg-gradient-to-br from-black/50 to-black/30 border border-[#D4AF37]/30 rounded-xl p-3 sm:p-4 hover:border-[#D4AF37] transition relative overflow-hidden group"
            >
              {/* Rank Medal */}
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-gradient-to-br from-[#D4AF37]/20 to-transparent rounded-full flex items-center justify-center pointer-events-none">
                <span className="text-[#D4AF37] font-black text-xl opacity-20 -ml-4 mt-4">#{index + 1}</span>
              </div>

              {/* Customer Info */}
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="min-w-0 flex-1 space-y-1 z-10">
                  <p className="font-bold text-white text-base sm:text-lg truncate">{customer.nama}</p>
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
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3 bg-black/40 rounded-lg p-2.5 border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Order</span>
                  <div className="flex items-center gap-1 text-[#D4AF37]">
                    <TrendingUp size={14} />
                    <span className="font-bold">{customer.orderCount} kali</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Belanja</span>
                  <div className="flex items-center gap-1 text-green-400">
                    <span className="font-bold">{formatRupiah(customer.totalSpent)}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => handleSendBonusMsg(customer.nomor_wa, customer.nama)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-sm font-bold transition"
              >
                <Gift size={16} />
                Kirim Promo / Bonus
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
