import React, { useEffect, useState } from 'react';
import { LOADING_QUOTES, LOGO_URL } from '../../constants';

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
             
             {/* Main Image Logo */}
             <img 
                 src={LOGO_URL} 
                 alt="SKMS Logo" 
                 className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(14,165,233,0.5)] animate-[pulse_2s_ease-in-out_infinite] scale-110" 
             />
          </div>

          {/* Text Content */}
          <div className="text-center space-y-2">
             <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-sky-400 tracking-tight drop-shadow-sm animate-fade-in px-4 leading-relaxed pb-1">
                มหกรรมแลกเปลี่ยนเรียนรู้ผลงานวิชาการและนวัตกรรม
             </h1>
             <div className="text-sm md:text-base font-medium text-slate-400 tracking-wider">
                จังหวัดสตูล ประจำปีงบประมาณ พ.ศ. 2569
             </div>
          </div>

          {/* Divider with beautiful progress bar style */}
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
              <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-sky-400 via-sky-300 to-sky-400 rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
          </div>
          <style>{`
            @keyframes progress {
              0% { left: -50%; }
              100% { left: 100%; }
            }
          `}</style>

          {/* Quote Section */}
          <div className="max-w-md w-full px-8 text-center pt-4">
              <p className="text-sky-200/80 italic text-sm md:text-base font-light leading-relaxed animate-pulse-slow">
                  "{quote}"
              </p>
          </div>
          
       </div>

       {/* Credit */}
       <div className="absolute bottom-6 left-0 w-full text-center text-xs text-slate-500 opacity-60 font-light tracking-wide px-4">
           พัฒนาโดย กลุ่มงานสุขภาพดิจิทัล สำนักงานสาธารณสุขจังหวัดสตูล 2569
       </div>
    </div>
  );
};

export default LoadingOverlay;