import React, { useState } from 'react';
import { DollarSign, Check, Truck, Printer, Trash, Plus, X, Clock, Package, Send, CheckCircle, Search, ArrowDownUp } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua', icon: <Package size={14} />, color: 'gray' },
  { key: 'pending', label: 'Menunggu', icon: <Clock size={14} />, color: 'yellow' },
  { key: 'process', label: 'Proses', icon: <DollarSign size={14} />, color: 'blue' },
  { key: 'shipped', label: 'Dikirim', icon: <Truck size={14} />, color: 'purple' },
  { key: 'delivered', label: 'Terkirim', icon: <CheckCircle size={14} />, color: 'green' },
];

const colorMap = {
  yellow: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', text: 'text-yellow-300', dot: 'bg-yellow-500', activeBg: 'bg-yellow-500/25' },
  blue: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-300', dot: 'bg-blue-500', activeBg: 'bg-blue-500/25' },
  purple: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-300', dot: 'bg-purple-500', activeBg: 'bg-purple-500/25' },
  green: { bg: 'bg-green-500/15', border: 'border-green-500/40', text: 'text-green-300', dot: 'bg-green-500', activeBg: 'bg-green-500/25' },
  gray: { bg: 'bg-white/5', border: 'border-white/20', text: 'text-gray-300', dot: 'bg-gray-500', activeBg: 'bg-white/10' },
};

