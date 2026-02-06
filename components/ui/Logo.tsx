import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Logo Icon */}
      <div className="relative h-12 w-12 shrink-0">
         <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-lg">
            {/* Base Hexagon */}
            <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            
            {/* Academic Cap / Book Abstract */}
            <path d="M25 35 L50 22 L75 35 L50 48 Z" fill="#38bdf8" />
            <path d="M75 35 L75 55" stroke="#38bdf8" strokeWidth="2" />
            
            {/* Medical Cross / Digital Node */}
            <rect x="42" y="55" width="16" height="30" rx="2" fill="#fff" />
            <rect x="35" y="62" width="30" height="16" rx="2" fill="#fff" />
            
            {/* Tech Dots */}
            <circle cx="50" cy="15" r="3" fill="#22d3ee" className="animate-pulse" />
            <circle cx="85" cy="50" r="2" fill="#22d3ee" className="animate-pulse" />
            <circle cx="15" cy="50" r="2" fill="#22d3ee" className="animate-pulse" />
         </svg>
      </div>
      
      {/* Text Logo */}
      <div className="flex flex-col">
         <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-none">SATUN</span>
            <span className="text-xl md:text-2xl font-black tracking-tighter text-sky-600 leading-none">VICHAKARN</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded">2569</span>
            <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase">Academic System</span>
         </div>
      </div>
    </div>
  );
};

export default Logo;