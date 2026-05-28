import React, { useState } from 'react';
import { Plus, Edit, Trash, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadSliderImage, createSlider, updateSlider, deleteSlider } from '../../lib/supabaseQueries';

export default function AdminSlidersPanel({ sliders, loading, setSliders, loadInitialData, setSuccessMsg, setErrorMsg }) {
  const [showModal, setShowModal] = useState(false);
  const [editingSlider, setEditingSlider] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    link: '',
    image_url: '',
    sort_order: sliders.length + 1,
    is_active: true
  });

  const handleOpenModal = (slider = null) => {
    if (slider) {
      setEditingSlider(slider);
      setForm({
        title: slider.title || '',
        link: slider.link || '',
        image_url: slider.image_url || '',
        sort_order: slider.sort_order || 0,
        is_active: slider.is_active
      });
    } else {
      setEditingSlider(null);
      setForm({
        title: '',
        link: '',
        image_url: '',
        sort_order: sliders.length + 1,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (JPEG/PNG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran maksimal gambar adalah 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg('');
      const result = await uploadSliderImage(file);
      if (result.success) {
        setForm(prev => ({ ...prev, image_url: result.publicUrl }));
        setSuccessMsg('Gambar berhasil diunggah!');
      } else {
        setErrorMsg('Gagal upload gambar: ' + result.error);
      }
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setErrorMsg('Judul slider harus diisi');
      return;
    }
    if (!form.image_url) {
      setErrorMsg('Gambar harus diupload');
      return;
    }

    try {
      if (editingSlider) {
        const res = await updateSlider(editingSlider.id, form);
        if (res.success) setSuccessMsg('Slider berhasil diperbarui');
        else throw new Error(res.error);
      } else {
        const res = await createSlider(form);
        if (res.success) setSuccessMsg('Slider baru berhasil ditambahkan');
        else throw new Error(res.error);
      }
      setShowModal(false);
      loadInitialData();
    } catch (error) {
      setErrorMsg('Gagal menyimpan: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus slider ini?')) return;
    try {
      const res = await deleteSlider(id);
      if (res.success) {
        setSuccessMsg('Slider berhasil dihapus');
        loadInitialData();
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      setErrorMsg('Gagal menghapus: ' + error.message);
    }
  };

  const handleToggleActive = async (slider) => {
    try {
      const res = await updateSlider(slider.id, { is_active: !slider.is_active });
      if (res.success) {
        loadInitialData();
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      setErrorMsg('Gagal merubah status: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-10">Memuat data...</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#D4AF37]">Manajemen Tampilan (Slider)</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#F4D03F] transition"
        >
          <Plus size={18} /> Tambah Banner
        </button>
      </div>

      <div className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
        {sliders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Belum ada slider yang ditambahkan.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {sliders.map(slider => (
              <div key={slider.id} className="p-4 flex gap-4 items-center flex-col sm:flex-row">
                <div className="w-full sm:w-48 aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img src={slider.image_url} alt={slider.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 w-full space-y-1">
                  <h3 className="font-bold text-lg text-white">{slider.title}</h3>
                  <p className="text-sm text-gray-400">Order: {slider.sort_order}</p>
                  {slider.link && (
                    <p className="text-xs text-blue-400 truncate max-w-xs">{slider.link}</p>
                  )}
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    slider.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {slider.is_active ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>
                <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                  <button
                    onClick={() => handleToggleActive(slider)}
                    className="flex-1 sm:flex-none p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-white text-sm"
                  >
                    {slider.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleOpenModal(slider)}
                    className="flex-1 sm:flex-none p-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 flex justify-center items-center"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(slider.id)}
                    className="flex-1 sm:flex-none p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 flex justify-center items-center"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">{editingSlider ? 'Edit Slider' : 'Tambah Slider'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Judul (Info Internal)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white"
                  placeholder="Banner Diskon Ramadhan"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Gambar (Rekomendasi: 16:9)</label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center">
                  {form.image_url ? (
                    <div className="relative aspect-video mb-3">
                      <img src={form.image_url} alt="Preview" className="w-full h-full object-cover rounded" />
                    </div>
                  ) : (
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-500 mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#D4AF37]/20 file:text-[#D4AF37] hover:file:bg-[#D4AF37]/30"
                  />
                  {isUploading && <p className="text-xs text-blue-400 mt-2">Sedang mengupload...</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Tautan / Link (Opsional)</label>
                <input
                  type="url"
                  value={form.link}
                  onChange={e => setForm({...form, link: e.target.value})}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white"
                  placeholder="https://vt.tiktok.com/..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-300 mb-1">Urutan</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded text-white"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm({...form, is_active: e.target.checked})}
                      className="w-4 h-4 rounded"
                    />
                    Status Aktif
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F4D03F] disabled:opacity-50"
              >
                Simpan
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-500/20 text-gray-300 font-bold rounded-lg hover:bg-gray-500/30"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
