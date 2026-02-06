import React from 'react';
import { PR_NEWS } from '../constants';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Highlight the first news item
  const highlightNews = PR_NEWS.find(n => n.type === 'news') || PR_NEWS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in ring-1 ring-white/20">
        
        {/* Close Button (Top Right) */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition backdrop-blur-md"
        >
            <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Header Image Area */}
        <div className="h-56 relative bg-slate-200">
             {highlightNews.imageUrl ? (
                 <img 
                    src={highlightNews.imageUrl} 
                    alt={highlightNews.title} 
                    className="w-full h-full object-cover"
                 />
             ) : (
                 <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-center">
                    <i className="fa-solid fa-bullhorn text-6xl text-white/20"></i>
                 </div>
             )}
             
             {/* Gradient Overlay */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                 <div className="text-white">
                     <span className="inline-block px-2 py-1 rounded bg-rose-600 text-xs font-bold mb-2">
                        ประกาศล่าสุด
                     </span>
                 </div>
             </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto">
            <h3 className="text-xl font-black text-slate-900 mb-3 leading-snug">
                {highlightNews.title}
            </h3>
            
            <div className="prose prose-slate text-sm text-slate-600 mb-6">
                <p className="mb-2">{highlightNews.desc}</p>
                <ul className="list-disc pl-4 space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700">
                    <li>🎯 ประเภทวาจา (Oral Presentation)</li>
                    <li>📊 ประเภท e-poster</li>
                    <li>💡 นวัตกรรมและสิ่งประดิษฐ์</li>
                </ul>
                <p className="mt-4 text-xs text-rose-600 font-bold">* กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยันการส่งผลงาน</p>
            </div>

            <button
                onClick={onClose}
                className="w-full rounded-2xl bg-slate-900 text-white py-4 font-bold text-lg hover:bg-slate-800 active:scale-95 transition shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group"
            >
                <i className="fa-solid fa-circle-check group-hover:scale-110 transition"></i>
                <span>รับทราบ / เข้าสู่เว็บไซต์</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;