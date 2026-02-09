import React, { useState, useEffect } from 'react';
import { PR_NEWS } from '../constants';

interface NewsModalProps {
  isOpen: boolean;
  onClose: (dontShow: boolean) => void;
  initialIndex?: number;
}

const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dontShow, setDontShow] = useState(false);

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  if (!isOpen) return null;

  const totalItems = PR_NEWS.length;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % totalItems);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);

  const currentItem = PR_NEWS[currentIndex];
  const isNews = currentItem.type === 'news';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in ring-1 ring-white/20 dark:ring-slate-700">
        
        {/* Close Button (Top Right) */}
        <button 
            onClick={() => onClose(dontShow)}
            className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition backdrop-blur-md"
        >
            <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Carousel Container */}
        <div className="h-56 relative bg-slate-200 dark:bg-slate-800 group overflow-hidden">
             
             {/* Slider Wrapper using TranslateX for smooth transition */}
             <div 
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
             >
                {PR_NEWS.map((item, index) => {
                    const itemIsNews = item.type === 'news';
                    return (
                        <div key={item.id} className="min-w-full h-full relative">
                            {item.imageUrl ? (
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${itemIsNews ? 'from-rose-500 to-orange-400' : 'from-emerald-500 to-teal-400'} flex items-center justify-center`}>
                                    <i className={`fa-solid ${itemIsNews ? 'fa-bullhorn' : 'fa-file-arrow-down'} text-6xl text-white/30 transform -rotate-12`}></i>
                                </div>
                            )}
                            
                            {/* Gradient Overlay (Per slide) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
                        </div>
                    );
                })}
             </div>

             {/* Overlay Content (Static position relative to slide) */}
             <div className="absolute inset-0 pointer-events-none flex items-end p-6 z-10">
                 <div className="text-white w-full">
                     <div className="flex justify-between items-end">
                        <span className={`inline-block px-2 py-1 rounded ${isNews ? 'bg-rose-600' : 'bg-emerald-600'} text-xs font-bold mb-2 shadow-lg`}>
                            {isNews ? 'ข่าวประชาสัมพันธ์' : 'เอกสารดาวน์โหลด'}
                        </span>
                        <span className="text-xs font-medium text-white/80 mb-2">{currentIndex + 1} / {totalItems}</span>
                     </div>
                 </div>
             </div>

             {/* Navigation Arrows */}
             <button 
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 z-20 rounded-full bg-black/20 text-white hover:bg-black/50 flex items-center justify-center transition backdrop-blur-sm opacity-0 group-hover:opacity-100"
             >
                <i className="fa-solid fa-chevron-left"></i>
             </button>
             <button 
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 z-20 rounded-full bg-black/20 text-white hover:bg-black/50 flex items-center justify-center transition backdrop-blur-sm opacity-0 group-hover:opacity-100"
             >
                <i className="fa-solid fa-chevron-right"></i>
             </button>

             {/* Dots */}
             <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {PR_NEWS.map((_, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
                    />
                ))}
             </div>
        </div>

        {/* Content (Changes based on current index) */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
            {/* Animated Content Wrapper */}
            <div key={currentIndex} className="animate-fade-in">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-snug">
                    {currentItem.title}
                </h3>
                <div className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2">
                    <i className="fa-regular fa-calendar"></i> {currentItem.date}
                </div>
                
                <div className="prose prose-slate dark:prose-invert text-sm text-slate-600 dark:text-slate-300 mb-6">
                    <p>{currentItem.desc}</p>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
             <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition select-none group">
                 <input 
                    type="checkbox" 
                    checked={dontShow}
                    onChange={(e) => setDontShow(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-slate-900 dark:focus:ring-sky-500 accent-slate-900 cursor-pointer" 
                 />
                 <span className="text-xs font-bold group-hover:text-slate-900 dark:group-hover:text-white">ไม่แสดงอีกในครั้งถัดไป</span>
             </label>

             <button
                onClick={() => onClose(dontShow)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold text-sm hover:bg-slate-800 dark:hover:bg-sky-500 active:scale-95 transition shadow-lg shadow-slate-200 dark:shadow-none flex items-center gap-2"
             >
                <span>รับทราบ</span>
                <i className="fa-solid fa-check"></i>
             </button>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;