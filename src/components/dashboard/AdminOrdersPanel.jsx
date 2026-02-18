import React, { useState } from 'react';
import { DollarSign, Check, Truck, Printer, Trash, Plus, X, Clock, Package, Send, CheckCircle } from 'lucide-react';

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

  // Categorise orders
  const pendingOrders = orders.filter(o => o.status === 'WAITING_CONFIRMATION');
  const processedOrders = orders.filter(o => ['WAITING_PAYMENT', 'PAID', 'processing'].includes(o.status));
  const shippedOrders = orders.filter(o => o.status === 'shipped' || o.status === 'SHIPPED');
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'COMPLETED');

  const counts = {
    all: orders.length,
    pending: pendingOrders.length,
    process: processedOrders.length,
    shipped: shippedOrders.length,
    delivered: deliveredOrders.length
  };

  // Filter active orders
  const filteredOrders =
    statusFilter === 'pending' ? pendingOrders :
    statusFilter === 'process' ? processedOrders :
    statusFilter === 'shipped' ? shippedOrders :
    statusFilter === 'delivered' ? deliveredOrders :
    orders;

  // Status label & badge
  const getStatusInfo = (status) => {
    switch (status) {
      case 'WAITING_CONFIRMATION': return { label: 'Menunggu Konfirmasi', color: 'yellow' };
      case 'WAITING_PAYMENT': return { label: 'Menunggu Bayar', color: 'orange' };
      case 'PAID': return { label: 'Sudah Dibayar', color: 'emerald' };
      case 'processing': return { label: 'Dalam Proses', color: 'blue' };
      case 'shipped': case 'SHIPPED': return { label: 'Dalam Perjalanan', color: 'purple' };
      case 'delivered': case 'COMPLETED': return { label: 'Terkirim', color: 'green' };
      default: return { label: status, color: 'gray' };
    }
  };

  const OrderCard = ({ order }) => {
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
      <div className="bg-black/30 border border-white/10 rounded-xl p-3 sm:p-4 space-y-3 hover:border-white/20 transition">
        {/* Header row */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-sm sm:text-base truncate">{order.order_number}</p>
            <p className="text-xs sm:text-sm text-gray-400 truncate">
              {order.users?.nama || order.nama_pembeli}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{order.users?.nomor_wa || order.nomor_wa}</p>
          </div>
          <span className={`shrink-0 px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold ${statusClasses[statusInfo.color] || statusClasses.gray}`}>
            {statusInfo.label}
          </span>
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
        </div>

        {/* Total + Actions */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Total</p>
              <p className="font-bold text-[#D4AF37] text-sm sm:text-base">{formatRupiah(order.total_bayar)}</p>
            </div>
            <p className="text-[10px] text-gray-600">
              {new Date(order.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
            </p>
          </div>

          {/* Action Buttons - stacked on mobile */}
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
              <button
                onClick={() => handleConfirmPayment(order.id)}
                disabled={loading}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-500/30 transition disabled:opacity-50"
              >
                <Check size={14} /> Konfirmasi Bayar
              </button>
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
              <button
                onClick={() => setEditingResi(order.id)}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-500/30 transition"
              >
                <Truck size={14} /> Input Resi
              </button>
            )}
            {(order.status === 'shipped' || order.status === 'SHIPPED') && (
              <>
                <button
                  onClick={() => handleOpenPrintResiModal(order)}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-2 py-2 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-lg hover:bg-purple-500/30 transition"
                >
                  <Printer size={13} /> Print Ulang
                </button>
                <button
                  onClick={() => handleConfirmDelivery(order.id)}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-2 py-2 bg-green-500/20 text-green-300 text-xs font-bold rounded-lg hover:bg-green-500/30 transition"
                >
                  <Check size={13} /> Terkirim
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
              <option value="JNE">JNE</option>
              <option value="TIKI">TIKI</option>
              <option value="POS">POS Indonesia</option>
              <option value="Gojek">Gojek</option>
              <option value="Grab">Grab</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => handleInputResi(order.id)}
                className="flex-1 px-3 py-2.5 bg-green-500 text-black font-bold rounded-lg text-sm hover:bg-green-600 transition flex items-center justify-center gap-1.5"
              >
                <Send size={14} /> Kirim
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
        <button
          onClick={() => setShowOfflineOrderForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:bg-[#F4D03F] transition w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Tambah Order Manual
        </button>
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

      {/* Order Cards Grid - 1 col mobile, 2 col tablet, 3 col desktop */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-xl border border-white/10">
          <Package size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">Tidak ada order dalam kategori ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
