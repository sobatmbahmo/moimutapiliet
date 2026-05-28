import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Send, MapPin, ChevronDown, Info, Edit3, CreditCard, Search, Loader2 } from 'lucide-react';
import { useReferral } from '../context/ReferralContext';
import { createOrder, addOrderItems, createOrGetUser } from '../lib/supabaseQueries';
import { generateOrderNumber } from '../lib/orderUtils';
import { createOrUpdateBinding } from '../lib/bindingLogic';
import { searchBiteshipAreas, getBiteshipRates } from '../lib/biteshipAPI';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

export default function CartDrawer({ isOpen, onClose, cartItems, onUpdateQty, onUpdateNote }) {
  const { referralData, hasReferral } = useReferral();
  const [formData, setFormData] = useState({ name: '', phone: '', detailAddress: '' });
  const [paymentMethod, setPaymentMethod] = useState('transfer'); // 'transfer' or 'cod'
  const [isSaving, setIsSaving] = useState(false);

  // Biteship States
  const [areaSearch, setAreaSearch] = useState('');
  const [areaOptions, setAreaOptions] = useState([]);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [shippingRate, setShippingRate] = useState(null); // { price, courier_name, courier_service_name }
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Search Areas
  useEffect(() => {
    if (!areaSearch || areaSearch.length < 3 || selectedArea?.name === areaSearch) {
      setAreaOptions([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    setIsSearchingArea(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const res = await searchBiteshipAreas(areaSearch);
      if (res.success) {
        setAreaOptions(res.areas);
        setShowAreaDropdown(true);
      }
      setIsSearchingArea(false);
    }, 500);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [areaSearch, selectedArea]);

  // Calculate Rate
  useEffect(() => {
    const fetchRate = async () => {
      if (selectedArea && cartItems.length > 0) {
        setIsLoadingRate(true);
        // Kita berasumsi Biteship area object punya property postal_code
        const postalCode = selectedArea.postal_code;
        if (postalCode) {
          const res = await getBiteshipRates(postalCode, cartItems, 'jnt');
          if (res.success && res.pricing && res.pricing.length > 0) {
            // Pilih tarif pertama yang tersedia
            const rate = res.pricing[0];
            setShippingRate({
              price: rate.price,
              courier_name: rate.courier_name,
              courier_service_name: rate.courier_service_name
            });
          } else {
            setShippingRate(null);
          }
        }
        setIsLoadingRate(false);
      } else {
        setShippingRate(null);
      }
    };
    
    fetchRate();
  }, [selectedArea, cartItems]);

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    setAreaSearch(area.name); // Usually formatted nicely by Biteship
    setShowAreaDropdown(false);
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.harga_produk * item.qty), 0);
  }, [cartItems]);

  const subsidiOngkir = useMemo(() => {
    if (subtotal >= 100000) return 10000;
    if (subtotal >= 60000) return 5000;
    return 0;
  }, [subtotal]);

  const totalBayar = useMemo(() => {
    let ongkir = shippingRate ? Math.max(0, shippingRate.price - subsidiOngkir) : 0;
    let total = subtotal + ongkir;
    if (paymentMethod === 'cod') {
      total += Math.round(subtotal * 0.05);
    }
    return total;
  }, [subtotal, shippingRate, paymentMethod, subsidiOngkir]);

  // Revert payment method to transfer if subtotal exceeds 200k and cod is selected
  useEffect(() => {
    if (paymentMethod === 'cod' && subtotal > 200000) {
      alert('Total pesanan Anda melebihi Rp 200.000, metode COD telah dinonaktifkan secara otomatis.');
      setPaymentMethod('transfer');
    }
  }, [subtotal, paymentMethod]);

  // === FUNGSI KIRIM KE WHATSAPP DAN SIMPAN KE DATABASE ===
  const handleCheckout = async () => {
    if (!formData.name || !formData.phone || !selectedArea || !formData.detailAddress) {
      alert("Mohon lengkapi semua data alamat termasuk area/kecamatan!");
      return;
    }

    setIsSaving(true);

    try {
      // Generate order number
      const orderNumResult = await generateOrderNumber();
      if (!orderNumResult.success) throw new Error('Gagal generate nomor order');

      // Build alamat lengkap
      const fullAddress = `${formData.detailAddress}, ${selectedArea.name}`;

      // Buat atau dapatkan user berdasarkan nomor WA
      const userResult = await createOrGetUser(formData.name, formData.phone, null, fullAddress);
      if (!userResult.success) throw new Error('Gagal membuat/mendapatkan user: ' + userResult.error);
      
      const userId = userResult.user.id;

      let finalShippingCost = shippingRate ? Math.max(0, shippingRate.price - subsidiOngkir) : 0;

      // Create order in database
      const orderData = {
        order_number: orderNumResult.orderNumber,
        metode_bayar: paymentMethod,
        total_produk: subtotal,
        total_bayar: totalBayar,
        shipping_cost: finalShippingCost,
        subsidi_ongkir: subsidiOngkir,
        courier_name: shippingRate ? shippingRate.courier_name.toUpperCase() : null,
        alamat: fullAddress,
        nomor_wa: formData.phone,
        catatan: '',
        is_offline: false,
        affiliator_id: referralData.affiliatorId || null,
        payment_due_date: null,
        status: 'WAITING_CONFIRMATION' // Admin can confirm or proceed to payment
      };

      const createResult = await createOrder(userId, orderData);
      if (!createResult.success) throw new Error(createResult.error);

      // --- TAMBAHAN BINDING LOGIC ---
      if (referralData.affiliatorId) {
        await createOrUpdateBinding(userId, referralData.affiliatorId);
      }
      // ------------------------------

      // Add order items
      const itemsToAdd = cartItems.map(item => ({
        product_id: item.original_product_id || item.id,
        qty: item.qty,
        harga_satuan: item.harga_produk,
        subtotal: item.harga_produk * item.qty,
        varian: item.variant_code || null
      }));

      const addItemsResult = await addOrderItems(createResult.order.id, itemsToAdd);
      if (!addItemsResult.success) throw new Error(addItemsResult.error);

      // Now build WhatsApp message
      const refCode = referralData.affiliatorId || '-';

      let message = `Halo Admin, saya sudah memasukkan pesanan dengan nomor *${orderNumResult.orderNumber}*:\n\n`;
      message += `📦 *DETAIL PESANAN*\n`;
      cartItems.forEach((item, index) => {
        message += `${index + 1}. ${item.nama_produk} (${item.qty}x) - ${formatRupiah(item.harga_produk * item.qty)}\n`;
        if(item.kode_produk) message += `   (Kode: ${item.kode_produk})\n`; 
        if(item.note) message += `   📝 *Catatan:* ${item.note}\n`;
      });

      message += `\n*RINGKASAN BIAYA*\n`;
      message += `Subtotal Barang: ${formatRupiah(subtotal)}\n`;
      
      if (shippingRate) {
        message += `Ongkos Kirim (${shippingRate.courier_name.toUpperCase()} - ${shippingRate.courier_service_name}): ${formatRupiah(shippingRate.price)}\n`;
        if (subsidiOngkir > 0) {
          message += `Subsidi Ongkir: -${formatRupiah(subsidiOngkir)} ✅\n`;
        }
      }
      
      if (paymentMethod === 'cod') {
        message += `Biaya Layanan COD (5%): ${formatRupiah(Math.round(subtotal * 0.05))}\n`;
      }
      
      message += `*Total Akhir: ${formatRupiah(totalBayar)}*\n\n`;

      message += `👤 *DATA PENERIMA*\n`;
      message += `Nama: ${formData.name}\n`;
      message += `HP: ${formData.phone}\n\n`;
      message += `📍 *ALAMAT LENGKAP*\n`;
      message += `${fullAddress}\n\n`;

      message += `💳 *METODE PEMBAYARAN*\n`;
      if (paymentMethod === 'transfer') {
        message += `Transfer Bank - Pembayaran sebelum pengiriman\n\n`;
      } else {
        message += `COD (Bayar saat diterima)\n\n`;
      }
      
      if (hasReferral) {
        message += `🤝 *REFERRAL CODE: ${refCode}* ✓\n`; 
      }

      message += `✅ Pesanan sudah tersimpan di sistem.\n`;

      const adminNumber = "6285700800278"; 
      window.open(`https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`, '_blank');

      alert('✅ Pesanan berhasil disimpan! WhatsApp akan terbuka untuk konfirmasi dengan admin.');
      onClose();

    } catch (error) {
      console.error('❌ Checkout Error:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-[#042f2e] h-full shadow-2xl flex flex-col animate-slide-left border-l border-[#D4AF37]/20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#042f2e]">
          <h2 className="font-bold text-lg text-white flex items-center gap-2">Keranjang <span className="bg-[#D4AF37] text-black text-xs px-2 py-1 rounded-full font-bold">{cartItems.length}</span></h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 && (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5"><p className="text-gray-400">Keranjang masih kosong.</p></div>
          )}
          
          {cartItems.map((item) => (
              <div key={item.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="flex gap-3 mb-3">
                  <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                  <div className="flex-1">
                    <h3 className="font-medium text-white line-clamp-1">{item.nama_produk}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[#D4AF37] font-bold text-sm">{formatRupiah(item.harga_produk)}</p>
                      <div className="flex items-center gap-3">
                         <button onClick={() => onUpdateQty(item.id, item.qty - 1)} className="w-6 h-6 bg-white/10 text-white border border-white/20 rounded flex items-center justify-center hover:bg-white/20">-</button>
                         <span className="text-sm font-bold text-white">{item.qty}</span>
                         <button onClick={() => onUpdateQty(item.id, item.qty + 1)} className="w-6 h-6 bg-[#D4AF37] text-black rounded flex items-center justify-center hover:bg-[#F4D03F] font-bold">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <input type="text" placeholder="Tambah catatan..." className="w-full pl-8 pr-3 py-2 text-xs bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-all" value={item.note || ''} onChange={(e) => onUpdateNote(item.id, e.target.value)} />
                  <Edit3 className="absolute left-2.5 top-2 text-gray-500" size={12} />
                </div>
              </div>
          ))}

          {cartItems.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="font-bold text-[#D4AF37] mb-4 flex items-center gap-2"><MapPin size={18} /> Data Pengiriman</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Nama Penerima" className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input type="tel" placeholder="Nomor WhatsApp" className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                
                {/* Biteship Area Autocomplete */}
                <div className="relative">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Cari Kecamatan / Kodepos..." 
                      className="w-full pl-10 p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" 
                      value={areaSearch}
                      onChange={(e) => {
                        setAreaSearch(e.target.value);
                        if (selectedArea && e.target.value !== selectedArea.name) {
                          setSelectedArea(null);
                        }
                      }}
                      onFocus={() => { if(areaOptions.length > 0) setShowAreaDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowAreaDropdown(false), 200)}
                    />
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
                    {isSearchingArea && <Loader2 className="absolute right-3 top-3.5 text-gray-400 animate-spin" size={16} />}
                  </div>
                  
                  {showAreaDropdown && areaOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#0f3d37] border border-[#D4AF37]/30 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {areaOptions.map(area => (
                        <div 
                          key={area.id} 
                          className="p-3 text-sm text-white hover:bg-[#D4AF37]/20 cursor-pointer border-b border-white/5 last:border-0"
                          onClick={() => handleSelectArea(area)}
                        >
                          {area.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <textarea rows="2" placeholder="Detail Jalan, Nomor Rumah, RT/RW..." className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" onChange={(e) => setFormData({...formData, detailAddress: e.target.value})}></textarea>
              </div>

              {/* PAYMENT METHOD SECTION */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="font-bold text-[#D4AF37] mb-4 flex items-center gap-2"><CreditCard size={18} /> Metode Pembayaran</h3>
                <div className="space-y-3">
                  <label className="flex items-center p-3 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-black/50 transition-all"
                    style={{ borderColor: paymentMethod === 'transfer' ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                    <input type="radio" name="payment" value="transfer" checked={paymentMethod === 'transfer'} 
                      onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4" />
                    <div className="ml-3 flex-1">
                      <p className="font-semibold text-white text-sm">💳 Transfer Bank</p>
                      <p className="text-xs text-gray-400">Bayar sebelum pengiriman diproses</p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-black/50 transition-all"
                    style={{ borderColor: paymentMethod === 'cod' ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} 
                      onChange={(e) => {
                        if (e.target.value === 'cod' && subtotal > 200000) {
                          alert('Metode COD hanya diperbolehkan untuk pesanan dengan Nilai Barang maksimal Rp 200.000');
                          return;
                        }
                        setPaymentMethod(e.target.value);
                      }} className="w-4 h-4" />
                    <div className="ml-3 flex-1">
                      <p className="font-semibold text-white text-sm">🚚 COD (Bayar Nanti)</p>
                      <p className="text-xs text-gray-400">Untuk Pembayaran COD, proses selanjutnya akan diproses admin secara manual melalui Whatsapp. (Biaya Layanan 5%)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* SHIPPING RATE DISPLAY */}
              {selectedArea && (
                <div className="mt-4 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                  {isLoadingRate ? (
                    <div className="flex items-center gap-2 text-sm text-[#D4AF37]">
                      <Loader2 size={14} className="animate-spin" /> Menghitung ongkir...
                    </div>
                  ) : shippingRate ? (
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[#D4AF37] font-medium">Ongkir ({shippingRate.courier_name.toUpperCase()} - {shippingRate.courier_service_name})</span>
                        <span className={`text-white font-bold ${subsidiOngkir > 0 ? 'line-through text-gray-400' : ''}`}>
                          {formatRupiah(shippingRate.price)}
                        </span>
                      </div>
                      {subsidiOngkir > 0 && (
                        <div className="flex justify-between items-center text-green-400 mt-1 font-bold">
                          <span>Subsidi Ongkir 🎉</span>
                          <span>-{formatRupiah(subsidiOngkir)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-400">Gagal memuat tarif ongkir. Hubungi admin.</div>
                  )}
                </div>
              )}

              {/* INFO SECTION */}
              <div className="mt-6 bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-3 rounded-lg flex gap-3"><Info className="text-[#F4D03F] shrink-0" size={20} /><div className="text-xs text-[#F4D03F]/90"><p className="font-bold mb-1 text-[#F4D03F]">ℹ️ Info Pemesanan</p><p>Pesanan Anda sudah tersimpan di sistem dan akan diproses segera setelah konfirmasi.</p></div></div>
            </div>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-[#022c22] safe-area-bottom space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Subtotal Barang</span>
              <span className="font-bold text-white">{formatRupiah(subtotal)}</span>
            </div>
            
            {shippingRate && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Ongkos Kirim</span>
                  <span className={`font-bold text-white ${subsidiOngkir > 0 ? 'line-through text-gray-500' : ''}`}>
                    {formatRupiah(shippingRate.price)}
                  </span>
                </div>
                {subsidiOngkir > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-400 font-bold">
                    <span>Subsidi Ongkir</span>
                    <span>-{formatRupiah(subsidiOngkir)}</span>
                  </div>
                )}
              </>
            )}
            
            {paymentMethod === 'cod' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Biaya Layanan COD (5%)</span>
                <span className="font-bold text-white">{formatRupiah(Math.round(subtotal * 0.05))}</span>
              </div>
            )}
            
            <div className="border-t border-white/20 pt-3 flex items-center justify-between">
              <span className="text-white font-bold text-lg">Total Pembayaran</span>
              <span className="font-extrabold text-[#D4AF37] text-lg">
                {formatRupiah(totalBayar)}
              </span>
            </div>
            
            <button onClick={handleCheckout} disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] hover:shadow-[#D4AF37]/30 text-black font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? 'Menyimpan...' : 'ORDER VIA WHATSAPP'} <Send size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
