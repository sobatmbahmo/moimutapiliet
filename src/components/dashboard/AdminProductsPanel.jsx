import React, { useState, useEffect } from 'react';
import { Edit, Package, Trash, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { bulkUpdateProductOrder } from '../../lib/supabaseQueries';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

// Sortable Item Component
function SortableProductCard({ p, selectedAdminProducts, toggleAdminProductSelection, handleEditProduct, handleDeleteProduct }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative'
  };

  const hasVariants = p.name && p.name.toLowerCase().includes('paket komplit');

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-black/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition border ${
        p.is_active === false ? 'border-red-500/30 opacity-70' : 'border-[#D4AF37]/20 hover:bg-black/60'
      }`}
    >
      <div className="flex items-center gap-4 w-full">
        <div className="flex flex-col items-center justify-center gap-2">
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="cursor-grab hover:text-[#D4AF37] text-gray-500 active:cursor-grabbing p-1 -ml-2">
            <GripVertical size={20} />
          </div>
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
            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover pointer-events-none" loading="lazy" />
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
          </div>
          {hasVariants && (
            <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded">
              + Varian
            </span>
          )}
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto z-10 relative">
        <button
          onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }}
          className="flex items-center justify-center gap-1 px-2 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded-lg hover:bg-[#D4AF37]/40 hover:text-white transition w-full active:scale-95"
        >
          <Edit size={12} /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }}
          className="flex items-center justify-center gap-1 px-2 py-2 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/40 hover:text-white transition w-full active:scale-95"
        >
          <Trash size={12} /> Hapus
        </button>
      </div>
    </div>
  );
}

export default function AdminProductsPanel({
  products,
  loading,
  selectedAdminProducts,
  toggleAdminProductSelection,
  handleAdminBulkEditOpen,
  handleEditProduct,
  handleCreateProductClick,
  handleDeleteProduct
}) {
  const [localProducts, setLocalProducts] = useState([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Only update local state if no unsaved changes to prevent overwriting user's ongoing dragging
    if (!hasOrderChanged && products) {
      setLocalProducts([...products].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    }
  }, [products, hasOrderChanged]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setLocalProducts((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Automatically re-assign sort_order sequentially
        const updated = reordered.map((item, index) => ({
          ...item,
          sort_order: index + 1
        }));
        
        return updated;
      });
      setHasOrderChanged(true);
      setSaveSuccessMsg('');
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    setSaveSuccessMsg('');
    
    // Create an array of updates mapped to id and new sort_order
    const updates = localProducts.map(p => ({
      id: p.id,
      sort_order: p.sort_order
    }));

    const result = await bulkUpdateProductOrder(updates);
    
    if (result.success) {
      setHasOrderChanged(false);
      setSaveSuccessMsg('Susunan produk berhasil disimpan!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } else {
      alert('Gagal menyimpan susunan: ' + result.error);
    }
    setIsSavingOrder(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Daftar Produk</h3>
          <p className="text-xs text-gray-500">{products.length} produk terdaftar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {hasOrderChanged && (
            <button
              onClick={handleSaveOrder}
              disabled={isSavingOrder}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg active:scale-95 disabled:opacity-50 flex-1 sm:flex-none justify-center"
            >
              {isSavingOrder ? 'Menyimpan...' : 'Simpan Susunan Baru'}
            </button>
          )}

          <button
            onClick={handleCreateProductClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition shadow-lg active:scale-95 flex-1 sm:flex-none justify-center"
          >
            <Package size={16} /> Tambah Produk
          </button>
          
          {selectedAdminProducts.length > 0 && (
            <button
              onClick={handleAdminBulkEditOpen}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:bg-[#F4D03F] transition justify-center shadow-lg active:scale-95 flex-1 sm:flex-none"
            >
              <Edit size={16} /> Edit Batch ({selectedAdminProducts.length})
            </button>
          )}
        </div>
      </div>
      
      {saveSuccessMsg && (
        <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg text-sm font-bold animate-pulse">
          {saveSuccessMsg}
        </div>
      )}

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
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {/* Note: changed grid-cols-1 md:grid-cols-2 lg:grid-cols-3 to flex col for drag and drop to look cleaner */}
          <SortableContext 
            items={localProducts.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3 sm:gap-4">
              {localProducts.map(p => (
                <SortableProductCard 
                  key={p.id}
                  p={p}
                  selectedAdminProducts={selectedAdminProducts}
                  toggleAdminProductSelection={toggleAdminProductSelection}
                  handleEditProduct={handleEditProduct}
                  handleDeleteProduct={handleDeleteProduct}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
