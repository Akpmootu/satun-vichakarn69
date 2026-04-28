
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative h-12 w-12 md:h-14 md:w-14 shrink-0 group">
         <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
      </div>
      <div className="flex flex-col justify-center">
         <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-sky-600 transition truncate max-w-[200px] md:max-w-none">
            มหกรรมแลกเปลี่ยนเรียนรู้ฯ
         </h1>
         <span className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wide mt-0.5 truncate max-w-[200px] md:max-w-none">
            จังหวัดสตูลประจำปีงบประมาณ พ.ศ. 2569
         </span>
      </div>
    </div>
  );
};

export default Logo;
