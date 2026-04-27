
import React, { useState, useEffect } from 'react';
import { NewsItem } from '../types';

interface NewsModalProps {
  isOpen: boolean;
  onClose: (dontShow: boolean) => void;
  initialIndex?: number;
  newsList: NewsItem[];
}

const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose, initialIndex = 0, newsList }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dontShow, setDontShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
        setCurrentIndex(initialIndex);
        setIsClosing(false);
    }
  }, [isOpen, initialIndex]);

  const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          setIsClosing(false);
          onClose(dontShow);
      }, 300); // Wait for animation
  };

  if (!isOpen && !isClosing) return null;
  if (newsList.length === 0) return null;

  const totalItems = newsList.length;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % totalItems);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);

  const currentItem = newsList[currentIndex];
  const isNews = currentItem.type === 'news';

  return (
    <>
      <div className={`fixed inset-0 z-[200] flex items-center justify-center px-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Backdrop with stronger blur and smooth transition */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
          onClick={handleClose}
        />
        
        {/* Modal Content */}
        <div className={`relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/20 dark:ring-slate-700 transition-all duration-300 transform ${isClosing ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0 animate-bounce-in'}`}>
          
          {/* Close Button (Floating) */}
          <button 
              onClick={handleClose}
              className="absolute top-4 right-4 z-30 h-9 w-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition backdrop-blur-sm border border-white/10"
          >
              <i className="fa-solid fa-xmark text-lg"></i>
          </button>

          {/* Carousel / Image Header Section - Made Taller */}
          <div className="h-80 md:h-96 relative bg-slate-100 dark:bg-slate-800 group overflow-hidden shrink-0">
               
               {/* Slider Wrapper */}
               <div 
                  className="flex h-full transition-transform duration-500 ease-out will-change-transform"
                  style={{ transform: `translateX(-${currentIndex * 100}%)` }}
               >
                  {newsList.map((item, index) => {
                      const itemIsNews = item.type === 'news';
                      return (
                          <div key={item.id} className="min-w-full h-full relative">
                              {item.imageUrl ? (
                                  <div 
                                      className="w-full h-full cursor-pointer group/img relative"
                                      onClick={() => setFullScreenImage(item.imageUrl || null)}
                                  >
                                      <img 
                                          src={item.imageUrl} 
                                          alt={item.title} 
                                          className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                          <div className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 scale-75 group-hover/img:scale-100">
                                              <i className="fa-solid fa-expand text-xl"></i>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className={`w-full h-full bg-gradient-to-br ${itemIsNews ? 'from-rose-500 to-orange-400' : 'from-emerald-500 to-teal-400'} flex items-center justify-center`}>
                                      <div className="relative">
                                          <i className={`fa-solid ${itemIsNews ? 'fa-bullhorn' : 'fa-file-arrow-down'} text-8xl text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150`}></i>
                                          <i className={`fa-solid ${itemIsNews ? 'fa-bullhorn' : 'fa-file-arrow-down'} text-6xl text-white relative z-10 drop-shadow-md`}></i>
                                      </div>
                                  </div>
                              )}
                              
                              {/* Stylish Gradient Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent pointer-events-none"></div>
                          </div>
                      );
                  })}
               </div>

               {/* Badge & Counter Overlay */}
               <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex justify-between items-end pointer-events-none">
                   <div>
                       <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-md border border-white/10 ${isNews ? 'bg-rose-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
                          <i className={`fa-solid ${isNews ? 'fa-newspaper' : 'fa-download'}`}></i>
                          {isNews ? 'ข่าวประชาสัมพันธ์' : 'เอกสารดาวน์โหลด'}
                       </span>
                   </div>
                   <div className="bg-black/30 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                       {currentIndex + 1} / {totalItems}
                   </div>
               </div>

               {/* Navigation Arrows */}
               <button 
                  onClick={prevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 z-20 rounded-full bg-white/10 hover:bg-white/30 text-white border border-white/20 flex items-center justify-center transition backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0"
               >
                  <i className="fa-solid fa-chevron-left"></i>
               </button>
               <button 
                  onClick={nextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 z-20 rounded-full bg-white/10 hover:bg-white/30 text-white border border-white/20 flex items-center justify-center transition backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-x-[10px] group-hover:translate-x-0"
               >
                  <i className="fa-solid fa-chevron-right"></i>
               </button>
          </div>

          {/* Content Body */}
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
              <div key={currentIndex} className="animate-fade-in">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
                      <i className="fa-regular fa-calendar-check text-sky-500"></i>
                      <span>เผยแพร่เมื่อ: {currentItem.date}</span>
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-4 leading-tight">
                      {currentItem.title}
                  </h3>
                  
                  <div className="prose prose-slate dark:prose-invert prose-sm md:prose-base text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>{currentItem.desc}</p>
                  </div>
              </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
               {/* Checkbox Group */}
               <label className="flex items-center gap-3 cursor-pointer group select-none py-2 px-1">
                   <div className="relative flex items-center">
                      <input 
                          type="checkbox" 
                          checked={dontShow}
                          onChange={(e) => setDontShow(e.target.checked)}
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 bg-white transition-all checked:border-sky-500 checked:bg-sky-500 hover:border-sky-400 dark:border-slate-600 dark:bg-slate-800" 
                      />
                      <i className="fa-solid fa-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
                   </div>
                   <span className="text-sm font-bold text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200 transition">
                      ไม่แสดงอีกในครั้งถัดไป
                   </span>
               </label>

               {/* Prominent Action Button */}
               <button
                  onClick={handleClose}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold text-sm shadow-lg shadow-slate-200 hover:shadow-xl hover:shadow-slate-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 dark:from-sky-600 dark:to-sky-500 dark:shadow-none dark:hover:bg-sky-400"
               >
                  <span>รับทราบ / ปิดหน้าต่าง</span>
                  <i className="fa-solid fa-arrow-right"></i>
               </button>
          </div>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in">
              <button 
                  onClick={() => setFullScreenImage(null)}
                  className="absolute top-6 right-6 z-40 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition backdrop-blur-md border border-white/20"
              >
                  <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
              <img 
                  src={fullScreenImage} 
                  alt="Full Screen" 
                  className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl animate-bounce-in"
              />
          </div>
      )}
    </>
  );
};

export default NewsModal;
