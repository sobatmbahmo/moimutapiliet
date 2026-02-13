import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabaseClient'; 
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import FloatingChat from './components/FloatingChat';
import Dashboard from './components/Dashboard'; 
import AuthModal from './components/AuthModal';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import InvoicePage from './pages/InvoicePage';
import { ReferralProvider } from './context/ReferralContext';

function App() {
  // === STATE TOKO ===
  const [modalState, setModalState] = useState({ isOpen: false, mode: null, product: null });
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // === STATE AUTHENTICATION & MENU ===
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginRole, setLoginRole] = useState('umum'); 
  const [user, setUser] = useState(null);

  // === COMPUTED VALUES ===
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.nama_produk?.toLowerCase().includes(term) ||
      p.deskripsi_produk?.toLowerCase().includes(term) ||
      p.kode_produk?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const isAnyModalOpen = modalState.isOpen || isCartOpen || showAuthModal || isMenuOpen;

  // === FUNCTIONS ===
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, qty: (item.qty || 1) + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    supabase.auth.signOut();
  };

  const openLoginModal = (roleType = 'umum') => {
    setLoginRole(roleType);
    setAuthMode('login');
    setShowAuthModal(true);
    setIsMenuOpen(false);
  };

  const openRegisterModal = (roleType = 'Affiliator') => {
    setLoginRole(roleType);
    setAuthMode('register'); 
    setShowAuthModal(true); 
    setIsMenuOpen(false);
  };

  // === INIT APP ===
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        
        const mappedData = data?.map(item => ({
          id: item.id,
          nama_produk: item.name,
          harga_produk: item.price,
          deskripsi_produk: item.description,
          kode_produk: item.product_code,
          image_url: item.image_url,
          link_tiktokshop: item.default_link,
          berat_produk: item.berat_produk || 200  // ✅ Tambahkan field berat
        })) || [];
        
        setProducts(mappedData);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initApp();
  }, []);

  // === SYNC USER SESSION ===
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  // === CONDITIONAL RENDER ===
  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Invoice Page */}
        <Route path="/invoice/:orderNumber" element={<InvoicePage />} />
        
        {/* Main Shop */}
        <Route path="/*" element={
          <ReferralProvider>
            <>
              <style>{`
                @keyframes shine {
                  0% { background-position: -200% center; }
                  100% { background-position: 200% center; }
                }
                .animate-text-shimmer {
                  background: linear-gradient(to right, #D4AF37 20%, #FFF 40%, #FFF 60%, #D4AF37 80%);
                  background-size: 200% auto;
                  color: transparent;
                  background-clip: text;
                  -webkit-background-clip: text;
            animation: shine 3s linear infinite;
          }
        `}</style>

        <Header 
          isMenuOpen={isMenuOpen} 
          setIsMenuOpen={setIsMenuOpen} 
          cartCount={cart.length} 
          onCartClick={() => setIsCartOpen(true)}
          onLoginClick={openLoginModal}
          onRegisterClick={openRegisterModal}
        />

        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          initialMode={authMode} 
          role={loginRole} 
          onLoginSuccess={handleLoginSuccess} 
        />

        <main className="max-w-md mx-auto px-4 py-6 space-y-8">
          <HeroSection 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
          />
          <div>
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="font-bold text-white text-lg tracking-wide flex items-center gap-2">
                Katalog Eksklusif 
                <div className="h-1 w-10 bg-[#D4AF37] rounded-full"></div>
              </h2>
              <span className="text-xs font-medium text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                {filteredProducts.length} Item
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-72 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-5">
                {filteredProducts.map((prod) => (
                  <ProductCard 
                    key={prod.id} 
                    product={prod} 
                    onOpenModal={(p, m) => setModalState({ isOpen: true, mode: m, product: p })} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 backdrop-blur-md rounded-3xl border border-dashed border-white/20">
                <p className="text-gray-400">Item tidak ditemukan.</p>
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="text-[#D4AF37] mt-3 font-medium hover:underline"
                >
                  Reset Pencarian
                </button>
              </div>
            )}
          </div>
        </main>

        <ProductModal 
          isOpen={modalState.isOpen} 
          onClose={() => setModalState({ ...modalState, isOpen: false })} 
          mode={modalState.mode} 
          product={modalState.product} 
          onAddToCart={addToCart} 
        />

        <CartDrawer 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          cartItems={cart} 
          onUpdateQty={(id, qty) => 
            qty < 1 
              ? window.confirm("Hapus?") && setCart(c => c.filter(i => i.id !== id))
              : setCart(c => c.map(i => i.id === id ? { ...i, qty } : i))
          } 
          onUpdateNote={(id, note) => 
            setCart(c => c.map(i => i.id === id ? { ...i, note } : i))
          } 
        />

        <FloatingChat 
          products={products} 
          onAddToCart={addToCart} 
          isHidden={isAnyModalOpen} 
        />
            </>
          </ReferralProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;