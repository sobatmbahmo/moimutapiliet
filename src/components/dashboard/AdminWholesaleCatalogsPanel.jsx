import React, { useState, useEffect } from 'react';
import { Edit, Trash, Plus, Package } from 'lucide-react';
import { fetchWholesaleCatalogs, createWholesaleCatalog, updateWholesaleCatalog, deleteWholesaleCatalog } from '../../lib/supabaseQueries';

export default function AdminWholesaleCatalogsPanel({ setSuccessMsg, setErrorMsg }) {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nama_paket: '',
    min_qty: 1,
    harga_pcs: 0,
    keuntungan: ''
  });

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    setLoading(true);
    const result = await fetchWholesaleCatalogs();
    if (result.success) {
      setCatalogs(result.data);
    } else {
      setErrorMsg('Gagal memuat katalog grosir: ' + result.error);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (catalog = null) => {
    if (catalog) {
      setEditingId(catalog.id);
      setForm({
        nama_paket: catalog.nama_paket,
        min_qty: catalog.min_qty,
        harga_pcs: catalog.harga_pcs,
        keuntungan: catalog.keuntungan || ''
      });
    } else {
      setEditingId(null);
      setForm({
        nama_paket: '',
        min_qty: 1,
        harga_pcs: 0,
        keuntungan: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let result;
    if (editingId) {
      result = await updateWholesaleCatalog(editingId, form);
    } else {
      result = await createWholesaleCatalog(form);
    }

    if (result.success) {
      setSuccessMsg(`Paket berhasil ${editingId ? 'diperbarui' : 'ditambahkan'}!`);
      setShowModal(false);
      loadCatalogs();
    } else {
      setErrorMsg(`Gagal menyimpan paket: ${result.error}`);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus paket grosir ini?')) return;
    setLoading(true);
    const result = await deleteWholesaleCatalog(id);
    if (result.success) {
      setSuccessMsg('Paket berhasil dihapus!');
      loadCatalogs();
    } else {
      setErrorMsg('Gagal menghapus paket: ' + result.error);
    }
    setLoading(false);
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(number);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Katalog Grosir (Reseller)</h3>
          <p className="text-xs text-gray-500">
            {catalogs.length} paket tersedia
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition text-sm"
        >
          <Plus size={16} /> Tambah Paket Grosir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && catalogs.length === 0 ? (
          <div className="col-span-full py-10 text-center text-gray-500">Memuat data...</div>
        ) : catalogs.map(cat => (
          <div key={cat.id} className="bg-black/30 border border-white/10 p-4 rounded-xl relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => handleOpenModal(cat)} className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition"><Edit size={14}/></button>
              <button onClick={() => handleDelete(cat.id)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"><Trash size={14}/></button>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <Package className="text-[#D4AF37]" size={20} />
              <h4 className="font-bold text-[#D4AF37] uppercase">{cat.nama_paket}</h4>
            </div>
            
            <div className="space-y-1 mb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Min. Qty:</span>
                <span className="font-bold">{cat.min_qty} Pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Harga per Pcs:</span>
                <span className="font-bold text-white">{formatRupiah(cat.harga_pcs)}</span>
              </div>
            </div>

            {cat.keuntungan && (
              <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-white/10">
                <span className="font-semibold block mb-1">Benefit:</span>
                {cat.keuntungan}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 p-6 rounded-2xl w-full max-w-md animate-scale-up">
            <h3 className="text-xl font-bold text-[#D4AF37] mb-4">
              {editingId ? 'Edit Paket Grosir' : 'Tambah Paket Grosir'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nama Paket</label>
                <input
                  type="text"
                  name="nama_paket"
                  value={form.nama_paket}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  placeholder="Misal: Paket Pemula"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Minimal Qty (Pcs)</label>
                  <input
                    type="number"
                    name="min_qty"
                    value={form.min_qty}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Harga per Pcs</label>
                  <input
                    type="number"
                    name="harga_pcs"
                    value={form.harga_pcs}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Keuntungan Tambahan / Benefit (Opsional)</label>
                <textarea
                  name="keuntungan"
                  value={form.keuntungan}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#D4AF37] resize-none"
                  placeholder="Misal: Subsidi Ongkir 20Rb + Free 1 Tester"
                ></textarea>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
