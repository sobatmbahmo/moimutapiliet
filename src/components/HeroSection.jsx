import React, { useState, useEffect } from 'react';
import { getSliders } from '../lib/supabaseQueries';

export default function HeroSection() {
  const [sliders, setSliders] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSliders = async () => {
      const res = await getSliders();
      if (res.success && res.sliders && res.sliders.length > 0) {
        setSliders(res.sliders.filter(s => s.is_active));
      }
    };
    fetchSliders();
  }, []);

  useEffect(() => {
    if (sliders.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % sliders.length);
    }, 4000); // 4 seconds
    return () => clearInterval(interval);
  }, [sliders]);

  // If no sliders, show a default placeholder or nothing
  if (sliders.length === 0) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl aspect-video group bg-black/40 border border-white/10">
      {/* Images Container */}
      <div 
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {sliders.map((slider) => (
          <div key={slider.id} className="w-full flex-shrink-0 relative h-full cursor-pointer" onClick={() => slider.link && window.open(slider.link, '_blank')}>
            <img 
              src={slider.image_url} 
              alt={slider.title} 
              className="w-full h-full object-cover"
            />
            {/* Optional overlay gradient to make it look premium */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      {sliders.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
          {sliders.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-300 rounded-full ${
                currentIndex === idx 
                  ? 'w-6 h-2 bg-[#D4AF37]' 
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}