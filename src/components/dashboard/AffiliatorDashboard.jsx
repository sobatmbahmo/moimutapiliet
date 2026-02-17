import React, { useState } from 'react';
import { LogOut, Edit, Copy, Share2, Plus, X } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

export default function AffiliatorDashboard({
  user,
  onLogout,
  products,
  bindings,
  withdrawals,
  summary,
  loading,
  successMsg,
  errorMsg,
  setSuccessMsg,
  setErrorMsg,
  // Withdrawal form
  showWithdrawalForm,
  setShowWithdrawalForm,
  withdrawalForm,
  setWithdrawalForm,
  handleRequestWithdrawal,
  // Product link
  showEditProductLinkModal,
  editingProductForLink,
  productLinkForm,
  setProductLinkForm,
  handleEditProductLink,
  handleSaveProductLink,
  setShowEditProductLinkModal,
  // Share product
  showShareProductModal,
  sharingProduct,
  handleShareProduct,
  setShowShareProductModal,
  setSharingProduct,
  generateAffiliatorLink,
  copyLinkToClipboard,
  shareToWhatsApp,
  // Bulk edit
  selectedProducts,
  toggleProductSelection,
  showBulkEditModal,
  setShowBulkEditModal,
  handleBulkEditOpen,
  bulkEditForm,
  setBulkEditForm,
  bulkLinkInput,
  setBulkLinkInput,
  applyLinkToAll,
  handleBulkEditSave,
  // Edit affiliator
  handleEditAffiliator
}) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#042f2e] to-[#022c22] text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#D4AF37]">Dashboard Mitra</h1>
            <p className="text-gray-400">Halo {user.nama}!</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Saldo</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{formatRupiah(summary.currentBalance)}</p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Penghasilan</p>
              <p className="text-2xl font-bold text-green-400">{formatRupiah(summary.totalEarnings)}</p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Pelanggan</p>
              <p className="text-2xl font-bold text-blue-400">{summary.customerCount}</p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Pesanan Terjual</p>
              <p className="text-2xl font-bold text-purple-400">{summary.orderCount}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
          {['overview', 'products', 'customers', 'withdrawals'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold transition whitespace-nowrap ${
                activeTab === tab 
                  ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'products' ? 'Produk' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-black/30 border border-[#D4AF37]/30 rounded-lg p-4">
              <h3 className="font-bold text-[#D4AF37] mb-3">📌 Link Referral Anda</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}?ref=${user.id}`}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?ref=${user.id}`);
                    setSuccessMsg('Link tersalin!');
                    setTimeout(() => setSuccessMsg(''), 2000);
                  }}
                  className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded hover:bg-[#F4D03F] transition"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#D4AF37] mb-4">🛍️ Produk untuk Affiliasi TikTokShop</h3>
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{selectedProducts.length} dipilih</span>
                  <button
                    onClick={handleBulkEditOpen}
                    className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition flex items-center gap-2"
                  >
                    <Edit size={16} /> Edit Batch ({selectedProducts.length})
                  </button>
                </div>
              )}
            </div>

            {products.length === 0 ? (
              <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
                <p className="text-gray-400">Belum ada produk tersedia</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {products
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map(p => (
                    <div 
                      key={p.id} 
                      className={`bg-black/30 border rounded-lg p-4 transition ${
                        selectedProducts.includes(p.id)
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                          : 'border-white/10 hover:border-[#D4AF37]/30'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Checkbox */}
                        <div className="flex items-start pt-1">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(p.id)}
                            onChange={() => toggleProductSelection(p.id)}
                            className="w-5 h-5 cursor-pointer"
                          />
                        </div>

                        {/* Product Image */}
                        {p.image_url && (
                          <div className="w-24 h-24 flex-shrink-0">
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                          </div>
                        )}
                        
                        {/* Product Info */}
                        <div className="flex-1">
                          <p className="font-bold text-white text-lg mb-1">{p.name}</p>
                          <p className="text-[#D4AF37] font-bold text-lg mb-2">{formatRupiah(p.price)}</p>
                          <p className="text-xs text-gray-400">Kode: {p.product_code || 'N/A'}</p>
                          {p.afiliasi_tiktok && (
                            <p className="text-xs text-green-300 mt-1">
                              🔗 TikTokShop Link: 
                              <a href={p.afiliasi_tiktok} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline ml-1">
                                Buka
                              </a>
                            </p>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 h-fit">
                          <button
                            onClick={() => handleEditProductLink(p)}
                            className="px-3 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold rounded hover:bg-[#D4AF37]/40 transition"
                          >
                            <Edit size={14} className="inline mr-1" /> Edit Link
                          </button>
                          <button
                            onClick={() => handleShareProduct(p)}
                            className="px-3 py-2 bg-green-500/20 text-green-300 text-xs font-bold rounded hover:bg-green-500/40 transition"
                          >
                            <Share2 size={14} className="inline mr-1" /> Share
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            
            {/* Edit TikTok Account Info */}
            <div className="mt-6 bg-black/30 border border-[#D4AF37]/30 rounded-lg p-4">
              <h4 className="font-bold text-[#D4AF37] mb-3">📱 Manajemen Akun TikTok</h4>
              <p className="text-sm text-gray-400 mb-3">
                Perbarui akun TikTok Anda untuk hasil affiliate yang lebih baik.
              </p>
              <button
                onClick={() => handleEditAffiliator(user)}
                className="w-full px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
              >
                Edit Profil Mitra
              </button>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-4">
            <h3 className="font-bold text-[#D4AF37]">Pelanggan Terikat (90 hari)</h3>
            {bindings.length === 0 ? (
              <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
                <p className="text-gray-400">Tidak ada pelanggan terikat</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {bindings.map(b => (
                  <div key={b.id} className="bg-black/30 border border-white/10 rounded p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{b.users?.nama}</p>
                      <p className="text-sm text-gray-400">{b.users?.nomor_wa}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-[#D4AF37]">Berakhir: {new Date(b.end_date).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowWithdrawalForm(true)}
              className="w-full px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Buat Permintaan Penarikan
            </button>

            {withdrawals.length === 0 ? (
              <div className="text-center py-8 bg-black/30 rounded-lg border border-white/10">
                <p className="text-gray-400">Belum ada riwayat penarikan</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {withdrawals.map(w => (
                  <div key={w.id} className="bg-black/30 border border-white/10 rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-[#D4AF37]">{formatRupiah(w.nominal)}</p>
                        <p className="text-sm text-gray-400">{w.bank_name} - {w.account_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        w.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {w.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(w.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Withdrawal Modal */}
        {showWithdrawalForm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white">Buat Permintaan Penarikan</h2>

              <div className="space-y-2">
                <label className="text-[#D4AF37] font-bold text-sm">Nominal (Rp)</label>
                <input
                  type="number"
                  value={withdrawalForm.nominal}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, nominal: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                  placeholder="Minimal Rp50.000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#D4AF37] font-bold text-sm">Nama Bank</label>
                <input
                  type="text"
                  value={withdrawalForm.bank_name}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, bank_name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                  placeholder="Contoh: BRI"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#D4AF37] font-bold text-sm">Atas Nama Rekening</label>
                <input
                  type="text"
                  value={withdrawalForm.account_name}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                  placeholder="Nama di rekening"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#D4AF37] font-bold text-sm">Nomor Rekening</label>
                <input
                  type="text"
                  value={withdrawalForm.account_number}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_number: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
                  placeholder="1234567890"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRequestWithdrawal}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] disabled:opacity-50"
                >
                  {loading ? 'Mengirim...' : 'Kirim Permintaan'}
                </button>
                <button
                  onClick={() => setShowWithdrawalForm(false)}
                  className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Link Modal */}
        {showEditProductLinkModal && editingProductForLink && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white">Edit Link TikTok Affiliate</h2>
              <p className="text-sm text-gray-400">{editingProductForLink.name}</p>

              <div className="space-y-2">
                <label className="text-[#D4AF37] font-bold text-sm">Link TikTok Shop Affiliate <span className="text-red-400">*</span></label>
                <input
                  type="url"
                  placeholder="https://vt.tiktok.com/..."
                  value={productLinkForm.tiktok_shop}
                  onChange={(e) => setProductLinkForm({ ...productLinkForm, tiktok_shop: e.target.value })}
                  className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-[#D4AF37]"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Paste link TikTok Shop affiliate Anda di sini agar komisi tetap masuk ke akun Anda.
                </p>
              </div>

              {errorMsg && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSaveProductLink}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : '💾 Simpan Link'}
                </button>
                <button
                  onClick={() => {
                    setShowEditProductLinkModal(false);
                    setProductLinkForm({ tiktok_shop: '' });
                    setErrorMsg('');
                  }}
                  className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Product Modal */}
        {showShareProductModal && sharingProduct && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white">🔗 Share Produk</h2>
              <p className="text-sm text-gray-400">{sharingProduct.name}</p>

              {/* Affiliate Link */}
              <div className="space-y-2 bg-black/30 border border-white/10 rounded-lg p-4">
                <label className="text-[#D4AF37] font-bold text-sm">Link Affiliasi Anda:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generateAffiliatorLink(sharingProduct)}
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-xs"
                  />
                  <button
                    onClick={() => copyLinkToClipboard(sharingProduct)}
                    className="px-3 py-2 bg-[#D4AF37] text-black font-bold rounded hover:bg-[#F4D03F] transition"
                    title="Salin ke clipboard"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Share Methods */}
              <div className="space-y-2 pt-2">
                <p className="text-sm text-gray-400 font-bold">Bagikan ke:</p>
                <button
                  onClick={() => shareToWhatsApp(sharingProduct)}
                  className="w-full px-4 py-3 bg-green-500/20 text-green-300 font-bold rounded-lg hover:bg-green-500/30 transition flex items-center justify-center gap-2"
                >
                  💬 WhatsApp
                </button>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-xs">
                <p>💡 <strong>Tips:</strong> Setiap orang yang klik link ini akan masuk sebagai customer Anda, dan Anda akan mendapat komisi dari pesanan mereka!</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowShareProductModal(false);
                  setSharingProduct(null);
                }}
                className="w-full px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Bulk Edit TikTok Links Modal */}
        {showBulkEditModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
            <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl p-6 space-y-4 my-8">
              <h2 className="text-2xl font-bold text-white">📝 Edit Batch - Link TikTok Affiliate</h2>
              <p className="text-sm text-gray-400">Masukkan link TikTok Shop Affiliate untuk {selectedProducts.length} produk yang dipilih</p>

              {/* Apply to All Section */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                <label className="text-green-300 font-bold text-sm">🚀 Terapkan Link yang Sama ke Semua Produk</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://vt.tiktok.com/..."
                    value={bulkLinkInput}
                    onChange={(e) => setBulkLinkInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-green-500"
                  />
                  <button
                    onClick={applyLinkToAll}
                    disabled={!bulkLinkInput.trim()}
                    className="px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Product List with Link Inputs */}
              <div>
                <label className="text-[#D4AF37] font-bold text-sm mb-3 block">⬇️ Edit Manual per Produk (opsional)</label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedProducts.map((productId) => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return null;

                    return (
                      <div key={productId} className="bg-black/30 border border-white/10 rounded-lg p-3">
                        <p className="text-white font-bold text-sm mb-2">{product.name}</p>
                        <input
                          type="url"
                          placeholder="https://vt.tiktok.com/..."
                          value={bulkEditForm[productId] || ''}
                          onChange={(e) => setBulkEditForm({
                            ...bulkEditForm,
                            [productId]: e.target.value
                          })}
                          className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white text-sm focus:border-[#D4AF37]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBulkEditSave}
                  className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition"
                >
                  ✅ Simpan {selectedProducts.length} Link
                </button>
                <button
                  onClick={() => {
                    setShowBulkEditModal(false);
                    setBulkEditForm({});
                    setBulkLinkInput('');
                  }}
                  className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 font-bold rounded-lg hover:bg-red-500/30 transition"
                >
                  Batal
                </button>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-xs">
                <p>💡 <strong>Tips:</strong> Gunakan "Apply" untuk mengisi semua otomatis, atau edit manual untuk produk tertentu</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
