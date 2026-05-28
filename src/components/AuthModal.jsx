import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Crown, User, KeyRound, Phone, AlertCircle, Hash, Instagram } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { registerAffiliator } from '../lib/supabaseQueries';

export default function AuthModal({ isOpen, onClose, initialMode, role, onLoginSuccess }) {
  const [currentMode, setCurrentMode] = useState(initialMode || 'login'); 
  const [userRole, setUserRole] = useState(role || 'Affiliator'); 
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form fields
  const [email, setEmail] = useState(''); // Only for admin
  const [password, setPassword] = useState(''); // Only for admin
  
  const [nama, setNama] = useState('');
  const [nomorWA, setNomorWA] = useState('');
  const [refCode, setRefCode] = useState('');
  const [tiktokAccount, setTiktokAccount] = useState('');
  const [bankInfo, setBankInfo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentMode(initialMode || 'login');
      setUserRole(role || 'Affiliator');
      resetForm();
    }
  }, [isOpen, initialMode, role]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNama('');
    setNomorWA('');
    setRefCode('');
    setTiktokAccount('');
    setBankInfo('');
    setErrorMessage('');
    setSuccessMessage('');
    setTermsAccepted(false);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    try {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !admin || admin.password_hash !== password) {
        setErrorMessage('Email atau password salah');
        setAuthLoading(false);
        return;
      }

      onLoginSuccess({
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
        role: admin.role || 'admin',
        type: 'admin'
      });
      
      setSuccessMessage(`Login berhasil! Selamat datang, ${admin.nama}.`);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage('Terjadi kesalahan sistem: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAffiliatorLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    try {
      // Affiliator login uses WhatsApp and Ref Code
      const { data: affiliator, error } = await supabase
        .from('affiliator_profiles')
        .select('*')
        .eq('whatsapp_number', nomorWA)
        .eq('ref_code', refCode.toUpperCase())
        .single();

      if (error || !affiliator) {
        setErrorMessage('Nomor WA atau Kode Referal salah');
        setAuthLoading(false);
        return;
      }

      onLoginSuccess({
        id: affiliator.id,
        nama: affiliator.name,
        nomor_wa: affiliator.whatsapp_number,
        ref_code: affiliator.ref_code,
        role: 'affiliator',
        type: 'affiliator'
      });

      setSuccessMessage(`Selamat datang kembali, ${affiliator.name}!`);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage('Terjadi kesalahan sistem. Coba lagi nanti.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAffiliatorRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    try {
      if (!nama || !nomorWA || !refCode || !bankInfo) {
        setErrorMessage('Mohon lengkapi data yang wajib diisi');
        setAuthLoading(false);
        return;
      }

      const result = await registerAffiliator({
        name: nama,
        whatsapp_number: nomorWA,
        ref_code: refCode,
        tiktok_account: tiktokAccount,
        bank_info: bankInfo
      });

      if (!result.success) {
        setErrorMessage('Pendaftaran gagal. Mungkin Kode Referal sudah dipakai.');
        setAuthLoading(false);
        return;
      }

      setSuccessMessage('Pendaftaran berhasil! Akun Anda langsung aktif.');

      // Login otomatis
      setTimeout(() => {
        onLoginSuccess({
          id: result.affiliator.id,
          nama: result.affiliator.name,
          nomor_wa: result.affiliator.whatsapp_number,
          ref_code: result.affiliator.ref_code,
          role: 'affiliator',
          type: 'affiliator'
        });
        resetForm();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage('Terjadi kesalahan: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userRole === 'Admin') {
      handleAdminLogin(e);
    } else {
      if (currentMode === 'login') {
        handleAffiliatorLogin(e);
      } else {
        handleAffiliatorRegister(e);
      }
    }
  };

  if (!isOpen) return null;

  if (currentMode === 'register' && !termsAccepted && userRole === 'Affiliator') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden p-6 animate-slide-up max-h-screen flex flex-col">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"><X size={20} /></button>
          
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-[#D4AF37]/30">
              <CheckCircle size={24} className="text-[#D4AF37]" />
            </div>
            <h2 className="text-lg font-bold text-white">Syarat & Ketentuan Mitra</h2>
            <p className="text-[10px] text-gray-400">Mohon baca & pahami sebelum bergabung.</p>
          </div>
          
          <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-xs text-gray-300 overflow-y-auto flex-1 mb-4 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-[#D4AF37]/50 pr-2 text-justify">
            <div>
              <h4 className="font-bold text-white mb-2 text-sm">✅ Keuntungan Menjadi Mitra</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>Komisi 10% (Maks Rp 30.000) dari setiap penjualan</li>
                <li>Pendaftaran langsung aktif tanpa menunggu admin</li>
                <li>Dashboard transparan untuk cek komisi siap cair</li>
              </ul>
            </div>
          </div>

          <button 
            onClick={() => setTermsAccepted(true)} 
            className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black font-bold rounded-xl shadow-lg hover:shadow-[#D4AF37]/40 transition-all active:scale-95 flex justify-center items-center gap-2"
          >
            <CheckCircle size={18} /> SAYA SETUJU & LANJUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#D4AF37]/30">
            {userRole === 'Admin' ? (
              <Crown size={32} className="text-[#D4AF37]" />
            ) : (
              <User size={32} className="text-green-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {currentMode === 'login' ? `Login ${userRole}` : 'Daftar Mitra Baru'}
          </h2>
          <p className="text-xs text-gray-400">
            {currentMode === 'login' 
              ? (userRole === 'Admin' ? 'Masukkan kredensial admin.' : 'Gunakan Nomor WA dan Kode Referal Anda.') 
              : 'Akun langsung aktif setelah daftar!'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-start">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-2 items-start">
            <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
            <p className="text-xs text-green-300">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {userRole === 'Admin' ? (
            <>
              <div>
                <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1">Email Admin</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1">Password</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {currentMode === 'register' && (
                <div>
                  <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    placeholder="Nama Anda" 
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1">Nomor WhatsApp</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    placeholder="6281234..." 
                    value={nomorWA}
                    onChange={(e) => setNomorWA(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                  <Phone size={16} className="absolute left-3.5 top-4 text-gray-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1">Kode Referal (Unik)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Misal: BUDI2026" 
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                  <Hash size={16} className="absolute left-3.5 top-4 text-gray-500" />
                </div>
                {currentMode === 'login' && <p className="text-[10px] text-gray-400 mt-1 ml-1">Gunakan kode referal ini sebagai sandi login Anda.</p>}
              </div>

              {currentMode === 'register' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1">Akun Tiktok (Opsional)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="@username" 
                        value={tiktokAccount}
                        onChange={(e) => setTiktokAccount(e.target.value)}
                        className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                      />
                      <Instagram size={16} className="absolute left-3.5 top-4 text-gray-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1">Informasi Rekening / E-Wallet</label>
                    <textarea 
                      placeholder="Bank BCA 12345678 a/n Budi" 
                      value={bankInfo}
                      onChange={(e) => setBankInfo(e.target.value)}
                      className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none h-20"
                      required
                    ></textarea>
                  </div>
                </>
              )}
            </>
          )}

          <button 
            type="submit"
            disabled={authLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black font-bold rounded-xl shadow-lg hover:shadow-[#D4AF37]/40 transition-all active:scale-95 mt-4 flex justify-center items-center gap-2"
          >
            {authLoading ? 'Memproses...' : (currentMode === 'login' ? 'MASUK SEKARANG' : 'DAFTAR & AKTIFKAN')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-white/10 pt-4">
          <p className="text-xs text-gray-400">
            {currentMode === 'login' ? 'Belum jadi mitra?' : 'Sudah punya akun?'}
            {userRole === 'Affiliator' && (
              <button 
                onClick={() => {
                  setCurrentMode(currentMode === 'login' ? 'register' : 'login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-[#D4AF37] font-bold ml-1 hover:underline"
              >
                {currentMode === 'login' ? 'Daftar disini' : 'Login disini'}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}