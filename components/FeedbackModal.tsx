import React, { useState } from 'react';
import { apiSubmitFeedback } from '../services/apiService';
import { LOGO_URL } from '../constants';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  showToast: (t: any) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, userId, showToast }) => {
  const [ratingEase, setRatingEase] = useState<number>(0);
  const [ratingDesign, setRatingDesign] = useState<number>(0);
  const [ratingContent, setRatingContent] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const getRatingColor = (r: number) => {
    switch(r) {
      case 1: return 'text-rose-500';
      case 2: return 'text-orange-500';
      case 3: return 'text-amber-500';
      case 4: return 'text-lime-500';
      case 5: return 'text-emerald-500';
      default: return 'text-slate-200 dark:text-slate-700';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (ratingEase === 0 || ratingDesign === 0 || ratingContent === 0) {
      showToast({ type: 'warning', title: 'กรุณาให้คะแนน', message: 'รบกวนเลือกให้คะแนนดาวให้ครบทั้ง 3 ข้อด้วยนะครับ 🙏' });
      return;
    }
    setLoading(true);
    try {
      const averageRating = Math.round((ratingEase + ratingDesign + ratingContent) / 3);
      await apiSubmitFeedback(userId, averageRating, ratingEase, ratingDesign, ratingContent, comment);
      showToast({ type: 'success', title: 'ขอบคุณมากครับ! ❤️', message: 'เราได้รับฟีดแบคของคุณแล้ว จะนำไปปรับปรุงให้ดีขึ้นครับ' });
      onClose();
      // Reset after close
      setTimeout(() => {
          setRatingEase(0);
          setRatingDesign(0);
          setRatingContent(0);
          setComment('');
      }, 500);
    } catch (e: any) {
      showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่ในภายหลังครับ' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center z-10">
            <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="p-8 text-center overflow-y-auto custom-scrollbar flex-1">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 mt-2">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">แบบประเมินความพึงพอใจการใช้งานเว็บไซต์</h3>
            
            <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6 space-y-5">
               <div>
                  <div className="font-bold text-slate-800 dark:text-white text-sm">1. ความง่ายและสะดวกในการใช้งาน</div>
                  <div className="text-xs text-slate-500 font-light mt-0.5 mb-2">* สามารถค้นหาข้อมูลหรือเข้าถึงเมนูต่างๆ ได้รวดเร็วแค่ไหน 🖱️</div>
                  <div className="flex gap-2">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <button
                         key={star}
                         onClick={() => setRatingEase(star)}
                         className={`text-2xl transition-transform hover:scale-110 active:scale-95 ${ratingEase >= star ? getRatingColor(star) : 'text-slate-200 dark:text-slate-700'} drop-shadow-sm`}
                       >
                         <i className="fa-solid fa-star"></i>
                       </button>
                     ))}
                  </div>
               </div>
               
               <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-800 dark:text-white text-sm">2. ความสวยงามและเป็นระเบียบ</div>
                  <div className="text-xs text-slate-500 font-light mt-0.5 mb-2">* รูปแบบเว็บไซต์ดูสบายตาและมีความเป็นทางการน่าเชื่อถือเพียงใด 🏛️</div>
                  <div className="flex gap-2">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <button
                         key={star}
                         onClick={() => setRatingDesign(star)}
                         className={`text-2xl transition-transform hover:scale-110 active:scale-95 ${ratingDesign >= star ? getRatingColor(star) : 'text-slate-200 dark:text-slate-700'} drop-shadow-sm`}
                       >
                         <i className="fa-solid fa-star"></i>
                       </button>
                     ))}
                  </div>
               </div>

               <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-800 dark:text-white text-sm">3. ความครบถ้วนของเนื้อหา</div>
                  <div className="text-xs text-slate-500 font-light mt-0.5 mb-2">* ข้อมูลที่ได้รับตอบโจทย์และเป็นประโยชน์ต่อการใช้งานหรือไม่ 📄</div>
                  <div className="flex gap-2">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <button
                         key={star}
                         onClick={() => setRatingContent(star)}
                         className={`text-2xl transition-transform hover:scale-110 active:scale-95 ${ratingContent >= star ? getRatingColor(star) : 'text-slate-200 dark:text-slate-700'} drop-shadow-sm`}
                       >
                         <i className="fa-solid fa-star"></i>
                       </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* Comment */}
            <div className="text-left mb-6">
              <label className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 block">ข้อเสนอแนะเพิ่มเติม</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="คำแนะนำในการปรับปรุง..."
                className="w-full h-24 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 transition placeholder:text-slate-300 dark:placeholder:text-slate-500 dark:text-white resize-none"
              ></textarea>
            </div>

            <button
               onClick={handleSubmit}
               disabled={loading}
               className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-lg transition shadow-xl shadow-sky-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
            >
              {loading ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : (
                  <><i className="fa-regular fa-paper-plane"></i> ส่งแบบประเมิน</>
              )}
            </button>
            
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 space-y-1">
                <p className="font-medium text-slate-500 dark:text-slate-400">ความคิดเห็นของท่าน คือโอกาสในการพัฒนาของเรา</p>
                <p>จัดทำโดย กลุ่มงานสุขภาพดิจิทัล สำนักงานสาธารณสุขจังหวัดสตูล 2026</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;

