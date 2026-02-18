import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, MapPin, ChevronDown, Info, Edit3, CreditCard } from 'lucide-react';
import { useReferral } from '../context/ReferralContext';
import { createOrder, addOrderItems, createOrGetUser } from '../lib/supabaseQueries';
import { generateOrderNumber } from '../lib/orderUtils';

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
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProv, setSelectedProv] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  useEffect(() => {
    if (isOpen && provinces.length === 0) {
      fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
        .then(response => response.json()).then(data => setProvinces(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleProvChange = (e) => {
    const provId = e.target.value;
    const provName = e.target.options[e.target.selectedIndex].text;
    setSelectedProv({ id: provId, name: provName });
    setSelectedCity(null); setSelectedDistrict(null); setRegencies([]); setDistricts([]);
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`)
      .then(res => res.json()).then(data => setRegencies(data));
  };

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    const cityName = e.target.options[e.target.selectedIndex].text;
    setSelectedCity({ id: cityId, name: cityName });
    setSelectedDistrict(null); setDistricts([]);
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${cityId}.json`)
      .then(res => res.json()).then(data => setDistricts(data));
  };

  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    const distName = e.target.options[e.target.selectedIndex].text;
    setSelectedDistrict({ id: distId, name: distName });
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.harga_produk * item.qty), 0);
  }, [cartItems]);

  // === FUNGSI KIRIM KE WHATSAPP DAN SIMPAN KE DATABASE ===
  const handleCheckout = async () => {
    if (!formData.name || !formData.phone || !selectedProv || !selectedCity || !selectedDistrict || !formData.detailAddress) {
      alert("Mohon lengkapi semua data alamat!");
      return;
    }

    setIsSaving(true);

    try {
      // Generate order number
      const orderNumResult = await generateOrderNumber();
      if (!orderNumResult.success) throw new Error('Gagal generate nomor order');

      // Build alamat lengkap
      const fullAddress = `${formData.detailAddress}, ${selectedDistrict.name}, ${selectedCity.name}, ${selectedProv.name}`;

      // Buat atau dapatkan user berdasarkan nomor WA
      const userResult = await createOrGetUser(formData.name, formData.phone, null, fullAddress);
      if (!userResult.success) throw new Error('Gagal membuat/mendapatkan user: ' + userResult.error);
      
      const userId = userResult.user.id;

      // Create order in database (no shipping cost yet - will be added manually by admin)
      const orderData = {
        order_number: orderNumResult.orderNumber,
        metode_bayar: paymentMethod,
        total_produk: subtotal,
        total_bayar: subtotal, // Will be updated when admin adds shipping cost
        alamat: fullAddress,
        nomor_wa: formData.phone,
        catatan: '',
        is_offline: false,
        affiliator_id: referralData.affiliatorId || null,
        payment_due_date: null,
        status: 'WAITING_CONFIRMATION' // Temporary status, admin will update
      };

      const createResult = await createOrder(userId, orderData);
      if (!createResult.success) throw new Error(createResult.error);

      // Add order items
      const itemsToAdd = cartItems.map(item => ({
        product_id: item.original_product_id || item.id, // Gunakan original ID jika ada varian
        qty: item.qty,
        harga_satuan: item.harga_produk,
        subtotal: item.harga_produk * item.qty,
        varian: item.variant_code || null // Simpan varian untuk Paket Komplit
      }));

      const addItemsResult = await addOrderItems(createResult.order.id, itemsToAdd);
      if (!addItemsResult.success) throw new Error(addItemsResult.error);

      console.log('✅ Order created successfully', {
        orderNumber: orderNumResult.orderNumber,
        orderId: createResult.order.id,
        itemsAdded: itemsToAdd.length,
        items: itemsToAdd
      });

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
      message += `Ongkos Kirim: *belum ditentukan (mohon dikonfirmasi)*\n`;
      message += `*Total: ${formatRupiah(subtotal)} (belum termasuk ongkir)*\n\n`;

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
      
      // === INFO AFFILIATOR ===
      if (hasReferral) {
        message += `🤝 *REFERRAL CODE: ${refCode}* ✓\n`; 
        message += `(Pesanan ini dari mitra terdaftar kami)\n\n`;
      }

      message += `✅ Pesanan sudah tersimpan di sistem. Mohon konfirmasi ongkir dan invoice.\n`;

      const adminNumber = "6285700800278"; 
      window.open(`https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`, '_blank');

      // Clear cart after successful order
      alert('✅ Pesanan berhasil disimpan! WhatsApp akan terbuka untuk konfirmasi dengan admin.');
      onClose();

    } catch (error) {
      console.error('❌ Checkout Error:', error);
      console.error('Error Details:', {
        message: error.message,
        stack: error.stack
      });
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
                
                <div className="relative"><select className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-gray-200 appearance-none cursor-pointer focus:border-[#D4AF37]" onChange={handleProvChange} value={selectedProv?.id || ""} style={{ colorScheme: 'dark' }}><option value="">-- Pilih Provinsi --</option>{provinces.map(p => <option key={p.id} value={p.id} className="bg-gray-800">{p.name}</option>)}</select><ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16}/></div>
                <div className="relative"><select className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-gray-200 appearance-none cursor-pointer focus:border-[#D4AF37] disabled:opacity-50" onChange={handleCityChange} value={selectedCity?.id || ""} disabled={!selectedProv} style={{ colorScheme: 'dark' }}><option value="">-- Pilih Kota/Kabupaten --</option>{regencies.map(r => <option key={r.id} value={r.id} className="bg-gray-800">{r.name}</option>)}</select><ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16}/></div>
                <div className="relative"><select className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-gray-200 appearance-none cursor-pointer focus:border-[#D4AF37] disabled:opacity-50" onChange={handleDistrictChange} value={selectedDistrict?.id || ""} disabled={!selectedCity} style={{ colorScheme: 'dark' }}><option value="">-- Pilih Kecamatan --</option>{districts.map(d => <option key={d.id} value={d.id} className="bg-gray-800">{d.name}</option>)}</select><ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16}/></div>

                <textarea rows="2" placeholder="Detail Jalan, Nomor Rumah, RT/RW..." className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" onChange={(e) => setFormData({...formData, detailAddress: e.target.value})}></textarea>
              </div>

              {/* PAYMENT METHOD SECTION */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="font-bold text-[#D4AF37] mb-4 flex items-center gap-2"><CreditCard size={18} /> Metode Pembayaran</h3>
                <div className="space-y-3">
                  {/* Transfer Option */}
                  <label className="flex items-center p-3 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-black/50 transition-all"
                    style={{ borderColor: paymentMethod === 'transfer' ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                    <input type="radio" name="payment" value="transfer" checked={paymentMethod === 'transfer'} 
                      onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4" />
                    <div className="ml-3 flex-1">
                      <p className="font-semibold text-white text-sm">💳 Transfer Bank</p>
                      <p className="text-xs text-gray-400">Bayar sebelum pengiriman diproses</p>
                    </div>
                  </label>

                  {/* COD Option */}
                  <label className="flex items-center p-3 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-black/50 transition-all"
                    style={{ borderColor: paymentMethod === 'cod' ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} 
                      onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4" />
                    <div className="ml-3 flex-1">
                      <p className="font-semibold text-white text-sm">🚚 COD (Bayar Nanti)</p>
                      <p className="text-xs text-gray-400">Bayar ketika barang tiba</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* INFO SECTION */}
              <div className="mt-6 bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-3 rounded-lg flex gap-3"><Info className="text-[#F4D03F] shrink-0" size={20} /><div className="text-xs text-[#F4D03F]/90"><p className="font-bold mb-1 text-[#F4D03F]">ℹ️ Info Pemesanan</p><p>Biaya ongkos kirim akan dikonfirmasi oleh admin. Pesanan Anda sudah tersimpan di sistem dan akan diproses segera.</p></div></div>
            </div>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-[#022c22] safe-area-bottom space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Subtotal Barang</span>
              <span className="font-bold text-white">{formatRupiah(subtotal)}</span>
            </div>
            <div className="border-t border-white/20 pt-3 flex items-center justify-between">
              <span className="text-gray-400 text-xs">*Biaya kirim akan dikonfirmasi admin</span>
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