import React, { useState } from 'react';
import { Submission, AppSettings, UserProfile } from '../types';
import { apiUpdateSubmission } from '../services/apiService';
import { motion } from 'motion/react';
import Swal from 'sweetalert2';

interface PresentationPanelProps {
    submissions: Submission[];
    settings: AppSettings;
    currentUser: UserProfile;
    refreshData: () => void;
    showToast: (t: any) => void;
}

const PresentationPanel: React.FC<PresentationPanelProps> = ({ submissions, settings, currentUser, refreshData, showToast }) => {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const userSubmissions = submissions.filter(s => s.userId === currentUser.id);

    const validateUrl = (url: string) => {
        const lower = url.toLowerCase();
        return lower.includes('drive.google.com') || lower.includes('canva.com');
    };

    const handleUpdateLink = async (submission: Submission) => {
        const { value: url } = await Swal.fire({
            title: 'ส่งไฟล์นำเสนอผลงาน',
            input: 'url',
            inputLabel: 'กรุณาแนบลิงก์ (Google Drive หรือ Canva เท่านั้น)',
            inputValue: submission.presentationUrl || '',
            inputPlaceholder: 'https://drive.google.com/... หรือ https://canva.com/...',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'บันทึกข้อมูล',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0ea5e9',
            cancelButtonColor: '#64748b',
            customClass: {
                popup: 'rounded-3xl',
                input: 'rounded-xl'
            },
            inputValidator: (value: string) => {
                if (!value) return 'กรุณาระบุลิงก์';
                if (!validateUrl(value)) return 'รองรับเฉพาะลิงก์ Google Drive หรือ Canva เท่านั้น';
                return null;
            }
        });

        if (url) {
            setLoadingMap(prev => ({ ...prev, [submission.id]: true }));
            try {
                await apiUpdateSubmission(settings, submission.id, { presentationUrl: url });
                showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'บันทึกลิงก์ไฟล์นำเสนอผลงานเรียบร้อยแล้ว' });
                refreshData();
            } catch (e: any) {
                showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
            } finally {
                setLoadingMap(prev => ({ ...prev, [submission.id]: false }));
            }
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-200 dark:shadow-none">
                        <i className="fa-solid fa-file-powerpoint"></i>
                    </div>
                    ส่งไฟล์นำเสนอผลงาน
                </h2>
                <div className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
                    กรุณาแนบลิงก์ไฟล์นำเสนอผลงาน (Google Drive หรือ Canva) ให้ครบทุกผลงานที่ส่งเข้าร่วม
                </div>
            </div>

            {userSubmissions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
                    <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 text-3xl mx-auto mb-4">
                        <i className="fa-solid fa-folder-open"></i>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 font-bold text-lg">ไม่พบข้อมูลผลงาน</div>
                    <div className="text-slate-400 text-sm mt-1">กรุณาส่งผลงานเข้าร่วมก่อนจึงจะสามารถส่งไฟล์นำเสนอได้</div>
                </div>
            ) : (
                <div className="space-y-4">
                    {userSubmissions.map((s) => (
                        <motion.div 
                            key={s.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                            {/* Status Indicator */}
                            <div className={`absolute top-0 right-0 w-2 h-full ${s.presentationUrl ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${s.presentationUrl ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                                            {s.presentationUrl ? 'ส่งแล้ว' : 'ยังไม่ได้ส่ง'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{s.id.substring(0, 8)}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-2" title={s.fileName}>{s.fileName}</h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <i className="fa-solid fa-tag text-sky-500"></i>
                                            {s.workType.toUpperCase()}
                                        </div>
                                        {s.presentationUrl && (
                                            <a 
                                                href={s.presentationUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline font-medium"
                                            >
                                                <i className="fa-solid fa-link"></i>
                                                เปิดดูลิงก์ที่แนบ
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center">
                                    <button
                                        onClick={() => handleUpdateLink(s)}
                                        disabled={loadingMap[s.id]}
                                        className={`
                                            px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 w-full md:w-auto justify-center
                                            ${s.presentationUrl 
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white' 
                                                : 'bg-sky-500 text-white shadow-lg shadow-sky-200 dark:shadow-none hover:bg-sky-600'}
                                            disabled:opacity-50
                                        `}
                                    >
                                        {loadingMap[s.id] ? (
                                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                                        ) : (
                                            <i className={`fa-solid ${s.presentationUrl ? 'fa-pen-to-square' : 'fa-plus'}`}></i>
                                        )}
                                        {s.presentationUrl ? 'แก้ไขลิงก์' : 'แนบลิงก์นำเสนอ'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-circle-info text-sky-500"></i>
                    คำแนะนำในการส่งไฟล์นำเสนอ
                </h4>
                <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                    <li className="flex gap-2">
                        <span className="text-sky-500 font-bold">•</span>
                        <span><b>Google Drive:</b> กรุณาตั้งค่าการแชร์ "ทุกคนที่มีลิงก์ (Anyone with the link)" ให้สามารถดูได้</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-sky-500 font-bold">•</span>
                        <span><b>Canva:</b> ใช้ลิงก์ในหมวดหมู่ "ลิงก์แสดงตัวอย่างเพื่ออ่านอย่างเดียว (Public View Link)"</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-sky-500 font-bold">•</span>
                        <span><b>ความสำคัญ:</b> ไฟล์นำเสนอนี้จะถูกส่งให้คณะกรรมการประเมินเพื่อใช้ประกอบการพิจารณาคะแนน</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default PresentationPanel;
