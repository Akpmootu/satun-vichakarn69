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
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 animate-fade-in text-white overflow-hidden">
       {/* Background Effects */}
       <div className="absolute inset-0 opacity-20 pointer-events-none">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-900/40 via-slate-900 to-slate-900"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
       </div>

       <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
          
          {/* Animated Logo Container */}
          <div className="relative w-32 h-32 flex items-center justify-center">
             {/* Outer Ring Animation */}
             <div className="absolute inset-0 border-2 border-sky-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
             <div className="absolute inset-2 border-2 border-dashed border-emerald-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
             
             {/* Main SVG Logo */}
             <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">
                {/* Hexagon Background */}
                <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" className="animate-[pulse_3s_ease-in-out_infinite]" />
                
                {/* Connections */}
                <line x1="30" y1="70" x2="70" y2="50" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" className="opacity-50" />
                <line x1="70" y1="50" x2="50" y2="25" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" className="opacity-50" />
                <line x1="30" y1="70" x2="50" y2="25" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" className="opacity-30" />

                {/* Nodes with sequential animation */}
                {/* Node 1: Upstream (Bottom Left) */}
                <circle cx="30" cy="70" r="6" fill="#0ea5e9" className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <circle cx="30" cy="70" r="6" fill="#bae6fd" />
                
                {/* Node 2: Midstream (Right) */}
                <circle cx="70" cy="50" r="6" fill="#0ea5e9" className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.6s]" />
                <circle cx="70" cy="50" r="6" fill="#7dd3fc" />

                {/* Node 3: Downstream (Top) */}
                <circle cx="50" cy="25" r="6" fill="#10b981" className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_1.2s]" />
                <circle cx="50" cy="25" r="6" fill="#34d399" />
                
                {/* Text Center */}
                <text x="50" y="65" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle" className="font-sans">KM</text>
             </svg>
          </div>

          {/* Text Content */}
          <div className="text-center space-y-2">
             <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-emerald-400 tracking-tight drop-shadow-sm animate-fade-in">
                SKMS
             </h1>
             <div className="text-sm md:text-base font-medium text-slate-400 tracking-wider uppercase">
                Satun Knowledge Management Systems
             </div>
          </div>

          {/* Divider with loading bar animation */}
          <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-sky-500 to-emerald-500 blur-[1px] animate-[translateX_1.5s_ease-in-out_infinite]"></div>
          </div>

          {/* Quote */}
          <div className="max-w-lg px-6">
              <p className="text-lg md:text-xl text-sky-100 font-light italic leading-relaxed text-center animate-flow-up">
                  "{quote}"
              </p>
          </div>

       </div>
    </div>
  );
};

export default LoadingOverlay;