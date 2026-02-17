import React, { useState } from 'react';
import { X, Trash } from 'lucide-react';

/**
 * Modal untuk menambah atau mengedit customer
 */
export default function AddCustomerModal({
  isOpen,
  onClose,
  editingCustomer,
  form,
  setForm,
  onSubmit,
  onDelete,
  loading,
  errorMsg
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localError, setLocalError] = useState('');
  
  if (!isOpen) return null;

  const handleClose = () => {
    setForm({ nama: '', nomor_wa: '', alamat: '' });
    setLocalError('');
    onClose();
  };

  const handleSubmit = async () => {
    // Local validation
    if (!form.nama?.trim()) {
      setLocalError('Nama customer harus diisi');
      return;
    }
    if (!form.nomor_wa?.trim()) {
      setLocalError('Nomor WhatsApp harus diisi');
      return;
    }
    setLocalError('');
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error display */}
        {(localError || errorMsg) && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {localError || errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm">Nama</label>
          <input
            type="text"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
            placeholder="Nama customer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm">Nomor WhatsApp</label>
          <input
            type="tel"
            value={form.nomor_wa}
            onChange={(e) => setForm({ ...form, nomor_wa: e.target.value })}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
            placeholder="628xxxxxxxxx"
            disabled={!!editingCustomer}
          />
          {editingCustomer && (
            <p className="text-xs text-gray-400">Nomor WA tidak bisa diubah</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm">Alamat</label>
          <textarea
            value={form.alamat}
            onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-16"
            placeholder="Alamat (opsional)"
          />
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && editingCustomer && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg space-y-3">
            <p className="text-red-300 text-sm font-bold">⚠️ Yakin hapus customer ini?</p>
            <p className="text-gray-400 text-xs">Customer "{editingCustomer.nama}" akan dihapus permanen.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete(editingCustomer.id);
                  setShowDeleteConfirm(false);
                }}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : (editingCustomer ? 'Update Customer' : 'Simpan Customer')}
          </button>
          {editingCustomer && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-4 py-3 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Trash size={18} />
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-gray-600/50 text-gray-300 font-bold rounded-lg hover:bg-gray-600/70 transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
