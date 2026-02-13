import React from 'react';
import { X } from 'lucide-react';

export default function MitraModals({ modal, setModal, onConfirm }) {
  if (!modal.show) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-[#D4AF37]/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[#D4AF37] font-bold text-lg uppercase">
            {modal.mode === 'approve' ? 'Terima Mitra' : modal.mode === 'delete' ? 'Hapus Mitra' : 'Edit Mitra'}
          </h3>
          <button onClick={() => setModal({ ...modal, show: false })} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>

        {modal.mode === 'delete' ? (
          <p className="text-gray-300 text-sm mb-6">Yakin ingin menghapus mitra <b>{modal.username}</b>?</p>
        ) : modal.mode === 'approve' ? (
          <p className="text-gray-300 text-sm mb-6">Setujui pendaftaran mitra <b>{modal.username}</b>?</p>
        ) : (
          <div className="space-y-3 mb-6">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Nama Lengkap</label>
              <input type="text" className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" value={modal.name} onChange={e => setModal({...modal, name: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Username</label>
              <input type="text" className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" value={modal.username} onChange={e => setModal({...modal, username: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">PIN</label>
              <input type="text" className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" value={modal.pin} onChange={e => setModal({...modal, pin: e.target.value})} />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setModal({ ...modal, show: false })} className="flex-1 py-2.5 text-gray-400 font-bold hover:text-white transition text-xs uppercase border border-white/10 rounded-xl">Batal</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-bold text-black text-xs uppercase shadow-lg ${modal.mode === 'delete' ? 'bg-red-500 hover:bg-red-400' : 'bg-[#D4AF37] hover:bg-[#f3ca40]'}`}>
            {modal.mode === 'delete' ? 'Hapus' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
