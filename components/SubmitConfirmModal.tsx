import React, { useState } from 'react';

interface SubmitConfirmModalProps {
  isOpen: boolean;
  title: string;
  text: string;
  confirmText: string;
  cancelText: string;
  onConfirm: (rating?: number, ratingEase?: number, ratingDesign?: number, ratingContent?: number, comment?: string) => void;
  onCancel: () => void;
  saving?: boolean;
  requireFeedback?: boolean;
}

const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({ 
  isOpen, title, text, confirmText, cancelText, onConfirm, onCancel, saving, requireFeedback = false
}) => {
  const [ratingEase, setRatingEase] = useState<number>(0);
  const [ratingDesign, setRatingDesign] = useState<number>(0);
  const [ratingContent, setRatingContent] = useState<number>(0);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

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

  const isConfirmDisabled = saving || (requireFeedback && (ratingEase === 0 || ratingDesign === 0 || ratingContent === 0));

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    const averageRating = Math.round((ratingEase + ratingDesign + ratingContent) / 3);
    onConfirm(averageRating, ratingEase, ratingDesign, ratingContent, comment);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="p-8 text-center overflow-y-auto custom-scrollbar">
            <div className="w-20 h-20 bg-sky-100 dark:bg-sky-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-sky-500 text-4xl shadow-inner border border-sky-200 dark:border-sky-800">
              <i className="fa-regular fa-paper-plane"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{title}</h3>
            {text && <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{text}</p>}

            {requireFeedback && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-200 dark:border-slate-700 text-left space-y-4">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-star text-amber-400"></i>
                        ประเมินความพึงพอใจเว็บไซต์
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 inline-block bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-3 py-1.5 rounded-lg border border-sky-100 dark:border-sky-800">
                        <i className="fa-solid fa-lock mr-1"></i> กรุณาให้คะแนนให้ครบทั้ง 3 ข้อเพื่อปลดล็อคปุ่มยืนยัน
                    </p>

                    <div>
                      <div className="font-bold text-slate-800 dark:text-white text-xs">1. ความง่ายและสะดวกในการใช้งาน</div>
                      <div className="flex gap-2 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setRatingEase(star)} className={`text-xl transition-transform hover:scale-110 active:scale-95 ${ratingEase >= star ? getRatingColor(star) : 'text-slate-200 dark:text-slate-700'}`}>
                              <i className="fa-solid fa-star"></i>
                          </button>
                          ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white text-xs">2. ความสวยงามและเป็นระเบียบ</div>
                      <div className="flex gap-2 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setRatingDesign(star)} className={`text-xl transition-transform hover:scale-110 active:scale-95 ${ratingDesign >= star ? getRatingColor(star) : 'text-slate-200 dark:text-slate-700'}`}>
                              <i className="fa-solid fa-star"></i>
                          </button>
                          ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-slate-800 dark:text-white text-xs">3. ความครบถ้วนของเนื้อหา</div>
                      <div className="flex gap-2 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setRatingContent(star)} className={`text-xl transition-transform hover:scale-110 active:scale-95 ${ratingContent >= star ? getRatingColor(star) : 'text-slate-200 dark:text-slate-700'}`}>
                              <i className="fa-solid fa-star"></i>
                          </button>
                          ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">ข้อเสนอแนะเพิ่มเติม (ถ้ามี)</label>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="บอกเราได้เลยว่าเว็บใช้งานเป็นอย่างไรบ้าง..."
                            className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-sky-400 transition placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white resize-none"
                        ></textarea>
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 text-center space-y-0.5">
                        <p className="font-medium text-slate-500 dark:text-slate-400">ความคิดเห็นของท่าน คือโอกาสในการพัฒนาของเรา</p>
                        <p>จัดทำโดย กลุ่มงานสุขภาพดิจิทัล สำนักงานสาธารณสุขจังหวัดสตูล 2026</p>
                    </div>
                </div>
            )}

            <div className="flex gap-4 mt-2">
                <button
                    onClick={onCancel}
                    disabled={saving}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition disabled:opacity-50"
                >
                    {cancelText}
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isConfirmDisabled}
                    className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm 
                        ${isConfirmDisabled 
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                            : 'bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white hover:shadow-md'
                        }
                    `}
                >
                    {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                    {confirmText}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitConfirmModal;
