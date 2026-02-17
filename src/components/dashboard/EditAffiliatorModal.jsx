import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal untuk edit data affiliator/mitra
 */
export default function EditAffiliatorModal({
  isOpen,
  onClose,
  form,
  setForm,
  loading,
  onSave
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Edit Mitra</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Nama */}
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Nama *</label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="Nama lengkap"
            />
          </div>

          {/* No HP & Email (2 cols) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">No HP</label>
              <input
                type="text"
                value={form.nomor_wa}
                onChange={(e) => setForm({ ...form, nomor_wa: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="628xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Password Hash */}
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Password (biarkan kosong jika tidak diubah)</label>
            <input
              type="password"
              value={form.password_hash}
              onChange={(e) => setForm({ ...form, password_hash: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="Masukkan password baru"
            />
          </div>

          {/* TikTok Accounts */}
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Akun TikTok (pisahkan dengan koma)</label>
            <textarea
              value={form.akun_tiktok}
              onChange={(e) => setForm({ ...form, akun_tiktok: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-16"
              placeholder="@akun1, @akun2, @akun3"
            />
          </div>

          {/* Bank Details (2 cols) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">Nama Bank</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="BRI, BNI, Mandiri, etc"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">No Rekening</label>
              <input
                type="text"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="1234567890"
              />
            </div>
          </div>

          {/* Saldo (Balance) */}
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Saldo Saat Ini (Rp)</label>
            <input
              type="number"
              value={form.current_balance}
              onChange={(e) => setForm({ ...form, current_balance: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="0"
            />
          </div>

          {/* Total Commission & Total Withdrawn (2 cols) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">Total Komisi (Rp)</label>
              <input
                type="number"
                value={form.total_commission}
                onChange={(e) => setForm({ ...form, total_commission: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#D4AF37] font-bold text-sm">Total Ditarik (Rp)</label>
              <input
                type="number"
                value={form.total_withdrawn}
                onChange={(e) => setForm({ ...form, total_withdrawn: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onSave}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
