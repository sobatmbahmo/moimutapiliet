import React, { useState } from 'react';
import { Menu, ShieldCheck, LogIn, User, ShoppingBag, Share2, Check } from 'lucide-react';
import { useReferral } from '../context/ReferralContext';

export default function Header({ 
  isMenuOpen, 
  setIsMenuOpen, 
  cartCount, 
  onCartClick, 
  onLoginClick, 
  onRegisterClick 
}) {
  const { hasReferral, referralData, getShareLink } = useReferral();
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const handleShareLink = () => {
    const shareLink = getShareLink();
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    }
  };
  return (
    <header className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40 transition-all">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        
        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all active:scale-95 text-[#D4AF37]">
            <Menu size={22} strokeWidth={2.5}/>
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-12 left-0 w-64 bg-[#042f2e]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden animate-slide-up origin-top-left z-50">
              <div className="p-2 space-y-1">
                {/* Referral Info - Show jika ada active referral */}
                {hasReferral && (
                  <>
                    <div className="px-3 py-3 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 mb-2">
                      <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1">📌 Referral Aktif</div>
                      <div className="text-xs text-white/80 mb-2">Anda berbelanja dari mitra terdaftar</div>
                      <button
                        onClick={handleShareLink}
                        className="w-full text-xs px-2 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold flex items-center justify-center gap-2 transition active:scale-95"
                      >
                        {copiedToClipboard ? (
                          <>
                            <Check size={14} /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Share2 size={14} /> Bagikan Link
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
                
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 mb-1">Akses Sistem</div>
                <button onClick={() => onLoginClick('Admin')} className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/10 text-white text-sm font-medium flex items-center gap-3 transition group">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition"><ShieldCheck size={16}/></div>
                  <div><span className="block font-bold">Login Admin</span></div>
                </button>
                <button onClick={() => onLoginClick('Affiliator')} className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/10 text-white text-sm font-medium flex items-center gap-3 transition group">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition"><LogIn size={16}/></div>
                  <div><span className="block font-bold">Login Affiliator</span><span className="text-[10px] text-gray-400">Masuk mitra terdaftar</span></div>
                </button>
                <div className="border-t border-white/10 my-1"></div>
                <button onClick={() => onRegisterClick('Affiliator')} className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/10 text-white text-sm font-medium flex items-center gap-3 transition group">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition"><User size={16}/></div>
                   <div><span className="block font-bold">Daftar Affiliator</span><span className="text-[10px] text-gray-400">Gabung Kemitraan Baru</span></div>
                </button>
              </div>
            </div>
          )}
          {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>}
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2">
           <h1 className="font-extrabold text-xl tracking-tighter italic animate-text-shimmer drop-shadow-lg cursor-default select-none">
             TOKONEMBAHMO<span className="text-[#D4AF37] not-italic ml-1">✨</span>
           </h1>
        </div>
        
        <button onClick={onCartClick} className="relative p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all active:scale-95">
           <ShoppingBag className="text-[#D4AF37]" size={22} />
           {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-black animate-bounce">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}