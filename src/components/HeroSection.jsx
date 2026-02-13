import React from 'react';
import { Search, X } from 'lucide-react';

export default function HeroSection({ searchTerm, setSearchTerm }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent group-hover:translate-x-[200%] transition-all duration-1000"></div>
      <div className="relative z-10">
        <h2 className="text-2xl font-extrabold mb-2 flex items-center gap-2"><span className="text-[#D4AF37]">Gudangnya Mbako</span> Enaq!</h2>
        <p className="text-gray-300 text-sm mb-5 max-w-[80%]">Menyatukan Jari, Melestarikan Tradisi, Pelopor Tingwe Keren Masa Kini..</p>
        <div className="relative">
          <input type="text" placeholder="Cari nama, kode, atau deskripsi..." className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37]/70 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-white bg-white/10 rounded-full p-0.5"><X size={16}/></button>}
        </div>
      </div>
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl"></div>
      <div className="absolute -left-10 -top-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
    </div>
  );
}