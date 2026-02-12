
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Logo Icon (KM Concept) */}
      <div className="relative h-10 w-10 md:h-11 md:w-11 shrink-0 group">
         <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
            {/* Hexagon Background */}
            <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2" />
            
            {/* Nodes */}
            <circle cx="30" cy="70" r="7" fill="#22d3ee" className="animate-pulse" />
            <circle cx="70" cy="50" r="7" fill="#38bdf8" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
            <circle cx="50" cy="25" r="7" fill="#0ea5e9" className="animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Connections */}
            <path d="M30 70 L70 50 L50 25" stroke="white" strokeWidth="2" strokeDasharray="4" fill="none" opacity="0.4" />
            
            {/* Center Text */}
            <text x="50" y="62" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle" style={{ fontFamily: 'Arial, sans-serif' }}>KM</text>
         </svg>
      </div>
      
      {/* Typography */}
      <div className="flex flex-col justify-center">
         <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-sky-600 transition">
            SKMS
         </h1>
         <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase mt-0.5">
            Satun Knowledge Management
         </span>
      </div>
    </div>
  );
};

export default Logo;