export default function AdminOrdersPanel({
  orders,
  loading,
  deletingOrderId,
  editingResi,
  resiNumber,
  couriername,
  setEditingResi,
  setResiNumber,
  setCourierName,
  setShowOfflineOrderForm,
  handleOpenShippingModal,
  handleConfirmPayment,
  handleOpenPrintResiModal,
  handleInputResi,
  handleConfirmDelivery,
  handleDeleteOrder
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSort, setDateSort] = useState('newest'); // 'newest' | 'oldest'
  const [skipNotifMap, setSkipNotifMap] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Categorise orders
  const pendingOrders = orders.filter(o => o.status === 'WAITING_CONFIRMATION');
  const processedOrders = orders.filter(o => ['WAITING_PAYMENT', 'PAID', 'processing'].includes(o.status));
  const shippedOrders = orders.filter(o => ['shipped', 'SHIPPED', 'allocated', 'picking_up', 'picked', 'dropping_off', 'inTransit', 'on_hold', 'returned', 'rejected'].includes(o.status));
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'COMPLETED');

  const counts = {
    all: orders.length,
    pending: pendingOrders.length,
    process: processedOrders.length,
    shipped: shippedOrders.length,
    delivered: deliveredOrders.length
  };

  // Filter active orders based on status
  let filteredOrders =
    statusFilter === 'pending' ? pendingOrders :
    statusFilter === 'process' ? processedOrders :
    statusFilter === 'shipped' ? shippedOrders :
    statusFilter === 'delivered' ? deliveredOrders :
    orders;

  // Apply search
  if (searchQuery.trim()) {
    const lowerQuery = searchQuery.toLowerCase();
    filteredOrders = filteredOrders.filter(o => 
      o.order_number?.toLowerCase().includes(lowerQuery) ||
      (o.users?.nama || o.nama_pembeli)?.toLowerCase().includes(lowerQuery) ||
      (o.users?.nomor_wa || o.nomor_wa)?.toLowerCase().includes(lowerQuery)
    );
  }

  // Apply date range filter
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filteredOrders = filteredOrders.filter(o => new Date(o.created_at) <= end);
  }

  // Apply date sort
  filteredOrders.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Status label & badge
  const getStatusInfo = (status) => {
    switch (status) {
      case 'WAITING_CONFIRMATION': return { label: 'Menunggu Konfirmasi', color: 'yellow' };
      case 'WAITING_PAYMENT': return { label: 'Menunggu Bayar', color: 'orange' };
      case 'PAID': return { label: 'Sudah Dibayar', color: 'emerald' };
      case 'processing': return { label: 'Dalam Proses', color: 'blue' };
      case 'shipped': case 'SHIPPED': return { label: 'Dalam Perjalanan', color: 'purple' };
      case 'allocated': return { label: 'Kurir Dipesan', color: 'purple' };
      case 'picking_up': return { label: 'Kurir Menuju Alamat', color: 'purple' };
      case 'picked': return { label: 'Paket Dibawa Kurir', color: 'purple' };
      case 'dropping_off': case 'inTransit': return { label: 'Paket Sedang Diantar', color: 'purple' };
      case 'on_hold': return { label: 'Pengiriman Tertunda', color: 'red' };
      case 'returned': return { label: 'Paket Diretur', color: 'red' };
      case 'rejected': return { label: 'Ditolak Kurir', color: 'red' };
      case 'delivered': case 'COMPLETED': return { label: 'Terkirim', color: 'green' };
      default: return { label: status, color: 'gray' };
    }
  };

  const renderOrderCard = (order) => {
    const statusInfo = getStatusInfo(order.status);
    const statusClasses = {
      yellow: 'bg-yellow-500/20 text-yellow-300',
      orange: 'bg-orange-500/20 text-orange-300',
      emerald: 'bg-emerald-500/20 text-emerald-300',
      blue: 'bg-blue-500/20 text-blue-300',
      purple: 'bg-purple-500/20 text-purple-300',
      green: 'bg-green-500/20 text-green-300',
      gray: 'bg-gray-500/20 text-gray-300',
    };

    return (
      <div key={order.id} className="bg-black/30 border border-white/10 rounded-xl p-3 sm:p-4 space-y-3 hover:border-white/20 transition relative overflow-hidden">
        {/* Optional Payment Method Watermark or Label */}
        
        {/* Header row */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              {order.metode_bayar === 'cod' ? (
                <span className="text-[#EAB308] font-black text-lg uppercase tracking-widest bg-[#EAB308]/10 px-2 py-0.5 rounded border border-[#EAB308]/30 inline-block">COD</span>
              ) : (order.metode_bayar === 'transfer' || order.metode_bayar === 'manual') ? (
                <span className="text-[#60A5FA] font-black text-lg uppercase tracking-widest bg-[#60A5FA]/10 px-2 py-0.5 rounded border border-[#60A5FA]/30 inline-block">TRANSFER</span>
              ) : null}
            </div>
            <p className="font-bold text-white text-sm sm:text-base truncate">{order.order_number}</p>
            <p className="text-xs sm:text-sm text-gray-400 truncate">
              {order.users?.nama || order.nama_pembeli}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{order.users?.nomor_wa || order.nomor_wa}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold ${statusClasses[statusInfo.color] || statusClasses.gray}`}>
              {statusInfo.label}
            </span>
            <div className="text-right mt-1">
              <p className="text-[10px] sm:text-[11px] text-[#EAEAEA]">
                {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#EAEAEA]">
                Pukul {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </p>
            </div>
          </div>
        </div>

        {/* Address - truncated on mobile */}
        <p className="text-xs text-gray-500 line-clamp-2 sm:line-clamp-none">{order.alamat}</p>

        {/* Items */}
        <div className="py-2 border-y border-white/10 space-y-1">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm text-gray-300">
              <span className="truncate flex-1 mr-2">
                {item.products?.name || 'Produk'} × {item.qty}
              </span>
              <span className="shrink-0 font-mono">{formatRupiah(item.qty * item.harga_satuan)}</span>
            </div>
          ))}
          {order.order_items?.some(item => item.varian) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {order.order_items.filter(i => i.varian).map(item => (
                <span key={item.id} className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded">{item.varian}</span>
              ))}
            </div>
          )}
          {order.resi && (
            <div className="flex justify-between items-center text-xs sm:text-sm text-blue-400 font-medium mt-1">
              <span>Resi:</span>
              <span className="font-mono bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                {order.resi} <Check size={12} className="text-blue-400" />
              </span>
            </div>
          )}
          {order.shipping_cost > 0 && (
            <div className="flex justify-between items-center text-xs sm:text-sm text-gray-400 mt-1">
              <span>Ongkir {order.courier_name ? `(${order.courier_name})` : ''}</span>
              <span className="font-mono">{formatRupiah(order.shipping_cost + (order.subsidi_ongkir || 0))}</span>
            </div>
          )}
          {order.subsidi_ongkir > 0 && (
            <div className="flex justify-between items-center text-xs sm:text-sm text-green-400 font-bold mt-1">
              <span>Subsidi Ongkir</span>
              <span className="font-mono">-{formatRupiah(order.subsidi_ongkir)}</span>
            </div>
          )}
          {order.metode_bayar === 'cod' && (
            <div className="flex justify-between items-center text-xs sm:text-sm text-gray-400 mt-1">
              <span>Biaya Layanan COD (5%)</span>
              <span className="font-mono">{formatRupiah(Math.round(order.total_produk * 0.05))}</span>
            </div>
          )}
        </div>

        {/* Total + Actions */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Total</p>
              <p className="font-bold text-[#D4AF37] text-sm sm:text-base">{formatRupiah(order.total_bayar)}</p>
            </div>
          </div>

          {/* Skip Notification Checkbox */}
          {['WAITING_PAYMENT', 'processing', 'shipped', 'SHIPPED'].includes(order.status) && (
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="checkbox" 
                id={`skip-notif-${order.id}`}
                checked={skipNotifMap[order.id] ?? (['shipped', 'SHIPPED', 'allocated', 'picking_up', 'picked', 'dropping_off', 'inTransit'].includes(order.status))}
                onChange={(e) => setSkipNotifMap(prev => ({ ...prev, [order.id]: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-black/40 text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <label htmlFor={`skip-notif-${order.id}`} className="text-xs text-gray-400 cursor-pointer">
                Jangan kirim Notifikasi WA
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {order.status === 'WAITING_CONFIRMATION' && (
              <button
                onClick={() => handleOpenShippingModal(order)}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500/20 text-orange-300 text-xs font-bold rounded-lg hover:bg-orange-500/30 transition"
              >
                <DollarSign size={14} /> Konfirmasi Ongkir
              </button>
            )}
            {order.status === 'WAITING_PAYMENT' && (
              <>
                <button
                  onClick={() => {
                    const phone = order.users?.nomor_wa || order.nomor_wa;
                    if (!phone) return alert('Nomor WA tidak ditemukan');
                    let formattedPhone = phone.replace(/\D/g, '');
                    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
                    
                    const message = `Halo Kak, apakah sudah dilakukan pembayaran? 😊\n\nJika sudah, mohon kesediaannya untuk mengirimkan bukti pembayaran di sini agar pesanan Kakak bisa segera kami proses.\n\nSebagai informasi, pemesanan akan dibatalkan oleh sistem secara otomatis setelah 48 jam jika tidak ada konfirmasi. Namun jangan khawatir, Kakak tetap bisa memesan ulang produknya nanti melalui aplikasi. Terima kasih banyak!`;
                    
                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded-lg hover:bg-[#D4AF37]/30 transition"
                >
                  <Send size={14} /> Konfirmasi Ulang
                </button>
                <button
                  onClick={() => handleConfirmPayment(order.id, skipNotifMap[order.id])}
                  disabled={loading}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-500/30 transition disabled:opacity-50"
                >
                  <Check size={14} /> Konfirmasi Bayar
                </button>
              </>
            )}
            {order.status === 'PAID' && (
              <button
                onClick={() => handleOpenPrintResiModal(order)}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-500/30 transition"
              >
                <Printer size={14} /> Print Resi
              </button>
            )}
            {order.status === 'processing' && (
              <>
                <button
                  onClick={() => setEditingResi(order.id)}
                  className="flex-1 px-3 py-2.5 bg-[#D4AF37]/20 text-[#D4AF37] font-bold rounded-lg text-sm hover:bg-[#D4AF37]/30 transition flex items-center justify-center gap-1.5"
                >
                  <Truck size={16} /> Input Resi
                </button>
              </>
            )}
            {(['shipped', 'SHIPPED', 'allocated', 'picking_up', 'picked', 'dropping_off', 'inTransit', 'on_hold'].includes(order.status)) && (
              <>
                <button
                  onClick={() => handleOpenPrintResiModal(order)}
                  className="flex-1 px-3 py-2.5 bg-purple-500/20 text-purple-300 font-bold rounded-lg text-sm hover:bg-purple-500/30 transition flex items-center justify-center gap-1.5"
                >
                  <Printer size={16} /> Print Ulang
                </button>
                <button
                  onClick={() => setEditingResi(order.id)}
                  className="flex-1 px-3 py-2.5 bg-[#1F2937] text-gray-300 font-bold rounded-lg text-sm hover:bg-[#374151] transition flex items-center justify-center gap-1.5"
                >
                  <Truck size={16} /> Edit Resi
                </button>
                <button
                  onClick={() => handleConfirmDelivery(order.id)}
                  className="flex-1 px-3 py-2.5 bg-green-500/20 text-green-300 font-bold rounded-lg text-sm hover:bg-green-500/30 transition flex items-center justify-center gap-1.5"
                >
                  <Check size={16} /> Terkirim
                </button>
              </>
            )}
            <button
              onClick={() => handleDeleteOrder(order.id, order.order_number)}
              disabled={deletingOrderId === order.id}
              className="flex items-center justify-center gap-1 px-2.5 py-2 bg-red-500/15 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/25 transition disabled:opacity-50"
              title="Hapus order"
            >
              {deletingOrderId === order.id ? '...' : <Trash size={14} />}
            </button>
          </div>
        </div>

        {/* Inline Resi Input */}
        {editingResi === order.id && (
          <div className="bg-black/40 border border-[#D4AF37]/30 rounded-lg p-3 space-y-2">
            <input
              type="text"
              placeholder="Nomor Resi"
              value={resiNumber}
              onChange={(e) => setResiNumber(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/40 border border-white/20 rounded-lg text-white text-sm focus:border-[#D4AF37] focus:outline-none"
            />
            <select
              value={couriername}
              onChange={(e) => setCourierName(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/40 border border-white/20 rounded-lg text-white text-sm focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="J&T">J&T</option>
              <option value="JNE">JNE</option>
              <option value="TIKI">TIKI</option>
              <option value="POS">POS Indonesia</option>
              <option value="ID Express">ID Express</option>
              <option value="Indah Cargo">Indah Cargo</option>
              <option value="Gojek">Gojek</option>
              <option value="Grab">Grab</option>
              <option value="KiriminAja">KiriminAja (COD)</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => handleInputResi(order.id, skipNotifMap[order.id] ?? (order.status === 'shipped' || order.status === 'SHIPPED'))}
                className="flex-1 px-3 py-2.5 bg-green-500 text-black font-bold rounded-lg text-sm hover:bg-green-600 transition flex items-center justify-center gap-1.5"
              >
                <Send size={16} /> Kirim
              </button>
              <button
                onClick={() => setEditingResi(null)}
                className="flex-1 px-3 py-2.5 bg-red-500/20 text-red-300 font-bold rounded-lg text-sm hover:bg-red-500/30 transition flex items-center justify-center gap-1.5"
              >
                <X size={14} /> Batal
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header + Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Manajemen Order</h3>
          <p className="text-xs text-gray-500">{orders.length} total order</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari order, nama, WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
            />
          </div>
          
          {/* Date Sort Dropdown */}
          <div className="relative">
            <select
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value)}
              className="w-full sm:w-auto pl-8 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-[#D4AF37] focus:outline-none appearance-none transition"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
            <ArrowDownUp className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          </div>

          <button
            onClick={() => setShowOfflineOrderForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:bg-[#F4D03F] transition justify-center"
          >
            <Plus size={16} /> Tambah Manual
          </button>
        </div>
      </div>

      {/* Summary Stat Cards - always visible overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { key: 'pending', label: 'Menunggu', count: counts.pending, icon: <Clock size={18} />, bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30', text: 'text-yellow-300', dot: 'bg-yellow-500' },
          { key: 'process', label: 'Proses', count: counts.process, icon: <DollarSign size={18} />, bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-300', dot: 'bg-blue-500' },
          { key: 'shipped', label: 'Dikirim', count: counts.shipped, icon: <Truck size={18} />, bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-300', dot: 'bg-purple-500' },
          { key: 'delivered', label: 'Terkirim', count: counts.delivered, icon: <CheckCircle size={18} />, bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30', text: 'text-green-300', dot: 'bg-green-500' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
            className={`relative bg-gradient-to-br ${s.bg} border ${s.border} rounded-xl p-3 sm:p-4 text-left transition-all hover:scale-[1.02] ${
              statusFilter === s.key ? 'ring-2 ring-white/20 scale-[1.02]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`${s.text} opacity-70`}>{s.icon}</span>
              <div className={`w-2 h-2 rounded-full ${s.dot} ${s.count > 0 ? 'animate-pulse' : 'opacity-30'}`} />
            </div>
            <p className="text-white font-bold text-xl sm:text-2xl">{s.count}</p>
            <p className={`${s.text} text-[10px] sm:text-xs font-medium`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Status Filter Pills - scrollable on mobile */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-1 -mx-1 px-1">
        {STATUS_FILTERS.map(f => {
          const c = colorMap[f.color];
          const isActive = statusFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? `${c.activeBg} ${c.border} ${c.text}`
                  : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f.icon}
              <span>{f.label}</span>
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive ? `${c.bg} ${c.text}` : 'bg-white/10 text-gray-500'
              }`}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 mb-4 bg-black/20 p-3 rounded-xl border border-white/5 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-gray-400 text-xs font-medium">Filter Tanggal:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-[#D4AF37] focus:outline-none"
          />
          <span className="text-gray-500 text-xs">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-[#D4AF37] focus:outline-none"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="px-2 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition flex items-center gap-1"
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Order Cards Grid - 1 col mobile, 2 col tablet, 3 col desktop */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-xl border border-white/10">
          <Package size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">Tidak ada order dalam kategori ini</p>
        </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredOrders.map((order) => (
              renderOrderCard(order)
            ))}
          </div>
      )}
    </div>
  );
}
