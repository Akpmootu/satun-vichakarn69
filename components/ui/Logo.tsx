import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Logo Icon (KM Concept) */}
      <div className="relative h-12 w-12 shrink-0 group">
         <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-lg">
            {/* Background Hex */}
            <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2" />
            
            {/* 3 Nodes: Upstream, Midstream, Downstream */}
            {/* Bottom (Upstream) */}
            <circle cx="30" cy="70" r="8" fill="#22d3ee" className="animate-scale-subtle" />
            
            {/* Middle (Midstream) */}
            <circle cx="70" cy="50" r="8" fill="#38bdf8" className="animate-scale-subtle" style={{ animationDelay: '0.5s' }} />
            
            {/* Top (Downstream) */}
            <circle cx="50" cy="25" r="8" fill="#0ea5e9" className="animate-scale-subtle" style={{ animationDelay: '1s' }} />
            
            {/* Connections */}
            <line x1="30" y1="70" x2="70" y2="50" stroke="white" strokeWidth="2" strokeDasharray="4" opacity="0.5" />
            <line x1="70" y1="50" x2="50" y2="25" stroke="white" strokeWidth="2" strokeDasharray="4" opacity="0.5" />
            <line x1="30" y1="70" x2="50" y2="25" stroke="white" strokeWidth="2" strokeDasharray="4" opacity="0.3" />
            
            {/* Center S */}
            <text x="50" y="60" fontSize="10" fill="white" textAnchor="middle" opacity="0.2">KM</text>
         </svg>
      </div>
      
      {/* Text Logo */}
      <div className="flex flex-col justify-center">
         <div className="flex items-baseline gap-1 animate-scale-subtle" style={{ animationDelay: '1.5s' }}>
            <span className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none group-hover:text-sky-600 transition" style={{ textShadow: '2px 2px 0px rgba(14,165,233,0.1)' }}>SKMS</span>
         </div>
         <div className="flex flex-col leading-none mt-0.5">
            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">Satun Knowledge</span>
            <span className="text-[9px] md:text-[10px] font-bold text-sky-600 dark:text-sky-400 tracking-wide uppercase">Management Systems</span>
         </div>
      </div>
    </div>
  );
};

export default Logo;