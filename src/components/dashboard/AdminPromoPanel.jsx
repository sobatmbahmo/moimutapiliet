import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getSetting, updateSetting } from '../../lib/supabaseQueries';

export default function AdminPromoPanel() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [promoConfig, setPromoConfig] = useState({
    is_active: true,
    title: "PROMO SPESIAL HARI INI \uD83C\uDF89",
    content: "Belanja 60Rb Subsidi Ongkir <span class=\"font-bold text-[#D4AF37]\">5Rb</span>\nBelanja 100Rb Subsidi Ongkir <span class=\"font-bold text-[#D4AF37]\">10Rb</span>"
  });

  useEffect(() => {
    loadPromoConfig();
  }, []);

  const loadPromoConfig = async () => {
    setLoading(true);
    const res = await getSetting('promo_banner');
    if (res.success && res.value) {
      setPromoConfig(res.value);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    
    const res = await updateSetting('promo_banner', promoConfig);
    if (res.success) {
      setSuccessMsg('Pengaturan Promo berhasil disimpan! Refresh halaman utama untuk melihat perubahan.');
    } else {
      setErrorMsg(res.error || 'Gagal menyimpan pengaturan');
    }
    
    setSaving(false);
  };

  const toggleVisibility = () => {
    setPromoConfig(prev => ({ ...prev, is_active: !prev.is_active }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#D4AF37]">Manajemen Promo</h1>
          <p className="text-gray-400 mt-1">Atur banner promo yang muncul di halaman utama</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')}><AlertCircle size={18} /></button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')}><AlertCircle size={18} /></button>
        </div>
      )}

      <div className="bg-[#022c22] border border-[#D4AF37]/30 rounded-2xl p-6 space-y-6">
        
        {/* Toggle Visibility */}
        <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/10">
          <div>
            <p className="text-white font-bold text-lg">Status Banner Promo</p>
            <p className="text-gray-400 text-sm">Tampilkan atau sembunyikan banner promo di beranda</p>
          </div>
          <button 
            onClick={toggleVisibility}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              promoConfig.is_active 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
            }`}
          >
            {promoConfig.is_active ? (
              <><Eye size={18} /> Sedang Tampil</>
            ) : (
              <><EyeOff size={18} /> Disembunyikan</>
            )}
          </button>
        </div>

        {/* Input Title */}
        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm block">Judul Promo (Title)</label>
          <input 
            type="text" 
            value={promoConfig.title}
            onChange={(e) => setPromoConfig({...promoConfig, title: e.target.value})}
            className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white focus:border-[#D4AF37]/50 focus:outline-none transition"
            placeholder="Contoh: PROMO SPESIAL HARI INI \uD83C\uDF89"
          />
        </div>

        {/* Input Content */}
        <div className="space-y-2">
          <label className="text-[#D4AF37] font-bold text-sm block flex items-center gap-2">
            Isi Promo (Content HTML/Text)
          </label>
          <p className="text-xs text-gray-400 mb-2">Kamu bisa menggunakan tag HTML seperti &lt;span class="text-[#D4AF37]"&gt; untuk warna teks emas.</p>
          <textarea 
            value={promoConfig.content}
            onChange={(e) => setPromoConfig({...promoConfig, content: e.target.value})}
            className="w-full h-40 px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white focus:border-[#D4AF37]/50 focus:outline-none transition font-mono text-sm"
            placeholder="Ketikkan teks promo atau HTML di sini..."
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#F4D03F] transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>

      </div>

      {/* Preview Section */}
      <div className="bg-[#022c22]/50 border border-white/10 rounded-2xl p-6 mt-8">
        <h2 className="text-[#D4AF37] font-bold mb-4">Preview Tampilan Promo (Simulasi)</h2>
        {promoConfig.is_active ? (
          <div className="bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/10 to-[#042f2e] border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg relative overflow-hidden max-w-3xl">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-2xl"></div>
            <div className="bg-[#D4AF37] text-black p-3 rounded-full shrink-0 relative z-10 shadow-md">
              <div className="w-6 h-6 border-2 border-black rounded-sm"></div>
            </div>
            <div className="relative z-10">
              <h3 className="text-[#D4AF37] font-extrabold text-sm sm:text-base leading-tight mb-1">{promoConfig.title}</h3>
              <div 
                className="text-white text-xs sm:text-sm font-medium space-y-1"
                dangerouslySetInnerHTML={{ __html: promoConfig.content.replace(/\n/g, '<br/>') }}
              />
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic p-4 border border-dashed border-gray-600 rounded-xl text-center">
            Banner promo sedang disembunyikan dan tidak akan muncul di beranda.
          </div>
        )}
      </div>

    </div>
  );
}
