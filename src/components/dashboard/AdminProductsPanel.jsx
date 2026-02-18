import React from 'react';
import { Edit, Package } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

export default function AdminProductsPanel({
  products,
  loading,
  selectedAdminProducts,
  toggleAdminProductSelection,
  handleAdminBulkEditOpen,
  handleEditProduct,
  setReorderingProduct,
  setReorderDestination,
  setShowReorderModal
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Daftar Produk</h3>
          <p className="text-xs text-gray-500">{products.length} produk terdaftar</p>
        </div>
        {selectedAdminProducts.length > 0 && (
          <button
            onClick={handleAdminBulkEditOpen}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:bg-[#F4D03F] transition w-full sm:w-auto justify-center"
          >
            <Edit size={16} /> Edit Batch ({selectedAdminProducts.length})
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={32} className="mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Loading...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-xl border border-white/10">
          <Package size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">Belum ada produk</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {products
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(p => {
              const hasVariants = p.name && p.name.toLowerCase().includes('paket komplit');
              const isSelected = selectedAdminProducts.includes(p.id);
              return (
                <div 
                  key={p.id} 
                  className={`bg-black/30 border rounded-xl p-3 sm:p-4 transition flex gap-3 sm:gap-4 ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/30'
                      : 'border-white/10 hover:border-[#D4AF37]/30'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex items-start pt-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAdminProductSelection(p.id)}
                      className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer accent-[#D4AF37]"
                    />
                  </div>

                  {/* Product Image */}
                  {p.image_url && (
                    <div className="w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                  )}
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0 space-y-1.5 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <p className="font-bold text-white text-sm sm:text-base line-clamp-2">{p.name}</p>
                      
                      {/* Price + Code row */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[#D4AF37] font-bold text-xs sm:text-sm">{formatRupiah(p.price)}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-mono">{p.product_code || 'N/A'}</p>
                      </div>
                      
                      {/* Commission + Position */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] sm:text-xs text-gray-400">{p.commission_rate}% komisi</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#D4AF37] font-bold">Pos:</span>
                          <span className="w-8 sm:w-10 px-1 py-0.5 bg-black/40 border border-white/20 rounded text-white text-[10px] sm:text-xs text-center font-bold">
                            {p.sort_order || 0}
                          </span>
                          <button
                            onClick={() => {
                              setReorderingProduct(p);
                              setReorderDestination(String(p.sort_order || 0));
                              setShowReorderModal(true);
                            }}
                            className="px-1.5 py-0.5 bg-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/50 transition"
                            title="Pindahkan ke posisi lain"
                          >
                            ↕
                          </button>
                        </div>
                      </div>
                      
                      {/* Variants Badge */}
                      {hasVariants && (
                        <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] sm:text-xs font-bold rounded">
                          + Varian
                        </span>
                      )}
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditProduct(p)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded-lg hover:bg-[#D4AF37]/40 transition w-full mt-2"
                    >
                      <Edit size={13} /> Edit
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
