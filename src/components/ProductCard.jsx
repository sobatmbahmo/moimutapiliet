import React from 'react';
import { ShoppingCart, ShoppingBag } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

export default function ProductCard({ product, onOpenModal }) {
  return (
    <div className="group bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-[#D4AF37]/40 shadow-lg hover:shadow-[#D4AF37]/30 hover:-translate-y-1 transition-all duration-500 flex flex-col h-full relative">
      
      {/* Efek kilau emas di pojok */}
      <div className="absolute -top-10 -left-10 w-20 h-20 bg-[#D4AF37]/20 blur-2xl rounded-full group-hover:bg-[#D4AF37]/40 transition-all"></div>

      <div 
        onClick={() => onOpenModal(product, 'cart')}
        className="aspect-square relative overflow-hidden cursor-pointer m-3 rounded-xl"
      >
        <img 
          src={product.image_url} 
          alt={product.nama_produk} 
          className="w-full h-full object-cover group-hover:scale-110 group-hover:brightness-110 transition duration-700"
          loading="lazy"
        />
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Nama Produk */}
        <h3 className="font-bold text-white text-sm line-clamp-1 mb-1 tracking-wide" title={product.nama_produk}>
          {product.nama_produk}
        </h3>
        
        {/* --- UPDATE: Tinggi diubah jadi h-10 agar muat 2 baris penuh --- */}
        <p className="text-xs text-gray-300 line-clamp-2 mb-4 leading-relaxed h-10 font-light">
          {product.deskripsi_produk || "Deskripsi produk belum tersedia."}
        </p>

        {/* Harga */}
        <div className="mb-4 mt-auto">
          <span className="font-extrabold text-lg text-[#F4D03F] drop-shadow-sm">
            {formatRupiah(product.harga_produk)}
          </span>
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => onOpenModal(product, 'cart')}
            className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black hover:from-white hover:to-white transition-all text-xs font-bold shadow-md shadow-[#D4AF37]/20 active:scale-95"
          >
            <ShoppingCart size={14} strokeWidth={2.5} />
            <span>ADD</span>
          </button>

          <button 
            onClick={() => onOpenModal(product, 'tiktok')}
            className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-black/40 border border-white/20 text-white hover:bg-white/20 transition text-xs font-bold backdrop-blur-sm active:scale-95"
          >
            <ShoppingBag size={14} />
            <span>TIKTOK</span>
          </button>
        </div>
      </div>
    </div>
  );
}