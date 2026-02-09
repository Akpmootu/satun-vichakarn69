import React, { useMemo } from 'react';
import { Submission, AppSettings, SubmissionStatus } from '../types';
import { apiUpdateSubmission } from '../services/apiService';
import { WORK_TYPES, BRANCHES } from '../constants';
import Badge from './ui/Badge';

declare const Swal: any;

interface ReviewerPanelProps {
  submissions: Submission[];
  settings: AppSettings;
  refreshData: () => void;
  showToast: (t: any) => void;
}

const ReviewerPanel: React.FC<ReviewerPanelProps> = ({ submissions, settings, refreshData, showToast }) => {
  
  // Filter only relevant items for reviewer
  const pendingReviews = useMemo(() => {
      return submissions.filter(s => ['submitted', 'reviewed'].includes(s.status));
  }, [submissions]);

  const finishedReviews = useMemo(() => {
      return submissions.filter(s => ['accepted', 'rejected'].includes(s.status));
  }, [submissions]);

  const handleGrade = async (s: Submission) => {
      const { value: formValues } = await Swal.fire({
          title: 'ประเมินผลงาน',
          html: `
            <div class="text-left mb-4">
                <div class="font-bold text-slate-800">${s.firstName} ${s.lastName}</div>
                <div class="text-sm text-slate-500">${s.organization}</div>
            </div>
            <select id="swal-status" class="swal2-input">
                <option value="accepted">ผ่านการคัดเลือก (Accept)</option>
                <option value="rejected">ไม่ผ่านการคัดเลือก (Reject)</option>
                <option value="reviewed">รอแก้ไข/ตรวจสอบเพิ่มเติม (Review)</option>
            </select>
            <textarea id="swal-note" class="swal2-textarea" placeholder="ความคิดเห็นคณะกรรมการ..."></textarea>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'บันทึกผลการประเมิน',
          preConfirm: () => {
            return {
              status: (document.getElementById('swal-status') as HTMLSelectElement).value,
              note: (document.getElementById('swal-note') as HTMLTextAreaElement).value
            }
          }
      });

      if (formValues) {
          try {
              const audit = s.audit || [];
              await apiUpdateSubmission(settings, s.id, {
                  status: formValues.status as SubmissionStatus,
                  audit: [...audit, {
                      at: new Date().toISOString(),
                      action: `REVIEWER_${formValues.status.toUpperCase()}`,
                      note: formValues.note || 'ประเมินโดยคณะกรรมการ'
                  }]
              });
              showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'ผลการประเมินถูกบันทึกแล้ว' });
              refreshData();
          } catch (e: any) {
              showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
          }
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
        <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <i className="fa-solid fa-gavel text-9xl"></i>
            </div>
            <h1 className="text-3xl font-black relative z-10 flex items-center gap-3">
                <i className="fa-solid fa-clipboard-check text-amber-400"></i>
                คณะกรรมการ (Reviewer Panel)
            </h1>
            <p className="text-indigo-200 relative z-10 mt-2 max-w-xl">
                ระบบตรวจและประเมินผลงานวิชาการสาธารณสุขจังหวัดสตูล
            </p>
            
            <div className="flex gap-4 mt-6 relative z-10">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 px-5 border border-white/20">
                    <div className="text-2xl font-bold">{pendingReviews.length}</div>
                    <div className="text-xs text-indigo-200">รอตรวจ</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 px-5 border border-white/20">
                    <div className="text-2xl font-bold">{finishedReviews.length}</div>
                    <div className="text-xs text-indigo-200">ตรวจแล้ว</div>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-sky-500"></i> รายการรอดำเนินการ
            </h2>
            
            {pendingReviews.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                    <i className="fa-solid fa-check-circle text-6xl text-emerald-100 mb-4"></i>
                    <div className="text-slate-400">ไม่มีรายการค้างตรวจแล้ว เยี่ยมมาก!</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingReviews.map(s => (
                        <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 hover:shadow-md transition group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-bold text-lg text-slate-900 dark:text-white">{s.firstName} {s.lastName}</div>
                                    <div className="text-sm text-slate-500">{s.organization}</div>
                                </div>
                                <Badge tone="navy">{s.status}</Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-tag text-slate-400 w-5"></i>
                                    {WORK_TYPES.find(w => w.id === s.workType)?.label}
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-stethoscope text-slate-400 w-5"></i>
                                    {BRANCHES.find(b => b.id === s.branchId)?.label}
                                </div>
                                {s.fileUrl && (
                                    <a href={s.fileUrl} target="_blank" className="flex items-center gap-2 text-sky-600 font-bold hover:underline">
                                        <i className="fa-solid fa-file-pdf w-5"></i> เปิดดูไฟล์ผลงาน
                                    </a>
                                )}
                            </div>

                            <button 
                                onClick={() => handleGrade(s)}
                                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none dark:bg-sky-600 dark:hover:bg-sky-500"
                            >
                                <i className="fa-solid fa-pen-fancy"></i> ให้คะแนน / ประเมิน
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {finishedReviews.length > 0 && (
            <div className="opacity-60 hover:opacity-100 transition">
                <h2 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-4 mt-8 flex items-center gap-2">
                    <i className="fa-solid fa-history"></i> ประวัติการตรวจล่าสุด
                </h2>
                <div className="space-y-2">
                    {finishedReviews.slice(0, 5).map(s => (
                        <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{s.firstName} {s.lastName}</div>
                            <Badge tone={s.status === 'accepted' ? 'green' : 'red'}>{s.status}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default ReviewerPanel;