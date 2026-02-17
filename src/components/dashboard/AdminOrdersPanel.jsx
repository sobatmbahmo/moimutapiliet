import React from 'react';
import { DollarSign, Check, Truck, Printer, Trash, Plus, X } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
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
  // Pisahkan order berdasarkan status
  const pendingOrders = orders.filter(o => o.status === 'WAITING_CONFIRMATION');
  // Order dalam proses: WAITING_PAYMENT, PAID, processing
  const processedOrders = orders.filter(o => 
    ['WAITING_PAYMENT', 'PAID', 'processing'].includes(o.status)
  );
  const shippedOrders = orders.filter(o => o.status === 'shipped' || o.status === 'SHIPPED');
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'COMPLETED');

  const OrderCard = ({ order }) => (
    <div
      key={order.id}
      className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-2"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-white">{order.order_number}</p>
          <p className="text-sm text-gray-400">
            {order.users?.nama || order.nama_pembeli} • {order.users?.nomor_wa || order.nomor_wa}
          </p>
          <p className="text-xs text-gray-500 mt-1">{order.alamat}</p>
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
          order.status === 'WAITING_CONFIRMATION' ? 'bg-yellow-500/20 text-yellow-300' :
          order.status === 'WAITING_PAYMENT' ? 'bg-orange-500/20 text-orange-300' :
          order.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' :
          order.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
          (order.status === 'shipped' || order.status === 'SHIPPED') ? 'bg-purple-500/20 text-purple-300' :
          (order.status === 'delivered' || order.status === 'COMPLETED') ? 'bg-green-500/20 text-green-300' :
          'bg-gray-500/20 text-gray-300'
        }`}>
          {order.status === 'WAITING_CONFIRMATION' && 'Menunggu Konfirmasi'}
          {order.status === 'WAITING_PAYMENT' && 'Menunggu Pembayaran'}
          {order.status === 'PAID' && 'Sudah Dibayar'}
          {order.status === 'processing' && 'Dalam Proses'}
          {(order.status === 'shipped' || order.status === 'SHIPPED') && 'Dalam Perjalanan'}
          {(order.status === 'delivered' || order.status === 'COMPLETED') && 'Terkirim'}
        </span>
      </div>

      <div className="py-2 border-y border-white/10">
        {order.order_items?.map((item) => (
          <p key={item.id} className="text-sm text-gray-300">
            {item.products?.name || 'Produk'} × {item.qty} = {formatRupiah(item.qty * item.harga_satuan)}
            {item.varian && <span className="ml-2 text-xs bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded">{item.varian}</span>}
          </p>
        ))}
      </div>

      <div className="flex justify-between items-center text-sm">
        <div>
          <p className="text-gray-400">Total:</p>
          <p className="font-bold text-[#D4AF37]">{formatRupiah(order.total_bayar)}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {order.status === 'WAITING_CONFIRMATION' && (
            <button
              onClick={() => handleOpenShippingModal(order)}
              className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-bold rounded hover:bg-orange-500/30 transition"
            >
              <DollarSign size={14} className="inline mr-1" /> Konfirmasi Ongkir
            </button>
          )}
          {order.status === 'WAITING_PAYMENT' && (
            <button
              onClick={() => handleConfirmPayment(order.id)}
              disabled={loading}
              className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded hover:bg-emerald-500/30 transition disabled:opacity-50"
            >
              <Check size={14} className="inline mr-1" /> Konfirmasi Pembayaran
            </button>
          )}
          {order.status === 'PAID' && (
            <button
              onClick={() => handleOpenPrintResiModal(order)}
              className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded hover:bg-blue-500/30 transition"
            >
              <Truck size={14} className="inline mr-1" /> Print Resi
            </button>
          )}
          {order.status === 'processing' && (
            <button
              onClick={() => setEditingResi(order.id)}
              className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded hover:bg-blue-500/30 transition"
            >
              <Truck size={14} className="inline mr-1" /> Input Resi & Kirim
            </button>
          )}
          {(order.status === 'shipped' || order.status === 'SHIPPED') && (
            <>
              <button
                onClick={() => handleOpenPrintResiModal(order)}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded hover:bg-purple-500/30 transition"
                title="Print ulang resi jika rusak/error"
              >
                <Printer size={14} className="inline mr-1" /> Print Resi Ulang
              </button>
              <button
                onClick={() => handleConfirmDelivery(order.id)}
                className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded hover:bg-green-500/30 transition"
              >
                <Check size={14} className="inline mr-1" /> Verifikasi Order Terkirim
              </button>
            </>
          )}
          <button
            onClick={() => handleDeleteOrder(order.id, order.order_number)}
            disabled={deletingOrderId === order.id}
            className="px-3 py-1 bg-red-500/20 text-red-300 text-xs font-bold rounded hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Hapus order (untuk mengantisipasi double order)"
          >
            {deletingOrderId === order.id ? 'Menghapus...' : <><Trash size={14} className="inline mr-1" /> Hapus</>}
          </button>
        </div>
      </div>

      {editingResi === order.id && (
        <div className="bg-black/40 border border-[#D4AF37]/30 rounded-lg p-3 space-y-2">
          <input
            type="text"
            placeholder="Nomor Resi"
            value={resiNumber}
            onChange={(e) => setResiNumber(e.target.value)}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
          />
          <select
            value={couriername}
            onChange={(e) => setCourierName(e.target.value)}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
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
              className="flex-1 px-3 py-2 bg-green-500 text-black font-bold rounded text-sm hover:bg-green-600 transition"
            >
              <Check size={14} className="inline mr-1" /> Kirim
            </button>
            <button
              onClick={() => setEditingResi(null)}
              className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 font-bold rounded text-sm hover:bg-red-500/30 transition"
            >
              <X size={14} className="inline mr-1" /> Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tombol Tambah Order Manual */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Manajemen Order</h3>
        <button
          onClick={() => setShowOfflineOrderForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
        >
          <Plus size={18} /> Tambah Order Manual
        </button>
      </div>

      {/* GRID 4 KOLOM: PENDING, DALAM PROSES, SEDANG DIKIRIM, TERKIRIM */}
      <div className="grid grid-cols-4 gap-4">
        {/* KOLOM 1: SECTION PENDING ORDERS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-yellow-500/50">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <h4 className="text-sm font-bold text-yellow-300">
              Menunggu Konfirmasi ({pendingOrders.length})
            </h4>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="text-center py-6 bg-black/20 rounded-lg border border-yellow-500/20">
              <p className="text-gray-400 text-xs">Tidak ada order</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* KOLOM 2: SECTION PROCESSED ORDERS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-blue-500/50">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h4 className="text-sm font-bold text-blue-300">
              Dalam Proses ({processedOrders.length})
            </h4>
          </div>
          {processedOrders.length === 0 ? (
            <div className="text-center py-6 bg-black/20 rounded-lg border border-blue-500/20">
              <p className="text-gray-400 text-xs">Tidak ada order</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {processedOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* KOLOM 3: SECTION SEDANG DIKIRIM */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-purple-500/50">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h4 className="text-sm font-bold text-purple-300">
              Sedang Dikirim ({shippedOrders.length})
            </h4>
          </div>
          {shippedOrders.length === 0 ? (
            <div className="text-center py-6 bg-black/20 rounded-lg border border-purple-500/20">
              <p className="text-gray-400 text-xs">Tidak ada order</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {shippedOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* KOLOM 4: SECTION ORDER TERKIRIM */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-green-500/50">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h4 className="text-sm font-bold text-green-300">
              Terkirim ({deliveredOrders.length})
            </h4>
          </div>
          {deliveredOrders.length === 0 ? (
            <div className="text-center py-6 bg-black/20 rounded-lg border border-green-500/20">
              <p className="text-gray-400 text-xs">Tidak ada order</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {deliveredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
