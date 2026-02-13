import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, ExternalLink, Copy, ShoppingBag, Check } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

const VARIANTS = ['GGSA', 'INL', 'RHS', 'JRM', 'BB', 'MLB', 'SMP', 'DJS', 'PLN', 'APLN', 'KPLN'];

export default function ProductModal({ product, isOpen, onClose, mode, onAddToCart }) {
  if (!isOpen || !product) return null;

  const [qty, setQty] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showVariant, setShowVariant] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');
  const isTikTokMode = mode === 'tiktok';

  // Reset state saat modal dibuka/ditutup
  useEffect(() => {
    if (isOpen) {
      setQty(1);
      setShowVariant(false);
      setSelectedVariant('');
    }
  }, [isOpen, product]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(product.kode_produk);
    alert('Kode Produk berhasil disalin!');
  };

  const handleAction = () => {
    if (isTikTokMode) {
      window.open(product.link_tiktokshop, '_blank');
    } else {
      // Cek apakah produk adalah "Paket Komplit"
      if (product.nama_produk.toLowerCase().includes('paket komplit')) {
        setShowVariant(true);
        return;
      }

      onAddToCart(product, qty);
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1000); // Dipercepat jadi 1 detik agar user cepat kembali ke home
    }
  };

  const confirmVariant = () => {
    if (!selectedVariant) return alert("Silakan pilih varian terlebih dahulu!");

    // Modifikasi produk dengan varian yang dipilih agar unik di keranjang
    const variantProduct = {
      ...product,
      id: `${product.id}-${selectedVariant}`, // ID unik kombinasi untuk cart display
      original_product_id: product.id, // Simpan original UUID untuk database
      nama_produk: `${product.nama_produk} - ${selectedVariant}`, // Nama diperjelas
      variant_code: selectedVariant
    };

    onAddToCart(variantProduct, qty);
    setShowVariant(false);
    setShowSuccess(true);
    setTimeout(() => {
      onClose();
      setShowSuccess(false);
    }, 1000); // Dipercepat jadi 1 detik
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      
      {/* CSS Animasi Garis Emas Berputar */}
      <style>{`
        @keyframes border-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gold-border {
          background: linear-gradient(60deg, #022c22, #022c22, #D4AF37, #022c22, #022c22);
          background-size: 300% 300%;
          animation: border-rotate 4s ease infinite;
        }
      `}</style>

      {/* CONTAINER UTAMA DENGAN ANIMASI BORDER */}
      {/* Div luar ini berfungsi sebagai border yang bergerak */}
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col p-[2px] rounded-2xl animate-gold-border shadow-2xl shadow-[#D4AF37]/20 animate-slide-up">
        
        {/* Konten Modal (Background Gelap di atas Border) */}
        <div className="bg-[#042f2e] rounded-2xl relative flex flex-col w-full h-full overflow-hidden">
          
          {/* POP-UP SUKSES KECIL */}
          {showSuccess && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#042f2e] border border-[#D4AF37] p-5 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black mb-2 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                  <Check size={24} strokeWidth={4} />
                </div>
                <p className="text-white font-bold text-sm uppercase tracking-wider">Berhasil Masuk Keranjang</p>
              </div>
            </div>
          )}

          {/* POP-UP PILIH VARIAN (OVERLAY) */}
          {showVariant && (
            <div className="absolute inset-0 z-40 flex flex-col bg-[#042f2e] animate-fade-in">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-white text-lg uppercase tracking-wider">Pilih Varian</h3>
                <button onClick={() => setShowVariant(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs text-[#D4AF37] mb-3 italic">*Wajib pilih satu varian rasa/jenis:</p>
                <div className="grid grid-cols-3 gap-3">
                  {VARIANTS.map((v) => (
                    <button 
                      key={v} 
                      onClick={() => setSelectedVariant(v)}
                      className={`py-3 rounded-xl font-bold text-sm border transition-all ${selectedVariant === v ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg scale-105' : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/10'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-white/10">
                <button onClick={confirmVariant} className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black font-bold rounded-xl shadow-lg hover:shadow-[#D4AF37]/40 transition-all active:scale-95 flex items-center justify-center gap-2">
                  MASUKKAN KERANJANG <ShoppingCart size={18} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
          )}

          {/* Tombol Close */}
          <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 border border-white/10 transition z-20">
            <X size={20} />
          </button>

          {/* Wrapper Scrollable */}
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[#D4AF37]/50">
            {/* Gambar */}
            <div className="aspect-square bg-black/20 w-full relative">
            <img 
              src={product.image_url} 
              alt={product.nama_produk} 
              className="w-full h-full object-contain"
            />
            {isTikTokMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-[#F4D03F] mb-1">PENTING!</p>
                <p className="text-sm text-gray-200">Pilih varian dengan kode di bawah ini saat checkout.</p>
              </div>
            )}
            </div>

            <div className="p-6">
            <h2 className="text-xl font-bold text-white leading-tight mb-2">{product.nama_produk}</h2>
            
            <span className="text-2xl font-bold text-[#F4D03F] drop-shadow-sm">
              {formatRupiah(product.harga_produk)}
            </span>

            <p className="text-gray-300 text-sm mt-3 leading-relaxed font-light">
              {product.deskripsi_produk || "Tidak ada deskripsi tambahan."}
            </p>

            <hr className="my-5 border-white/10" />

            {/* KODE PRODUK (SELALU MUNCUL) */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kode Varian / SKU</label>
                <span className="text-[10px] text-[#D4AF37] italic">*Pilih kode ini saat order</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-center relative overflow-hidden group">
                   <span className="font-mono text-xl font-black text-[#D4AF37] tracking-widest relative z-10">{product.kode_produk || '-'}</span>
                   <div className="absolute inset-0 bg-[#D4AF37]/5 group-hover:bg-[#D4AF37]/10 transition-colors"></div>
                </div>
                <button onClick={handleCopyCode} className="p-3.5 bg-[#D4AF37] text-black rounded-lg hover:bg-[#F4D03F] transition shadow-lg active:scale-95" title="Salin Kode">
                  <Copy size={20} strokeWidth={2.5}/>
                </button>
              </div>
            </div>

            {!isTikTokMode && (
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="font-medium text-gray-300">Jumlah Beli</span>
                <div className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-lg px-2 py-1">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded">-</button>
                  <span className="font-bold w-4 text-center text-[#D4AF37]">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded">+</button>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button onClick={handleAction} className={`${isTikTokMode ? 'w-full' : 'flex-1'} py-3.5 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg ${isTikTokMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] hover:shadow-[#D4AF37]/40'}`}>
                {isTikTokMode ? (<>Lanjut ke TikTok <ExternalLink size={18} /></>) : (<>+ Keranjang WA <ShoppingCart size={18} strokeWidth={2.5}/></>)}
              </button>
              
              {!isTikTokMode && (
                <button 
                  onClick={() => window.open(product.link_tiktokshop, '_blank')}
                  className="aspect-square bg-black border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
                >
                  <ShoppingBag size={20} className="text-white" />
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}