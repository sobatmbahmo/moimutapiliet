import React from 'react';
import { Edit, Package, Trash, Eye, EyeOff } from 'lucide-react';

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
  handleCreateProductClick,
  handleDeleteProduct,
  handleToggleProductStatus,
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleCreateProductClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition w-full sm:w-auto justify-center shadow-lg active:scale-95"
          >
            <Package size={16} /> Tambah Produk
          </button>
          {selectedAdminProducts.length > 0 && (
            <button
              onClick={handleAdminBulkEditOpen}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:bg-[#F4D03F] transition w-full sm:w-auto justify-center shadow-lg active:scale-95"
            >
              <Edit size={16} /> Edit Batch ({selectedAdminProducts.length})
            </button>
          )}
        </div>
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
              return (
                  <div 
                    key={p.id} 
                    className={`bg-black/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition border ${
                      p.is_active === false ? 'border-red-500/30 opacity-70' : 'border-[#D4AF37]/20 hover:bg-black/60'
                    }`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAdminProducts.includes(p.id)}
                          onChange={() => toggleAdminProductSelection(p.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-gray-900 cursor-pointer shrink-0"
                        />
                        <span className="text-[10px] font-bold text-gray-500 hidden sm:block">No. {p.sort_order}</span>
                      </div>
                      
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#042f2e] rounded-lg shrink-0 overflow-hidden relative border border-[#D4AF37]/30">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Package size={24} />
                          </div>
                        )}
                        {p.is_active === false && (
                          <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="text-[10px] font-bold text-white bg-red-600 px-1 rounded">DISCONTINUED</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="font-bold text-white text-sm sm:text-base line-clamp-1">{p.name}</p>
                        <div className="flex items-center gap-4">
                          <p className="text-[#D4AF37] font-bold text-xs sm:text-sm">{formatRupiah(p.price)}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 font-mono">{p.product_code || 'N/A'}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] sm:text-xs text-gray-400">{p.commission_rate}% komisi</p>
                          <button
                            onClick={() => {
                              setReorderingProduct(p);
                              setReorderDestination(String(p.sort_order || 0));
                              setShowReorderModal(true);
                            }}
                            className="text-[10px] text-[#D4AF37] underline"
                          >
                            Ubah Posisi
                          </button>
                        </div>
                        {hasVariants && (
                          <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded">
                            + Varian
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEditProduct(p)}
                        className="flex items-center justify-center gap-1 px-2 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded-lg hover:bg-[#D4AF37]/40 hover:text-white transition w-full active:scale-95"
                      >
                        <Edit size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="flex items-center justify-center gap-1 px-2 py-2 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/40 hover:text-white transition w-full active:scale-95"
                      >
                        <Trash size={12} /> Hapus
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
