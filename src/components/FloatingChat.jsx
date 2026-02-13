import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, ShoppingCart, User, Bot, ExternalLink } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(number);
};

export default function FloatingChat({ products, onAddToCart, isHidden }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  
  // Pesan Awal (Sapaan)
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'bot', 
      text: 'Halo! 👋 Saya Asisten Mbahmo. Cari Tembakau atau Papir apa hari ini?',
      type: 'text' 
    }
  ]);
  
  const messagesEndRef = useRef(null);

  // Auto scroll ke pesan terbawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;

    // 1. Simpan Pesan User
    const userMsg = { id: Date.now(), sender: 'user', text: input, type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    const keyword = input.toLowerCase();
    setInput('');

    // 2. LOGIKA PENCARIAN BOT (Mirip fitur search di App.jsx)
    setTimeout(() => {
      const foundProducts = products.filter(p => 
        p.nama_produk?.toLowerCase().includes(keyword) || 
        p.kode_produk?.toLowerCase().includes(keyword) ||
        p.deskripsi_produk?.toLowerCase().includes(keyword)
      ).slice(0, 3); // Ambil maks 3 produk saja biar chat ga penuh

      if (foundProducts.length > 0) {
        // SKENARIO A: Barang Ketemu
        const botResponse = { 
          id: Date.now() + 1, 
          sender: 'bot', 
          text: `Ada nih kak! Saya nemu ${foundProducts.length} barang yang cocok:`,
          type: 'product_list',
          data: foundProducts
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        // SKENARIO B: Barang Ga Ketemu -> Tawarkan ke WA Admin
        const botResponse = { 
          id: Date.now() + 1, 
          sender: 'bot', 
          text: `Waduh, saya tidak menemukan produk "${keyword}" di sistem. Mau tanya langsung ke Admin manusia?`,
          type: 'not_found'
        };
        setMessages(prev => [...prev, botResponse]);
      }
    }, 600); // Delay sedikit biar kesannya "mikir"
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const openWA = () => {
    const adminNumber = "6285700800278";
    const text = "Halo Admin, saya cari produk tapi tidak ketemu di bot. Bisa bantu?";
    window.open(`https://wa.me/${adminNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Jika ada modal lain terbuka (isHidden = true), sembunyikan chat
  if (isHidden) return null;

  return (
    <>
      {/* 1. TOMBOL MELAYANG (Floating Button) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] w-14 h-14 rounded-full shadow-lg shadow-[#D4AF37]/40 flex items-center justify-center text-black hover:scale-110 transition-transform animate-bounce"
        >
          <MessageCircle size={28} strokeWidth={2.5} />
          {/* Badge Notif Merah */}
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </button>
      )}

      {/* 2. JENDELA CHAT (Glassmorphism) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[90vw] max-w-[350px] h-[500px] bg-[#022c22]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up origin-bottom-right">
          
          {/* Header Chat */}
          <div className="bg-[#064e3b]/80 p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-[#D4AF37]/30">
                <Bot className="text-[#D4AF37]" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Asisten Mbahmo</h3>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          {/* Isi Chat (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  msg.sender === 'user' 
                    ? 'bg-[#D4AF37] text-black rounded-br-none font-medium' 
                    : 'bg-white/10 text-gray-100 border border-white/5 rounded-bl-none'
                }`}>
                  {/* Teks Biasa */}
                  {msg.text && <p className="leading-relaxed">{msg.text}</p>}

                  {/* Jika Tipe = Product List (Ada Barang) */}
                  {msg.type === 'product_list' && (
                    <div className="mt-3 space-y-2">
                      {msg.data.map(prod => (
                        <div key={prod.id} className="bg-black/40 p-2 rounded-lg flex gap-2 border border-white/10">
                          <img src={prod.image_url} className="w-10 h-10 rounded object-cover" alt=""/>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate text-white">{prod.nama_produk}</p>
                            <p className="text-[#D4AF37] text-xs">{formatRupiah(prod.harga_produk)}</p>
                          </div>
                          <button 
                            onClick={() => onAddToCart(prod, 1)}
                            className="bg-[#D4AF37] text-black p-2 rounded hover:bg-white transition"
                          >
                            <ShoppingCart size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Jika Tipe = Not Found (Tombol ke WA) */}
                  {msg.type === 'not_found' && (
                    <button 
                      onClick={openWA}
                      className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-lg"
                    >
                      Chat Admin via WA <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-[#042f2e] border-t border-white/10 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ketik nama barang..."
              className="flex-1 bg-black/40 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-[#D4AF37] border border-transparent transition-all"
            />
            <button 
              onClick={handleSend}
              className="bg-[#D4AF37] hover:bg-[#F4D03F] text-black p-3 rounded-xl transition-transform active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>

        </div>
      )}
    </>
  );
}