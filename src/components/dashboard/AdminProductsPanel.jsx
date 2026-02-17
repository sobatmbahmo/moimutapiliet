import React from 'react';
import { Edit } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Daftar Produk ({products.length})</h3>
        {selectedAdminProducts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{selectedAdminProducts.length} dipilih</span>
            <button
              onClick={handleAdminBulkEditOpen}
              className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition flex items-center gap-2"
            >
              <Edit size={16} /> Edit Batch ({selectedAdminProducts.length})
            </button>
          </div>
        )}
      </div>
      
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
          <p className="text-gray-400">Belum ada produk</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {products
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(p => {
              const hasVariants = p.name && p.name.toLowerCase().includes('paket komplit');
              return (
                <div 
                  key={p.id} 
                  className={`bg-black/30 border rounded-lg p-4 transition flex gap-4 ${
                    selectedAdminProducts.includes(p.id)
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                      : 'border-white/10 hover:border-[#D4AF37]/50'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={selectedAdminProducts.includes(p.id)}
                      onChange={() => toggleAdminProductSelection(p.id)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </div>

                  {/* Left: Product Image (1:1 Square) */}
                  {p.image_url && (
                    <div className="w-32 h-32 flex-shrink-0">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                  )}
                  
                  {/* Right: Product Info */}
                  <div className="flex-1 space-y-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <p className="font-bold text-white line-clamp-2">{p.name}</p>
                      
                      {/* Harga & Kode (1 baris) */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <p className="text-[#D4AF37] font-bold">{formatRupiah(p.price)}</p>
                        <p className="text-gray-400">{p.product_code || 'N/A'}</p>
                      </div>
                      
                      {/* Komisi & Urutan (1 baris) */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400">{p.commission_rate}% komisi</p>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-[#D4AF37] font-bold">Pos:</label>
                          <span className="w-12 px-2 py-1 bg-black/40 border border-white/20 rounded text-white text-xs text-center font-bold">
                            {p.sort_order || 0}
                          </span>
                          <button
                            onClick={() => {
                              setReorderingProduct(p);
                              setReorderDestination(String(p.sort_order || 0));
                              setShowReorderModal(true);
                            }}
                            className="px-2 py-1 bg-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/50 transition"
                            title="Pindahkan ke posisi lain"
                          >
                            ↕
                          </button>
                        </div>
                      </div>
                      
                      {/* Variants Badge */}
                      {hasVariants && (
                        <div className="pt-1">
                          <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded">
                            + Varian Opsional
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditProduct(p)}
                      className="px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/40 transition w-full"
                    >
                      <Edit size={14} className="inline mr-1" /> Edit
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
