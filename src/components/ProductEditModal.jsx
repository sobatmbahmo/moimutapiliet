import React from 'react';
import { Package, X, Link2, Hash, Percent } from 'lucide-react';

const ProductEditModal = ({ modal, setModal, onConfirm }) => {
  if (!modal.show) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md no-print">
      <div className="bg-[#0f172a] border border-[#D4AF37]/50 rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-slide-up">
        <div className="flex justify-end mb-2">
           <button onClick={() => setModal({ ...modal, show: false })} className="text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        <div className="w-16 h-16 bg-[#D4AF37]/20 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><Package size={32}/></div>
        <h3 className="text-white font-black text-xl mb-6 text-center uppercase tracking-tight">Edit Detail Produk</h3>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Nama Produk</label>
            <input type="text" className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37] text-sm uppercase font-bold" value={modal.name} onChange={(e) => setModal({...modal, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold ml-1 flex items-center gap-1">Harga Jual</label>
              <input type="number" className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-[#D4AF37] outline-none focus:border-[#D4AF37] text-sm font-mono font-bold" value={modal.price} onChange={(e) => setModal({...modal, price: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold ml-1 flex items-center gap-1"><Hash size={10}/> Urutan</label>
              <input type="number" className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37] text-sm font-mono" value={modal.sort} onChange={(e) => setModal({...modal, sort: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1 flex items-center gap-1"><Link2 size={10}/> Link TikTok</label>
            <input type="text" className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37] text-[10px] font-mono" value={modal.link} onChange={(e) => setModal({...modal, link: e.target.value})} placeholder="https://..." />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1 flex items-center gap-1"><Percent size={10}/> Komisi Mitra</label>
            <input type="number" className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37] text-sm font-mono" value={modal.commission} onChange={(e) => setModal({...modal, commission: e.target.value})} />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">URL Gambar Produk</label>
            <input type="text" className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#D4AF37] text-[10px]" value={modal.image_url} onChange={(e) => setModal({...modal, image_url: e.target.value})} placeholder="https://..." />
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setModal({ ...modal, show: false })} className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition uppercase text-xs">Batal</button>
          <button onClick={onConfirm} className="flex-1 bg-[#D4AF37] text-black py-3 rounded-xl font-black hover:bg-[#f3ca40] transition active:scale-95 uppercase text-xs shadow-lg shadow-[#D4AF37]/20">Simpan</button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;
