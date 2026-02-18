import React, { useState, useEffect } from 'react';
import { Download, Shield, X, Smartphone, Zap, ShoppingBag } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Cek apakah sudah terinstall (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Cek apakah user sudah pernah dismiss (jangan tampilkan lagi selama 3 hari)
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const diffDays = (now - dismissedDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 3) return; // Jangan tampilkan jika masih dalam 3 hari
    }

    // Tangkap event beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Tampilkan banner setelah 3 detik (tidak langsung, agar user sempat lihat halaman dulu)
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Deteksi jika sudah terinstall
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
  };

  // Jangan render kalau tidak perlu
  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={handleDismiss}
      />

      {/* Modal Popup */}
      <div className="fixed bottom-0 left-0 right-0 z-[101] p-3 sm:p-4 animate-slide-up">
        <div className="max-w-lg mx-auto bg-gradient-to-b from-[#042f2e] to-[#022c22] border border-[#D4AF37]/40 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          
          {/* Header dengan badge keamanan */}
          <div className="relative px-4 pt-4 pb-3">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center">
                <Smartphone size={20} className="text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base leading-tight">Install Moi Mutapiliet</h3>
                <p className="text-[#D4AF37] text-xs font-medium">Jamaah Linitingiyah</p>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              Pasang aplikasi ini di HP Anda untuk kemudahan berbelanja dan menjadi pelanggan setia <span className="text-[#D4AF37] font-semibold">Jamaah Linitingiyah</span>.
            </p>
          </div>

          {/* Keunggulan */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-xl p-2.5 text-center">
                <Zap size={18} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-white text-[10px] sm:text-xs font-medium">Lebih Cepat</p>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 text-center">
                <ShoppingBag size={18} className="text-green-400 mx-auto mb-1" />
                <p className="text-white text-[10px] sm:text-xs font-medium">Belanja Mudah</p>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 text-center">
                <Shield size={18} className="text-blue-400 mx-auto mb-1" />
                <p className="text-white text-[10px] sm:text-xs font-medium">100% Aman</p>
              </div>
            </div>
          </div>

          {/* Jaminan keamanan */}
          <div className="mx-4 mb-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <Shield size={16} className="text-green-400 shrink-0 mt-0.5" />
              <p className="text-green-300 text-xs leading-relaxed">
                <span className="font-bold">Aman & Tidak Berbahaya.</span> Ini bukan download aplikasi dari luar. 
                Hanya shortcut ke website kami yang terpasang di home screen HP Anda. 
                Tidak mengambil data pribadi, tidak memerlukan izin khusus, dan bisa dihapus kapan saja.
              </p>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#F4D03F] transition disabled:opacity-50 text-sm"
            >
              <Download size={18} />
              {installing ? 'Memasang...' : 'Install Sekarang'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-3 bg-white/5 text-gray-400 font-medium rounded-xl hover:bg-white/10 transition text-sm"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
