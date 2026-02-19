import React, { useState } from 'react';
import { X, Plus, Trash, Edit, MessageSquare, Loader2, CheckCircle, AlertCircle, ShoppingCart, User, Truck, FileText, CreditCard, Package } from 'lucide-react';
import { parseWAMessage, detectPaymentMethod, normalizeRTRW } from '../../lib/addressParser';
import { validateAddress, formatValidatedAddress } from '../../lib/indonesiaAddress';

/**
 * Form untuk menambah order offline/manual
 */
export default function OfflineOrderForm({
  isOpen,
  onClose,
  offlineOrder,
  setOfflineOrder,
  products,
  customers,
  loading,
  onSubmit,
  onAddCustomer,
  onEditCustomer,
  formatRupiah
}) {
  const [showCustomerSearchDropdown, setShowCustomerSearchDropdown] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  
  // WA Parser states
  const [showWAParser, setShowWAParser] = useState(false);
  const [waMessageText, setWAMessageText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState('');

  if (!isOpen) return null;

  const VARIANTS = ['GGSA', 'INL', 'RHS', 'JRM', 'BB', 'MLB', 'DJS', 'SMP', 'PLN', 'APLN', 'KPLN'];

  // Customer search logic
  const handleCustomerNameChange = (value) => {
    setOfflineOrder({ ...offlineOrder, customer_name: value });
    if (value.length >= 2 && customers && customers.length > 0) {
      const filtered = customers.filter(c =>
        c.nama?.toLowerCase().includes(value.toLowerCase()) ||
        c.nomor_wa?.includes(value)
      );
      setCustomerSearchResults(filtered.slice(0, 5));
      setShowCustomerSearchDropdown(true);
    } else {
      setCustomerSearchResults([]);
      setShowCustomerSearchDropdown(false);
    }
  };

  const handleCustomerPhoneChange = (value) => {
    setOfflineOrder({ ...offlineOrder, customer_phone: value });
    if (value.length >= 3 && customers && customers.length > 0) {
      const filtered = customers.filter(c =>
        c.nomor_wa?.includes(value) ||
        c.nama?.toLowerCase().includes(value.toLowerCase())
      );
      setCustomerSearchResults(filtered.slice(0, 5));
      setShowCustomerSearchDropdown(true);
    } else {
      setCustomerSearchResults([]);
      setShowCustomerSearchDropdown(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setOfflineOrder({
      ...offlineOrder,
      customer_name: customer.nama,
      customer_phone: customer.nomor_wa,
      customer_address: customer.alamat || ''
    });
    setShowCustomerSearchDropdown(false);
    setCustomerSearchResults([]);
  };

  const handleAddItem = () => {
    setOfflineOrder({
      ...offlineOrder,
      items: [...offlineOrder.items, { product_id: '', quantity: 1, price: 0, varian: '', satuan: '100gr' }]
    });
  };

  const handleRemoveItem = (idx) => {
    const newItems = offlineOrder.items.filter((_, i) => i !== idx);
    setOfflineOrder({ ...offlineOrder, items: newItems.length > 0 ? newItems : [{ product_id: '', quantity: 1, price: 0, varian: '', satuan: '100gr' }] });
  };

  const handleProductSelect = (idx, productId) => {
    const prod = products.find(p => p.id === productId);
    const newItems = [...offlineOrder.items];
    newItems[idx] = { 
      ...newItems[idx], 
      product_id: productId, 
      price: prod?.price || 0, 
      varian: '',
      satuan: '100gr'
    };
    setOfflineOrder({ ...offlineOrder, items: newItems });
  };

  const handleSatuanChange = (idx, satuan) => {
    const newItems = [...offlineOrder.items];
    newItems[idx].satuan = satuan;
    if (satuan === '100gr') {
      const selectedProduct = products.find(p => p.id === newItems[idx].product_id);
      newItems[idx].price = selectedProduct?.price || 0;
    }
    setOfflineOrder({ ...offlineOrder, items: newItems });
  };

  // Handler for item field changes (quantity, price, varian)
  const handleItemChange = (idx, field, value) => {
    const newItems = [...offlineOrder.items];
    newItems[idx][field] = value;
    setOfflineOrder({ ...offlineOrder, items: newItems });
  };

  // Format number to Rupiah display (000.000)
  const formatPriceInput = (value) => {
    // Remove non-digits
    const numericValue = value.replace(/\D/g, '');
    // Format with dots as thousand separator
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse Rupiah string back to number
  const parsePriceInput = (value) => {
    return parseInt(value.replace(/\./g, '')) || 0;
  };

  // WA Message Parser Handler
  const handleParseWAMessage = async () => {
    if (!waMessageText.trim()) {
      setParseError('Paste pesan WA terlebih dahulu');
      return;
    }
    
    setIsParsing(true);
    setParseError('');
    setParseResult(null);
    
    try {
      // Step 1: Parse the raw message
      const parsed = parseWAMessage(waMessageText);
      
      if (!parsed || (!parsed.nama && !parsed.nomor_wa)) {
        setParseError('Format pesan tidak dikenali. Pastikan ada Nama dan No HP.');
        setIsParsing(false);
        return;
      }
      
      // Step 2: Validate and correct address with emsifa API
      const validated = await validateAddress(parsed);
      
      // Step 3: Format the final address
      const formattedAddress = formatValidatedAddress(validated);
      const normalizedAddress = normalizeRTRW(formattedAddress);
      
      // Step 4: Apply to form
      setOfflineOrder({
        ...offlineOrder,
        customer_name: validated.nama || '',
        customer_phone: validated.nomor_wa || '',
        customer_address: normalizedAddress || '',
        payment_method: detectPaymentMethod(validated.metode_bayar)
      });
      
      // Save result for display
      setParseResult({
        ...validated,
        final_address: normalizedAddress
      });
      
      // Auto close parser after success
      setTimeout(() => {
        setShowWAParser(false);
        setWAMessageText('');
        setParseResult(null);
      }, 2000);
      
    } catch (error) {
      console.error('Parse error:', error);
      setParseError('Gagal memproses pesan: ' + error.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Calculate total
  const subtotal = offlineOrder.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const totalWithShipping = subtotal + (parseInt(offlineOrder.shipping_cost) || 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/85 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto my-4 md:my-8 px-4">
        
        {/* === HEADER === */}
        <div className="bg-gradient-to-r from-[#022c22] to-[#064e3b] border border-[#D4AF37]/40 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center">
              <ShoppingCart size={20} className="text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Order Manual</h2>
              <p className="text-xs text-gray-400">Buat pesanan baru dari admin</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        {/* === MAIN CONTENT === */}
        <div className="bg-[#011e17] border-x border-[#D4AF37]/20">

          {/* WA Parser - Full Width */}
          <div className="px-6 pt-5">
            <button
              type="button"
              onClick={() => setShowWAParser(!showWAParser)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition text-sm ${
                showWAParser 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-dashed border-[#D4AF37]/40 hover:bg-[#D4AF37]/20'
              }`}
            >
              <MessageSquare size={18} />
              {showWAParser ? 'Tutup Parser WA' : 'Parse Pesan WA — Isi Otomatis Data Customer'}
            </button>

            {showWAParser && (
              <div className="mt-3 p-4 bg-black/30 border border-[#D4AF37]/20 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[#D4AF37] font-bold text-sm">Paste Pesan WA Customer</label>
                  <span className="text-xs text-gray-500">Auto-extract nama, no HP, alamat</span>
                </div>
                <textarea
                  value={waMessageText}
                  onChange={(e) => setWAMessageText(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white h-28 text-sm font-mono focus:border-[#D4AF37]/50 focus:outline-none transition"
                  placeholder={`Contoh format:\nNama Penerima : John Doe\nNo HP : 081234567890\nAlamat Lengkap : Jl. Contoh No. 123\nKelurahan : Contoh\nKecamatan : Contoh\nKab/Kota : Jakarta Selatan\nProvinsi : DKI Jakarta`}
                />
                <button
                  type="button"
                  onClick={handleParseWAMessage}
                  disabled={isParsing || !waMessageText.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  {isParsing ? (<><Loader2 size={16} className="animate-spin" /> Memproses & Validasi Alamat...</>) : (<><CheckCircle size={16} /> Extract & Validasi Alamat</>)}
                </button>
                {parseError && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    <AlertCircle size={16} className="shrink-0" /> {parseError}
                  </div>
                )}
                {parseResult && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle size={16} /> Data berhasil di-extract!
                    </div>
                    {parseResult.corrections?.length > 0 && (
                      <div className="text-xs text-yellow-400 mt-1">
                        <p className="font-bold">Koreksi alamat:</p>
                        {parseResult.corrections.map((c, i) => (
                          <p key={i}>{c.field}: "{c.from}" → "{c.to}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* === 2-COLUMN GRID: Customer (left) + Products (right) === */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 p-6">

            {/* ====== LEFT COLUMN - Customer Info (2/5) ====== */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-black/25 border border-white/8 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <User size={16} className="text-[#D4AF37]" />
                  <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">Data Customer</h3>
                </div>

                {/* Nama */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-300 font-medium text-xs uppercase tracking-wide">Nama</label>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddCustomer(); }}
                      className="text-[#D4AF37] hover:text-[#F4D03F] text-xs flex items-center gap-1"
                    >
                      <Plus size={12} /> Baru
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={offlineOrder.customer_name}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      onFocus={() => offlineOrder.customer_name && setShowCustomerSearchDropdown(true)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-lg text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none transition"
                      placeholder="Ketik nama untuk mencari..."
                    />
                    {showCustomerSearchDropdown && customerSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#0a0a0a] border border-[#D4AF37]/40 rounded-lg z-50 max-h-36 overflow-y-auto shadow-xl">
                        {customerSearchResults.map(customer => (
                          <div key={customer.id} className="flex items-center justify-between px-3 py-2 hover:bg-[#D4AF37]/10 text-white text-sm border-b border-white/5 last:border-0">
                            <button onClick={() => handleSelectCustomer(customer)} className="flex-1 text-left">
                              <p className="font-bold text-sm">{customer.nama}</p>
                              <p className="text-xs text-gray-500">{customer.nomor_wa}</p>
                            </button>
                            <button onClick={() => onEditCustomer(customer)} className="ml-2 p-1 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded" title="Edit"><Edit size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* No WA */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium text-xs uppercase tracking-wide">No. WhatsApp</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={offlineOrder.customer_phone}
                      onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                      onFocus={() => offlineOrder.customer_phone && setShowCustomerSearchDropdown(true)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-lg text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none transition"
                      placeholder="628xxxxxxxxx"
                    />
                    {showCustomerSearchDropdown && customerSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#0a0a0a] border border-[#D4AF37]/40 rounded-lg z-50 max-h-36 overflow-y-auto shadow-xl">
                        {customerSearchResults.map(customer => (
                          <div key={customer.id} className="flex items-center justify-between px-3 py-2 hover:bg-[#D4AF37]/10 text-white text-sm border-b border-white/5 last:border-0">
                            <button onClick={() => handleSelectCustomer(customer)} className="flex-1 text-left">
                              <p className="font-bold text-sm">{customer.nama}</p>
                              <p className="text-xs text-gray-500">{customer.nomor_wa}</p>
                            </button>
                            <button onClick={() => onEditCustomer(customer)} className="ml-2 p-1 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded" title="Edit"><Edit size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Alamat */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium text-xs uppercase tracking-wide">Alamat Lengkap</label>
                  <textarea
                    value={offlineOrder.customer_address}
                    onChange={(e) => setOfflineOrder({ ...offlineOrder, customer_address: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-lg text-white text-sm h-24 resize-none focus:border-[#D4AF37]/50 focus:outline-none transition"
                    placeholder="Alamat detail pengiriman..."
                  />
                </div>
              </div>

              {/* Shipping & Payment Card */}
              <div className="bg-black/25 border border-white/8 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Truck size={16} className="text-[#D4AF37]" />
                  <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">Pengiriman & Pembayaran</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Expedisi */}
                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-medium text-xs uppercase tracking-wide">Expedisi</label>
                    <select
                      value={offlineOrder.courier_name}
                      onChange={(e) => setOfflineOrder({ ...offlineOrder, courier_name: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-lg text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none transition"
                    >
                      <option value="J&T">J&T</option>
                      <option value="WAHANA">WAHANA</option>
                      <option value="ID Express">ID Express</option>
                      <option value="Indah Cargo">Indah Cargo</option>
                      <option value="JNE">JNE</option>
                      <option value="Tiki">Tiki</option>
                      <option value="Pos Indonesia">Pos Indonesia</option>
                      <option value="Grab Express">Grab Express</option>
                      <option value="GoSend">GoSend</option>
                    </select>
                  </div>

                  {/* Ongkir */}
                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-medium text-xs uppercase tracking-wide">Ongkir</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                      <input
                        type="number"
                        value={offlineOrder.shipping_cost}
                        onChange={(e) => setOfflineOrder({ ...offlineOrder, shipping_cost: parseInt(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-lg text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none transition"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium text-xs uppercase tracking-wide">Metode Bayar</label>
                  <select
                    value={offlineOrder.payment_method}
                    onChange={(e) => setOfflineOrder({ ...offlineOrder, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-lg text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none transition"
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="cod">COD</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium text-xs uppercase tracking-wide">Catatan Admin</label>
                  <textarea
                    value={offlineOrder.notes}
                    onChange={(e) => setOfflineOrder({ ...offlineOrder, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-lg text-white text-sm h-16 resize-none focus:border-[#D4AF37]/50 focus:outline-none transition"
                    placeholder="Catatan khusus..."
                  />
                </div>
              </div>
            </div>

            {/* ====== RIGHT COLUMN - Products (3/5) ====== */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-black/25 border border-white/8 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-[#D4AF37]" />
                    <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">Produk Dipesan</h3>
                  </div>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/25 transition"
                  >
                    <Plus size={14} /> Tambah Item
                  </button>
                </div>

                {/* Table Header - Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-2 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-4">Produk</div>
                  <div className="col-span-2">Satuan</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2">Harga</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items */}
                {offlineOrder.items.map((item, idx) => {
                  const selectedProduct = products.find(p => p.id === item.product_id);
                  const isPacketComplete = selectedProduct?.name?.toLowerCase().includes('paket komplit');

                  return (
                    <div key={idx} className="bg-black/20 border border-white/5 rounded-lg p-3 space-y-2">
                      {/* Desktop Row */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                        {/* Product Select */}
                        <div className="col-span-4">
                          <select
                            value={item.product_id}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full px-2 py-2 bg-black/50 border border-white/15 rounded-lg text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none transition"
                          >
                            <option value="">--Pilih--</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Satuan */}
                        <div className="col-span-2">
                          {item.product_id ? (
                            <select
                              value={item.satuan}
                              onChange={(e) => handleSatuanChange(idx, e.target.value)}
                              className="w-full px-2 py-2 bg-black/50 border border-[#D4AF37]/30 rounded-lg text-white text-sm focus:outline-none"
                            >
                              <option value="100gr">100gr</option>
                              <option value="Kg">Kg</option>
                            </select>
                          ) : (
                            <div className="px-2 py-2 text-gray-600 text-sm">—</div>
                          )}
                        </div>

                        {/* Qty */}
                        <div className="col-span-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-1 py-2 bg-black/50 border border-white/15 rounded-lg text-white text-sm text-center focus:border-[#D4AF37]/50 focus:outline-none transition"
                          />
                        </div>

                        {/* Price */}
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                            <input
                              type="text"
                              value={formatPriceInput(String(item.price))}
                              onChange={(e) => handleItemChange(idx, 'price', parsePriceInput(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-full pl-7 pr-2 py-2 bg-black/50 border border-[#D4AF37]/30 rounded-lg text-white text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="col-span-2 text-right">
                          <span className="text-[#D4AF37] font-bold text-sm">{formatRupiah(item.quantity * item.price)}</span>
                        </div>

                        {/* Delete */}
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => handleRemoveItem(idx)} className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden space-y-2">
                        <div className="flex gap-2 items-start">
                          <select
                            value={item.product_id}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="flex-1 px-2 py-2 bg-black/50 border border-white/15 rounded-lg text-white text-sm"
                          >
                            <option value="">--Pilih Produk--</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <button onClick={() => handleRemoveItem(idx)} className="p-2 text-red-400 hover:text-red-500">
                            <Trash size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {item.product_id && (
                            <select
                              value={item.satuan}
                              onChange={(e) => handleSatuanChange(idx, e.target.value)}
                              className="px-2 py-2 bg-black/50 border border-[#D4AF37]/30 rounded-lg text-white text-sm"
                            >
                              <option value="100gr">100gr</option>
                              <option value="Kg">Kg</option>
                            </select>
                          )}
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
                            className="px-2 py-2 bg-black/50 border border-white/15 rounded-lg text-white text-sm text-center"
                            placeholder="Qty"
                          />
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                            <input
                              type="text"
                              value={formatPriceInput(String(item.price))}
                              onChange={(e) => handleItemChange(idx, 'price', parsePriceInput(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-full pl-7 pr-2 py-2 bg-black/50 border border-[#D4AF37]/30 rounded-lg text-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="text-right text-[#D4AF37] font-bold text-sm">
                          Subtotal: {formatRupiah(item.quantity * item.price)}
                        </div>
                      </div>

                      {/* Varian (Paket Komplit) */}
                      {isPacketComplete && (
                        <div className="pt-1">
                          <select
                            value={item.varian}
                            onChange={(e) => handleItemChange(idx, 'varian', e.target.value)}
                            className="w-full md:w-48 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] text-sm font-medium focus:outline-none"
                          >
                            <option value="">--Pilih Varian--</option>
                            {VARIANTS.map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* === SUMMARY CARD === */}
              <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-xl p-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#D4AF37]/20 mb-3">
                  <CreditCard size={16} className="text-[#D4AF37]" />
                  <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">Ringkasan</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal ({offlineOrder.items.length} item)</span>
                    <span className="font-medium text-white">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Ongkir ({offlineOrder.courier_name})</span>
                    <span className="font-medium text-white">{formatRupiah(parseInt(offlineOrder.shipping_cost) || 0)}</span>
                  </div>
                  <div className="border-t border-[#D4AF37]/30 pt-2 flex justify-between items-center">
                    <span className="text-[#D4AF37] font-bold text-base">TOTAL</span>
                    <span className="text-[#D4AF37] font-black text-lg">{formatRupiah(totalWithShipping)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === FOOTER ACTIONS === */}
        <div className="bg-gradient-to-r from-[#022c22] to-[#064e3b] border border-t-0 border-[#D4AF37]/40 rounded-b-2xl px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#F4D03F] transition disabled:opacity-50 text-sm"
            >
              {loading ? (<><Loader2 size={16} className="animate-spin" /> Membuat Order...</>) : (<><CheckCircle size={16} /> Buat Order</>)}
            </button>
            <button
              onClick={onClose}
              className="sm:w-36 px-4 py-3 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 hover:text-white transition border border-white/10 text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
