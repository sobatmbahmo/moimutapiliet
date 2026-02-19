import React, { useState } from 'react';
import { X, Plus, Trash, Edit, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Tambah Order Manual</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* WA Parser Toggle Button */}
        <button
          type="button"
          onClick={() => setShowWAParser(!showWAParser)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition mb-4 ${
            showWAParser 
              ? 'bg-[#D4AF37] text-black' 
              : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 hover:bg-[#D4AF37]/30'
          }`}
        >
          <MessageSquare size={18} />
          {showWAParser ? 'Tutup Parser WA' : 'Parse Pesan WA'}
        </button>

        {/* WA Message Parser Section */}
        {showWAParser && (
          <div className="p-4 bg-black/40 border border-[#D4AF37]/30 rounded-xl space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <label className="text-[#D4AF37] font-bold text-sm">Paste Pesan WA Customer</label>
              <span className="text-xs text-gray-400">Auto-extract nama, no HP, alamat</span>
            </div>
            
            <textarea
              value={waMessageText}
              onChange={(e) => setWAMessageText(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white h-32 text-sm font-mono"
              placeholder={`Contoh format:\nNama Penerima : John Doe\nNo HP : 081234567890\nAlamat Lengkap : Jl. Contoh No. 123\nKelurahan : Contoh\nKecamatan : Contoh\nKab/Kota : Jakarta Selatan\nProvinsi : DKI Jakarta\nKode Pos : 12345\nMetode Pembayaran : Transfer BRI`}
            />
            
            {/* Parse Button */}
            <button
              type="button"
              onClick={handleParseWAMessage}
              disabled={isParsing || !waMessageText.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memproses & Validasi Alamat...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Extract & Validasi Alamat
                </>
              )}
            </button>
            
            {/* Error Message */}
            {parseError && (
              <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                <AlertCircle size={16} />
                {parseError}
              </div>
            )}
            
            {/* Success Result */}
            {parseResult && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                  <CheckCircle size={16} />
                  Data berhasil di-extract!
                </div>
                {parseResult.corrections?.length > 0 && (
                  <div className="text-xs text-yellow-400">
                    <p className="font-bold">Koreksi alamat:</p>
                    {parseResult.corrections.map((c, i) => (
                      <p key={i}>
                        {c.field}: "{c.from}" → "{c.to}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[#D4AF37] font-bold text-sm">Nama Customer</label>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddCustomer();
              }}
              className="text-[#D4AF37] hover:text-[#F4D03F] text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> Tambah Customer Baru
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={offlineOrder.customer_name}
              onChange={(e) => handleCustomerNameChange(e.target.value)}
              onFocus={() => offlineOrder.customer_name && setShowCustomerSearchDropdown(true)}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="Ketik nama atau nomor WA untuk mencari..."
            />
            {showCustomerSearchDropdown && customerSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-black/90 border border-[#D4AF37]/50 rounded-lg z-50 max-h-40 overflow-y-auto">
                {customerSearchResults.map(customer => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-[#D4AF37]/20 text-white text-sm border-b border-white/10 last:border-0"
                  >
                    <button
                      onClick={() => handleSelectCustomer(customer)}
                      className="flex-1 text-left"
                    >
                      <p className="font-bold">{customer.nama}</p>
                      <p className="text-xs text-gray-400">{customer.nomor_wa}</p>
                    </button>
                    <button
                      onClick={() => onEditCustomer(customer)}
                      className="ml-2 p-1 text-[#D4AF37] hover:text-[#F4D03F] hover:bg-[#D4AF37]/20 rounded"
                      title="Edit Customer"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm">Nomor WhatsApp</label>
          <div className="relative">
            <input
              type="tel"
              value={offlineOrder.customer_phone}
              onChange={(e) => handleCustomerPhoneChange(e.target.value)}
              onFocus={() => offlineOrder.customer_phone && setShowCustomerSearchDropdown(true)}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="628xxxxxxxxx"
            />
            {showCustomerSearchDropdown && customerSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-black/90 border border-[#D4AF37]/50 rounded-lg z-50 max-h-40 overflow-y-auto">
                {customerSearchResults.map(customer => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-[#D4AF37]/20 text-white text-sm border-b border-white/10 last:border-0"
                  >
                    <button
                      onClick={() => handleSelectCustomer(customer)}
                      className="flex-1 text-left"
                    >
                      <p className="font-bold">{customer.nama}</p>
                      <p className="text-xs text-gray-400">{customer.nomor_wa}</p>
                    </button>
                    <button
                      onClick={() => onEditCustomer(customer)}
                      className="ml-2 p-1 text-[#D4AF37] hover:text-[#F4D03F] hover:bg-[#D4AF37]/20 rounded"
                      title="Edit Customer"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm">Alamat Lengkap</label>
          <textarea
            value={offlineOrder.customer_address}
            onChange={(e) => setOfflineOrder({ ...offlineOrder, customer_address: e.target.value })}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-20"
            placeholder="Alamat detail"
          />
        </div>

        {/* Items */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[#D4AF37] font-bold text-sm">Produk</label>
            <button
              onClick={handleAddItem}
              className="text-[#D4AF37] hover:text-[#F4D03F] flex items-center gap-1"
            >
              <Plus size={16} /> Tambah Item
            </button>
          </div>
          {offlineOrder.items.map((item, idx) => {
            const selectedProduct = products.find(p => p.id === item.product_id);
            const isPacketComplete = selectedProduct?.name?.toLowerCase().includes('paket komplit');
            
            return (
              <div key={idx} className="space-y-2 p-3 bg-black/20 rounded-lg border border-white/10">
                {/* Row 1: Product Name Selector + Satuan + Qty + Delete */}
                <div className="flex gap-2 items-start">
                  <select
                    value={item.product_id}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm"
                  >
                    <option value="">--Pilih Produk--</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>

                  {/* Satuan Selector */}
                  {item.product_id && (
                    <select
                      value={item.satuan}
                      onChange={(e) => handleSatuanChange(idx, e.target.value)}
                      className="px-3 py-2 bg-black/40 border border-[#D4AF37]/50 rounded-lg text-white text-sm"
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
                    className="w-16 px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm text-center"
                    placeholder="Qty"
                  />

                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-red-400 hover:text-red-500"
                  >
                    <Trash size={16} />
                  </button>
                </div>

                {/* Row 2: Harga + Subtotal */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[#D4AF37] font-bold text-xs">
                      Harga {item.satuan === 'Kg' ? '/Kg' : '/100gr'} (editable)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                      <input
                        type="text"
                        value={formatPriceInput(String(item.price))}
                        onChange={(e) => {
                          const numericValue = parsePriceInput(e.target.value);
                          handleItemChange(idx, 'price', numericValue);
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-black/40 border border-[#D4AF37]/50 rounded-lg text-white text-sm"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Harga bisa diubah untuk transaksi ini</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#D4AF37] font-bold text-xs">Subtotal</label>
                    <div className="px-3 py-2 bg-black/60 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] text-sm font-bold">
                      {formatRupiah(item.quantity * item.price)}
                    </div>
                  </div>
                </div>

                {/* Row 3: Varian (hanya untuk PAKET KOMPLIT) */}
                {isPacketComplete && (
                  <div className="space-y-1">
                    <label className="text-[#D4AF37] font-bold text-xs">Varian Paket Komplit</label>
                    <select
                      value={item.varian}
                      onChange={(e) => handleItemChange(idx, 'varian', e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-[#D4AF37]/50 rounded-lg text-white text-sm"
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

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm">Metode Bayar</label>
          <select
            value={offlineOrder.payment_method}
            onChange={(e) => setOfflineOrder({ ...offlineOrder, payment_method: e.target.value })}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
          >
            <option value="transfer">Transfer Bank</option>
            <option value="cod">COD</option>
          </select>
        </div>

        {/* Expedisi & Ongkir */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Expedisi</label>
            <select
              value={offlineOrder.courier_name}
              onChange={(e) => setOfflineOrder({ ...offlineOrder, courier_name: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm"
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
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Ongkir</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">Rp</span>
              <input
                type="number"
                value={offlineOrder.shipping_cost}
                onChange={(e) => setOfflineOrder({ ...offlineOrder, shipping_cost: parseInt(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                className="w-full pl-8 pr-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm">Catatan Admin</label>
          <textarea
            value={offlineOrder.notes}
            onChange={(e) => setOfflineOrder({ ...offlineOrder, notes: e.target.value })}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-16"
            placeholder="Catatan khusus untuk order ini"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
          >
            {loading ? 'Membuat...' : 'Buat Order'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
