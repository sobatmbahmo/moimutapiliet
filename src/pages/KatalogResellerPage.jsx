import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Package, Truck, MessageCircle } from 'lucide-react';
import { submitResellerRegistration } from '../lib/supabaseQueries';
import { supabase } from '../lib/supabaseClient';

export default function KatalogResellerPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    nama_lengkap: '',
    nomor_wa: '',
    alamat: '',
    target_penjualan: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      setErrorMsg('Gagal memuat katalog: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    const result = await submitResellerRegistration({
      ...form,
      status: 'pending'
    });

    if (result.success) {
      setSubmitSuccess(true);
      setForm({ nama_lengkap: '', nomor_wa: '', alamat: '', target_penjualan: '' });
    } else {
      setErrorMsg('Gagal mengirim pendaftaran: ' + result.error);
    }
    setSubmitting(false);
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(number);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#1A1A1A] border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-white/10 rounded-full transition text-[#D4AF37]"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Katalog Grosir & Reseller</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-10">
        
        {/* Banner Section */}
        <section className="bg-gradient-to-r from-[#D4AF37]/20 to-[#111111] border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-[#D4AF37] mb-4 uppercase">
              Gabung Jadi Reseller Kami!
            </h2>
            <p className="text-gray-300 mb-6 text-sm sm:text-base leading-relaxed">
              Dapatkan harga khusus pengambilan grosir (Min. 5 KG) dengan margin keuntungan yang sangat menarik. Kami melayani negosiasi fleksibel, prioritas stok, dan potensi subsidi ongkir. Pendaftaran 100% Gratis!
            </p>
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <span className="flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-lg">
                <CheckCircle size={16} /> Harga Spesial
              </span>
              <span className="flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-lg">
                <Truck size={16} /> Subsidi Ongkir
              </span>
              <span className="flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-lg">
                <MessageCircle size={16} /> Nego via WA
              </span>
            </div>
          </div>
        </section>

        {/* Catalog Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Package className="text-[#D4AF37]" size={28} />
            <h3 className="text-2xl font-bold">Daftar Harga Produk</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-10 text-gray-400 animate-pulse">Memuat katalog produk...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 bg-white/5 rounded-xl border border-white/10 text-gray-400">
              Belum ada produk yang tersedia saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map(product => {
                // Harga per pcs
                const pricePerPcs = product.price || 0;
                // Asumsi jika berat_produk tidak diset, gunakan default 200 gram
                const beratGrams = product.berat_produk || 200;
                // Hitung faktor ke 1 KG (1000 gram)
                const factor1KG = 1000 / beratGrams;
                // Harga Ecer 1 KG
                const hargaEcer1KG = pricePerPcs * factor1KG;
                // Harga Grosir
                const hargaGrosirKG = product.wholesale_price || 0;

                return (
                  <div key={product.id} className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden hover:border-[#D4AF37]/50 transition group flex flex-col h-full shadow-lg">
                    {/* Gambar Produk */}
                    <div className="w-full h-48 bg-black/40 relative">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Package size={48} />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded font-bold uppercase border border-white/10">
                        {beratGrams} Gram/Pcs
                      </div>
                    </div>

                    <div className="p-5 flex-grow flex flex-col">
                      <h4 className="text-lg font-bold text-white mb-4 leading-tight">
                        {product.name}
                      </h4>
                      
                      <div className="mt-auto space-y-3">
                        {/* Harga Ecer 1 KG */}
                        <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                          <p className="text-xs text-gray-400 mb-1">Harga untuk order 1kg:</p>
                          <p className="text-lg font-bold text-gray-200">{formatRupiah(hargaEcer1KG)}</p>
                        </div>
                        
                        {/* Harga Grosir Min 5 KG */}
                        <div className="p-3 bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 rounded-lg border border-[#D4AF37]/20">
                          <p className="text-xs text-[#D4AF37] font-medium mb-1 flex items-center gap-1.5">
                            Harga Grosir <span className="bg-[#D4AF37] text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Min 5KG</span>
                          </p>
                          <p className="text-xl font-black text-[#D4AF37]">
                            {hargaGrosirKG > 0 ? formatRupiah(hargaGrosirKG) : 'Tanya Admin'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Registration Form Section */}
        <section className="max-w-2xl mx-auto">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-center mb-2">Tertarik Menjadi Agen/Reseller?</h3>
            <p className="text-center text-gray-400 text-sm mb-8">
              Isi formulir di bawah ini. Tim admin kami akan segera menghubungi Anda melalui WhatsApp untuk mendiskusikan transaksi, negosiasi harga, dan pengiriman.
            </p>

            {submitSuccess ? (
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center">
                <CheckCircle className="text-green-500 mx-auto mb-3" size={48} />
                <h4 className="text-xl font-bold text-green-500 mb-2">Pendaftaran Berhasil!</h4>
                <p className="text-gray-300 text-sm">
                  Terima kasih telah mendaftar. Data Anda sudah masuk ke sistem kami. Silakan tunggu, admin kami akan segera menghubungi Anda melalui WhatsApp.
                </p>
                <button 
                  onClick={() => setSubmitSuccess(false)}
                  className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition"
                >
                  Daftar Lagi
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
                    {errorMsg}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nama Lengkap / Nama Toko</label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    value={form.nama_lengkap}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37] transition"
                    placeholder="Contoh: Budi Santoso / Toko Maju Jaya"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nomor WhatsApp Aktif</label>
                  <input
                    type="tel"
                    name="nomor_wa"
                    value={form.nomor_wa}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37] transition"
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Alamat Lengkap (Kecamatan & Kota)</label>
                  <textarea
                    name="alamat"
                    value={form.alamat}
                    onChange={handleInputChange}
                    required
                    rows="3"
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37] transition resize-none"
                    placeholder="Contoh: Jl. Merdeka No. 1, Kec. Sukamaju, Kota Bandung"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Target Penjualan (Opsional)</label>
                  <input
                    type="text"
                    name="target_penjualan"
                    value={form.target_penjualan}
                    onChange={handleInputChange}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37] transition"
                    placeholder="Contoh: Jualan di kampus, Dropship e-commerce, dsb."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#D4AF37] hover:bg-[#F4D03F] text-black font-bold py-4 rounded-xl transition disabled:opacity-50 mt-4"
                >
                  {submitting ? 'Mengirim Data...' : 'Kirim Pendaftaran Reseller'}
                </button>
              </form>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
