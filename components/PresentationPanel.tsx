import React, { useState, useRef } from 'react';
import { Submission, AppSettings, UserProfile } from '../types';
import { apiUpdateSubmission } from '../services/apiService';
import { BRANCHES } from '../constants';
import { motion } from 'motion/react';
import Swal from 'sweetalert2';

interface PresentationPanelProps {
    submissions: Submission[];
    settings: AppSettings;
    currentUser: UserProfile;
    refreshData: () => void;
    showToast: (t: any) => void;
    hasMoreSubmissions?: boolean;
    onLoadMore?: () => void;
    loadingMore?: boolean;
}

const PresentationPanel: React.FC<PresentationPanelProps> = ({ 
    submissions, settings, currentUser, refreshData, showToast,
    hasMoreSubmissions, onLoadMore, loadingMore
}) => {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

    const userSubmissions = submissions.filter(s => s.userId === currentUser.id);

    const validateUrl = (url: string) => {
        const lower = url.toLowerCase();
        // Allow ONLY google drive link (maybe with pdf mention but drive links usually look like drive.google.com/file/d/...)
        return lower.includes('drive.google.com');
    };

    const handleUpdateLink = async (submission: Submission) => {
        const { value: url } = await Swal.fire({
            title: 'ส่งรายละเอียดไฟล์นำเสนอ',
            input: 'url',
            inputLabel: 'กรุณาแนบลิงก์ (Google Drive ที่เป็นไฟล์ .pdf เท่านั้น)',
            inputValue: submission.presentationUrl || '',
            inputPlaceholder: 'https://drive.google.com/...',
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
                if (!validateUrl(value)) return 'รองรับเฉพาะลิงก์ Google Drive เท่านั้น';
                return null;
            }
        });

        if (url) {
            setLoadingMap(prev => ({ ...prev, [submission.id]: true }));
            try {
                const newAudit = {
                    at: new Date().toISOString(),
                    action: 'อัปเดตลิงก์นำเสนอ',
                    note: `ผู้ส่งผลงานทำการแนบลิงก์: ${url}`
                };
                const updatedAudit = [...(submission.audit || []), newAudit];
                await apiUpdateSubmission(settings, submission.id, { presentationUrl: url, audit: updatedAudit });
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
                    กรุณาแนบลิงก์ไฟล์นำเสนอผลงาน (Google Drive ที่เป็นไฟล์ .pdf เท่านั้น) ให้ครบทุกผลงานที่ส่งเข้าร่วม
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
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <i className="fa-solid fa-code-branch text-sky-500"></i>
                                            {BRANCHES.find(b => b.id === s.branchId)?.label || `สาขาที่ ${s.branchId}`}
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
                                    
                                    {/* Action Logs */}
                                    {s.audit && s.audit.filter(a => a.action === 'อัปเดตลิงก์นำเสนอ').length > 0 && (
                                        <div className="mt-3 text-[11px] text-slate-400 font-medium">
                                            <i className="fa-solid fa-clock-rotate-left mr-1.5"></i>
                                            อัปเดตล่าสุด: {new Date(s.audit.filter(a => a.action === 'อัปเดตลิงก์นำเสนอ').pop()!.at).toLocaleString('th-TH')}
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 flex flex-col md:flex-row items-center gap-2">
                                    <button
                                        onClick={() => handleUpdateLink(s)}
                                        disabled={loadingMap[s.id]}
                                        className={`
                                            px-4 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 w-full md:w-auto justify-center
                                            ${s.presentationUrl 
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white' 
                                                : 'bg-sky-500 text-white shadow-lg shadow-sky-200 dark:shadow-none hover:bg-sky-600'}
                                            disabled:opacity-50
                                        `}
                                    >
                                        {loadingMap[s.id] ? (
                                            <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                                        ) : (
                                            <i className={`fa-solid ${s.presentationUrl ? 'fa-pen-to-square' : 'fa-link'}`}></i>
                                        )}
                                        {s.presentationUrl ? 'แก้ไขลิงก์' : 'แนบลิงก์ Google Drive (.pdf)'}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Iframe Preview */}
                            {s.presentationUrl && (
                                <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-tv"></i> ตัวอย่างการแสดงผล (Preview)
                                        </div>
                                        {/* Canva warning removed */}
                                    </div>
                                    <div className="w-full aspect-video md:h-[400px] md:aspect-auto">
                                        <iframe 
                                            src={
                                            s.presentationUrl.includes('drive.google.com') ? s.presentationUrl.replace(/\/view.*$/, '/preview') :
                                            s.presentationUrl
                                            }
                                            className="w-full h-full border-0"
                                            allow="fullscreen"
                                            title="Presentation Preview"
                                        ></iframe>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {hasMoreSubmissions && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="group bg-white hover:bg-sky-50 dark:bg-slate-900/50 dark:hover:bg-sky-900/20 text-sky-600 dark:text-sky-400 px-10 py-3.5 rounded-2xl font-black text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 border-2 border-sky-100 dark:border-sky-800"
                    >
                        {loadingMore ? (
                            <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
                        ) : (
                            <i className="fa-solid fa-cloud-arrow-down text-lg group-hover:animate-bounce"></i>
                        )}
                        <div className="flex flex-col items-start leading-tight text-left">
                            <span>{loadingMore ? 'กำลังดึงข้อมูล...' : 'แสดงผลงานเพิ่ม'}</span>
                            <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">{loadingMore ? 'โปรดรอสักครู่' : `โหลดก้อนถัดไป (+20 รายการ)`}</span>
                        </div>
                    </button>
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
                        <span><b>Google Drive:</b> ไฟล์ที่แนบต้องเป็นนามสกุล .pdf และกรุณาตั้งค่าการแชร์ "ทุกคนที่มีลิงก์ (Anyone with the link)" ให้สามารถดูได้</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span><b>ข้อควรระวัง:</b> หากพรีวิวไม่แสดงผล แสดงว่ากรรมการก็จะไม่สามารถดูไฟล์ได้ กรุณาตรวจสอบการตั้งค่าการแชร์ให้เป็นสาธารณะ</span>
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
