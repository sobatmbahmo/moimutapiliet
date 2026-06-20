import React, { useState, useEffect } from 'react';
import { Save, Database, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { getSetting, updateSetting, getAllDatabaseBackup } from '../../lib/supabaseQueries';

export default function AdminSystemPanel() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [resellerConfig, setResellerConfig] = useState({
    title: "GABUNG JADI RESELLER KAMI!",
    description: "Dapatkan harga khusus pengambilan grosir (Min. 5 KG) dengan margin keuntungan yang sangat menarik. Kami melayani negosiasi fleksibel, prioritas stok, dan potensi subsidi ongkir. Pendaftaran 100% Gratis!"
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const res = await getSetting('reseller_config');
    if (res.success && res.value) {
      setResellerConfig(res.value);
    }
    setLoading(false);
  };

  const handleSaveResellerConfig = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    
    const res = await updateSetting('reseller_config', resellerConfig);
    if (res.success) {
      setSuccessMsg('Pengaturan Teks Reseller berhasil disimpan!');
    } else {
      setErrorMsg(res.error || 'Gagal menyimpan pengaturan');
    }
    
    setSaving(false);
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    
    const res = await getAllDatabaseBackup();
    
    if (res.success) {
      const jsonString = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `backup-toko-${dateStr}.json`;
      
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMsg('Backup berhasil diunduh ke perangkat Anda! Silakan simpan file tersebut ke Google Drive Anda.');
    } else {
      setErrorMsg(res.error || 'Gagal membuat backup database');
    }
    
    setBackupLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-[#022c22] rounded-xl border border-white/10 p-6 animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded mb-6"></div>
        <div className="space-y-4">
          <div className="h-10 w-full bg-white/10 rounded"></div>
          <div className="h-32 w-full bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-green-500/20 text-green-300 p-4 rounded-lg flex items-center gap-2 border border-green-500/50">
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/20 text-red-300 p-4 rounded-lg flex items-center gap-2 border border-red-500/50">
          <AlertCircle size={20} />
          {errorMsg}
        </div>
      )}

      <div className="bg-[#022c22] rounded-xl shadow-lg border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Pengaturan Teks Katalog Reseller
          </h2>
          <p className="text-sm text-gray-400 mt-1">Sesuaikan teks promosi yang muncul di halaman Grosir & Reseller</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Judul Promosi</label>
            <input
              type="text"
              value={resellerConfig.title}
              onChange={(e) => setResellerConfig({...resellerConfig, title: e.target.value})}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              placeholder="Contoh: GABUNG JADI RESELLER KAMI!"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#D4AF37] font-bold text-sm">Deskripsi Promosi</label>
            <textarea
              value={resellerConfig.description}
              onChange={(e) => setResellerConfig({...resellerConfig, description: e.target.value})}
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white h-32"
              placeholder="Tuliskan deskripsi lengkap keuntungan menjadi reseller..."
            />
          </div>

          <button
            onClick={handleSaveResellerConfig}
            disabled={saving}
            className="w-full sm:w-auto mt-4 px-6 py-2.5 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#F3E5AB] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Menyimpan...' : 'Simpan Teks Reseller'}
          </button>
        </div>
      </div>

      <div className="bg-[#022c22] rounded-xl shadow-lg border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database size={20} className="text-[#D4AF37]" />
            Backup Sistem Database
          </h2>
          <p className="text-sm text-gray-400 mt-1">Unduh seluruh data toko (Produk, Pesanan, Pelanggan, dll) ke dalam satu file aman</p>
        </div>

        <div className="p-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4 text-blue-200 text-sm">
            <strong>Tips:</strong> Klik tombol di bawah ini untuk mengunduh file `.json`. Setelah terunduh, Anda dapat menyimpannya secara manual ke dalam Google Drive atau Flashdisk Anda sebagai cadangan data.
          </div>
          
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="w-full sm:w-auto px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={20} className={backupLoading ? 'animate-bounce' : ''} />
            {backupLoading ? 'Memproses Backup...' : 'Download Data Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
