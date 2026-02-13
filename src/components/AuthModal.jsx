import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Crown, User, KeyRound, Mail, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getAffiliatorByEmail, createAffiliator } from '../lib/supabaseQueries';
import { 
  validateNama, 
  validateEmail, 
  validatePassword, 
  validatePasswordMatch, 
  validateNomorWA,
  sanitizeInput 
} from '../lib/validation';

export default function AuthModal({ isOpen, onClose, initialMode, role, onLoginSuccess }) {
  // ======================
  // STATE
  // ======================
  const [currentMode, setCurrentMode] = useState(initialMode || 'login'); // login, register, terms
  const [userRole, setUserRole] = useState(role || 'Affiliator'); // Admin or Affiliator
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nama, setNama] = useState('');
  const [nomorWA, setNomorWA] = useState('');
  const [pin, setPin] = useState('');

  // Reset form saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      console.log('📂 AuthModal opened with role prop:', role);
      setCurrentMode(initialMode || 'login');
      setUserRole(role || 'Affiliator');
      resetForm();
    }
  }, [isOpen, initialMode, role]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNama('');
    setNomorWA('');
    setPin('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowPassword(false);
    setTermsAccepted(false);
  };

  // ======================
  // ADMIN LOGIN
  // ======================
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    try {
      // 🔒 STRICT VALIDATION
      const emailError = validateEmail(email);
      if (emailError) {
        setErrorMessage(emailError);
        setAuthLoading(false);
        return;
      }

      if (!password || password.trim().length === 0) {
        setErrorMessage('Password harus diisi');
        setAuthLoading(false);
        return;
      }

      console.log('🔐 [LOGIN] Attempting admin login with email:', email.toLowerCase());

      // Get admin from database
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        console.error('🔐 [ERROR] Supabase query error:', error);
        setErrorMessage('Email atau password salah');
        setAuthLoading(false);
        return;
      }

      if (!admin) {
        console.warn('🔐 [ERROR] Admin tidak ditemukan:', email.toLowerCase());
        setErrorMessage('Email atau password salah');
        setAuthLoading(false);
        return;
      }

      console.log('🔐 [FOUND] Admin data:', { id: admin.id, nama: admin.nama, email: admin.email, role: admin.role });

      // Check if required fields exist
      if (!admin.nama || !admin.password_hash) {
        console.error('🔐 [ERROR] Admin data incomplete - missing nama or password_hash');
        setErrorMessage('Data admin tidak lengkap. Hubungi admin system.');
        setAuthLoading(false);
        return;
      }

      // Simple password comparison (in production, use proper bcrypt verification)
      if (admin.password_hash !== password) {
        console.warn('🔐 [ERROR] Password mismatch for:', email);
        setErrorMessage('Email atau password salah');
        setAuthLoading(false);
        return;
      }

      console.log('🔐 [SUCCESS] Password match! Logging in admin:', admin.nama);

      // Login success
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
      console.error('🔐 [EXCEPTION] Login error:', err);
      setErrorMessage('Terjadi kesalahan sistem: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ======================
  // AFFILIATOR LOGIN
  // ======================
  const handleAffiliatorLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    try {
      // 🔒 STRICT VALIDATION
      const emailError = validateEmail(email);
      if (emailError) {
        setErrorMessage(emailError);
        setAuthLoading(false);
        return;
      }

      if (!password || password.trim().length === 0) {
        setErrorMessage('Password harus diisi');
        setAuthLoading(false);
        return;
      }

      // Get affiliator by email
      const result = await getAffiliatorByEmail(email.toLowerCase());

      if (!result.success || !result.affiliator) {
        setErrorMessage('Email atau password salah');
        setAuthLoading(false);
        return;
      }

      const affiliator = result.affiliator;

      // Verify password (simple comparison for now)
      if (affiliator.password_hash !== password) {
        setErrorMessage('Email atau password salah');
        setAuthLoading(false);
        return;
      }

      // Check status
      if (affiliator.status !== 'active') {
        setErrorMessage('Akun Anda belum diaktifkan. Hubungi admin.');
        setAuthLoading(false);
        return;
      }

      // Login success
      onLoginSuccess({
        id: affiliator.id,
        nama: affiliator.nama,
        email: affiliator.email,
        nomor_wa: affiliator.nomor_wa,
        balance: affiliator.balance,
        role: 'affiliator',
        type: 'affiliator'
      });

      setSuccessMessage(`Selamat datang, ${affiliator.nama}!`);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error in affiliator login:', err);
      setErrorMessage('Terjadi kesalahan sistem. Coba lagi nanti.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ======================
  // AFFILIATOR REGISTER
  // ======================
  const handleAffiliatorRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAuthLoading(true);

    try {
      // 🔒 STRICT VALIDATION - Prevent injection attacks & invalid data
      
      // 1. Validate nama
      const namaError = validateNama(nama);
      if (namaError) {
        setErrorMessage(namaError);
        setAuthLoading(false);
        return;
      }

      // 2. Validate email
      const emailError = validateEmail(email);
      if (emailError) {
        setErrorMessage(emailError);
        setAuthLoading(false);
        return;
      }

      // 3. Validate password
      const passwordError = validatePassword(password);
      if (passwordError) {
        setErrorMessage(passwordError);
        setAuthLoading(false);
        return;
      }

      // 4. Validate password match
      const matchError = validatePasswordMatch(password, confirmPassword);
      if (matchError) {
        setErrorMessage(matchError);
        setAuthLoading(false);
        return;
      }

      // 5. Validate nomor WA
      const waError = validateNomorWA(nomorWA);
      if (waError) {
        setErrorMessage(waError);
        setAuthLoading(false);
        return;
      }

      // Check if email already exists
      const { data: existing, error: checkError } = await supabase
        .from('affiliators')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existing) {
        setErrorMessage('Email sudah terdaftar. Gunakan email lain atau login.');
        setAuthLoading(false);
        return;
      }

      // Create new affiliator (with sanitized inputs)
      const result = await createAffiliator(
        sanitizeInput(nama.trim()),
        sanitizeInput(nomorWA.trim()),
        email.toLowerCase(),
        password, // In production, use proper bcrypt
        [] // akun_tiktok - empty for now
      );

      if (!result.success) {
        setErrorMessage('Pendaftaran gagal: ' + (result.error || 'Unknown error'));
        setAuthLoading(false);
        return;
      }

      // Success
      setSuccessMessage('Pendaftaran berhasil! Menunggu persetujuan admin. Login kembali setelah diaktifkan.');
      setTimeout(() => {
        setCurrentMode('login');
        resetForm();
      }, 2000);
    } catch (err) {
      setErrorMessage('Terjadi kesalahan: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = (e) => {
    console.log('🔍 [SUBMIT] userRole state:', userRole);
    console.log('🔍 [SUBMIT] currentMode:', currentMode);
    console.log('🔍 [SUBMIT] email:', email);
    
    if (userRole === 'Admin') {
      console.log('➡️ [ROUTE] Calling handleAdminLogin (userRole === "Admin")');
      handleAdminLogin(e);
    } else {
      console.log('➡️ [ROUTE] Calling handleAffiliator handler (userRole !== "Admin", is:', userRole + ')');
      if (currentMode === 'login') {
        console.log('  ➡️ [ROUTE] Affiliator LOGIN mode');
        handleAffiliatorLogin(e);
      } else {
        console.log('  ➡️ [ROUTE] Affiliator REGISTER mode');
        handleAffiliatorRegister(e);
      }
    }
  };

  if (!isOpen) return null;

  // ======================
  // TERMS & CONDITIONS
  // ======================
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
            <div className="text-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-[#D4AF37] uppercase tracking-wide">Program Kemitraan<br/>TOKONEMBAHMO</h3>
            </div>
            <div>
              <h4 className="font-bold text-white mb-2 text-sm">✅ Keuntungan Menjadi Mitra</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>Komisi kompetitif dari setiap penjualan</li>
                <li>Tanpa modal & tanpa stok barang</li>
                <li>Sistem binding otomatis (90 hari)</li>
                <li>Dashboard lengkap tracking earnings</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-2 text-sm">📋 Syarat & Ketentuan</h4>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Minimal usia 21 tahun</li>
                <li>Email aktif dan nomor WA valid</li>
                <li>Jaga kerahasiaan akun Anda</li>
                <li>Tidak melakukan kecurangan</li>
                <li>Mitra dapat di non-aktifkan jika melanggar</li>
              </ol>
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

  // ======================
  // LOGIN / REGISTER FORM
  // ======================
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#022c22] border border-[#D4AF37]/50 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden p-6 animate-slide-up">
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
              ? `Masukkan kredensial ${userRole.toLowerCase()} Anda.` 
              : 'Lengkapi formulir pendaftaran di bawah.'}
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-start">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-2 items-start">
            <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
            <p className="text-xs text-green-300">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* REGISTER: Nama */}
          {currentMode === 'register' && (
            <div>
              <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1 tracking-wider">Nama Lengkap</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Nama Anda" 
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                  required
                />
                <User size={16} className="absolute left-3.5 top-4 text-gray-500" />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1 tracking-wider">Email</label>
            <div className="relative">
              <input 
                type="email" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                required
              />
              <Mail size={16} className="absolute left-3.5 top-4 text-gray-500" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1 tracking-wider">
              {currentMode === 'register' ? 'Buat Password' : 'Password'}
            </label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder={currentMode === 'register' ? 'Min 6 karakter' : '••••••'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                required
              />
              <KeyRound size={16} className="absolute left-3.5 top-4 text-gray-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-4 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Register only) */}
          {currentMode === 'register' && (
            <div>
              <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1 tracking-wider">Konfirmasi Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Ulangi password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                  required
                />
                <KeyRound size={16} className="absolute left-3.5 top-4 text-gray-500" />
              </div>
            </div>
          )}

          {/* Nomor WA (Register only) */}
          {currentMode === 'register' && (
            <div>
              <label className="text-[10px] font-bold text-[#D4AF37] uppercase ml-1 tracking-wider">Nomor WhatsApp</label>
              <div className="relative">
                <input 
                  type="tel" 
                  placeholder="62812345678" 
                  value={nomorWA}
                  onChange={(e) => setNomorWA(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                  required
                />
                <Phone size={16} className="absolute left-3.5 top-4 text-gray-500" />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={authLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black font-bold rounded-xl shadow-lg hover:shadow-[#D4AF37]/40 transition-all active:scale-95 mt-4 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                Memproses...
              </>
            ) : (
              currentMode === 'login' ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG'
            )}
          </button>
        </form>

        {/* Switch Mode */}
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