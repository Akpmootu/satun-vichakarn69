import React, { useEffect, useState } from 'react';
import { LOADING_QUOTES } from '../../constants';

interface LoadingOverlayProps {
  isLoading: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading }) => {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (isLoading) {
      const randomQuote = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
      setQuote(randomQuote);
    }
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 animate-fade-in">
       {/* Digital Grid Background */}
       <div className="absolute inset-0 opacity-10" 
            style={{ 
                backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
            }}
       ></div>

       <div className="relative z-10 flex flex-col items-center">
          {/* Animated Loader */}
          <div className="relative h-24 w-24 mb-8">
             <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
             <div className="absolute inset-0 border-t-4 border-sky-500 rounded-full animate-spin"></div>
             <div className="absolute inset-4 border-b-4 border-emerald-400 rounded-full animate-spin-slow"></div>
             
             <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-microchip text-3xl text-white animate-pulse"></i>
             </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest mb-2">
             LOADING SYSTEM
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full mb-6"></div>

          <p className="text-slate-400 text-sm md:text-base font-light italic max-w-md text-center leading-relaxed">
             "{quote}"
          </p>
       </div>
    </div>
  );
};

export default LoadingOverlay;