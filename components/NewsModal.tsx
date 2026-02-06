import React from 'react';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in">
        
        {/* Header Image Area */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 h-40 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-20">
                 <i className="fa-solid fa-bullhorn text-9xl text-white transform -rotate-12 translate-x-10 translate-y-10"></i>
             </div>
             <div className="text-center z-10 p-4">
                 <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10 backdrop-blur-md text-white mb-3 ring-4 ring-white/20">
                    <i className="fa-solid fa-bell text-3xl animate-pulse"></i>
                 </div>
                 <h2 className="text-2xl font-black text-white tracking-wide">ข่าวประชาสัมพันธ์</h2>
             </div>
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition"
             >
                <i className="fa-solid fa-xmark"></i>
             </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
                เปิดรับส่งผลงานวิชาการ ประจำปี 2568 📢
            </h3>
            <div className="prose prose-slate text-sm text-slate-600 mb-6">
                <p className="mb-2">ขอเชิญบุคลากรสาธารณสุข ร่วมส่งผลงานวิชาการเพื่อประกวดในงานประชุมวิชาการประจำปี โดยสามารถส่งผลงานได้ตั้งแต่วันนี้ จนถึงวันที่ 30 มีนาคม 2568</p>
                <ul className="list-disc pl-4 space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <li>🎯 ประเภทวาจา (Oral Presentation)</li>
                    <li>📊 ประเภท e-poster</li>
                    <li>💡 นวัตกรรมและสิ่งประดิษฐ์</li>
                </ul>
                <p className="mt-4 text-xs text-rose-600 font-bold">* กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยันการส่งผลงาน</p>
            </div>

            <button
                onClick={onClose}
                className="w-full rounded-2xl bg-slate-900 text-white py-4 font-bold text-lg hover:bg-slate-800 active:scale-95 transition shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
            >
                <i className="fa-solid fa-circle-check"></i>
                <span>รับทราบ / เข้าสู่เว็บไซต์</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;