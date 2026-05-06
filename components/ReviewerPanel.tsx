import React, { useState, useEffect, useMemo } from 'react';
import { Submission, AppSettings, UserProfile, ReviewerScore } from '../types';
import { apiGetAllScores, apiSaveReviewerScore, apiUpdateSubmission } from '../services/apiService';
import { WORK_TYPES, BRANCHES, BRANCH_GROUPS } from '../constants';
import Pagination from './ui/Pagination';

declare const Swal: any;

interface ReviewerPanelProps {
  submissions: Submission[];
  settings: AppSettings;
  refreshData: () => void;
  showToast: (t: any) => void;
  currentUser: UserProfile;
  onTriggerFeedback?: () => void;
}

interface CriteriaItem {
  id: string;
  label: string;
  weight: number;
  group?: string;
}

const ORAL_CRITERIA: CriteriaItem[] = [
  { id: '1', label: '1. วัตถุประสงค์ความเป็นมา หลักการและเหตุผล', weight: 3 },
  { id: '2', label: '2. ระเบียบวิธีการศึกษา/วิจัย', weight: 5 },
  { id: '3', label: '3. การนำเสนอ การลำดับเรื่องและการตอบข้อซักถาม การรักษาเวลา', weight: 4 },
  { id: '4', label: '4. วิจารณ์ผลและสรุป', weight: 4 },
  { id: '5', label: '5. การนำไปใช้ประโยชน์', weight: 4 }
];

const INNOVATION_CRITERIA: CriteriaItem[] = [
  { id: '1_1', label: '1.1 ความสำคัญของเรื่องที่ศึกษา', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '1_2', label: '1.2 ประโยชน์ในการแก้ปัญหาสาธารณสุข', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '1_3', label: '1.3 Original idea', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '2', label: '2. การออกแบบและการพัฒนา (design)', weight: 5 },
  { id: '3', label: '3. การประเมินผล', weight: 4 },
  { id: '4_1', label: '4.1 Reproducibility', weight: 4, group: '4. การนำไปใช้ประโยชน์' },
  { id: '4_2', label: '4.2 Applicability', weight: 4, group: '4. การนำไปใช้ประโยชน์' }
];

const parseAttachments = (fileUrl?: string) => {
    if (!fileUrl) return [];
    try {
        if (fileUrl.startsWith('[')) {
            return JSON.parse(fileUrl);
        }
        return [{ type: 'file', value: fileUrl, name: 'ไฟล์แนบ' }];
    } catch (e) {
        return [];
    }
};

const ScoreSelector = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
    const getColorClass = (v: number, isSelected: boolean) => {
        if (!isSelected) {
            return 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 hover:text-slate-700';
        }
        switch(v) {
            case 1: return 'bg-rose-500 text-white shadow-md shadow-rose-200 dark:shadow-none';
            case 2: return 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none';
            case 3: return 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-none';
            case 4: return 'bg-lime-500 text-white shadow-md shadow-lime-200 dark:shadow-none';
            case 5: return 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none';
            default: return 'bg-sky-500 text-white';
        }
    };

    return (
        <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 3, 4, 5].map(v => (
                <button
                    key={v}
                    onClick={() => onChange(v)}
                    className={`h-10 w-10 shrink-0 rounded-xl font-bold flex items-center justify-center transition-all ${getColorClass(v, value === v)}`}
                >
                    {v}
                </button>
            ))}
            {value > 0 && <span className="ml-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-xs font-bold animate-fade-in"><i className="fa-solid fa-check"></i> เลือกลงคะแนนแล้ว</span>}
        </div>
    );
};

const ReviewerPanel: React.FC<ReviewerPanelProps> = ({ submissions, settings, refreshData, showToast, currentUser, onTriggerFeedback }) => {
  const [allScores, setAllScores] = useState<ReviewerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [currentScoreData, setCurrentScoreData] = useState<Record<string, {score: number, comment: string}>>({});
  
  const loadScores = async () => {
      setLoading(true);
      try {
          const scores = await apiGetAllScores();
          setAllScores(scores);
      } catch (err: any) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      loadScores();
  }, [submissions]);

  const [filter, setFilter] = useState({ search: '', type: 'all', branch: 'all', org: 'all' });

  // Only show submissions explicitly assigned to this reviewer, or within their branches
  const branchSubmissions = useMemo(() => {
      const myBranches = (currentUser.branchId || "").toString().split(',').filter(Boolean);
      
      let filtered = submissions.filter(s => {
          const isAssigned = (s.reviewerIds || []).includes(currentUser.id) || s.reviewerId === currentUser.id;
          if (isAssigned) return true;
          // Submissions in their branch
          if (s.branchId && myBranches.includes(s.branchId.toString())) return true;
          return false;
      });

      // Apply Filters
      if (filter.search.trim() !== '') {
          const q = filter.search.toLowerCase();
          filtered = filtered.filter(s => 
              (s.fileName || '').toLowerCase().includes(q) || 
              `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(q)
          );
      }
      if (filter.type !== 'all') {
          filtered = filtered.filter(s => s.workType === filter.type);
      }
      if (filter.branch !== 'all') {
          filtered = filtered.filter(s => s.branchId?.toString() === filter.branch);
      }
      if (filter.org !== 'all') {
          filtered = filtered.filter(s => s.organization === filter.org);
      }

      return filtered;
  }, [submissions, currentUser, filter]);

  const [submissionPage, setSubmissionPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };
  
  const paginatedSubmissions = useMemo(() => {
      let results = [...branchSubmissions];
      if (sortConfig) {
          results.sort((a: any, b: any) => {
              let valA = a[sortConfig.key] || '';
              let valB = b[sortConfig.key] || '';
              if (sortConfig.key === 'firstName') {
                  valA = a.firstName + ' ' + a.lastName;
                  valB = b.firstName + ' ' + b.lastName;
              }
              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      const start = (submissionPage - 1) * ITEMS_PER_PAGE;
      return results.slice(start, start + ITEMS_PER_PAGE);
  }, [branchSubmissions, submissionPage, sortConfig]);

  const totalPages = Math.ceil(branchSubmissions.length / ITEMS_PER_PAGE);

  const handleOpenAssessment = (sub: Submission) => {
      setActiveSubmission(sub);
      const existing = allScores.find(s => s.submissionId === sub.id && s.reviewerId === currentUser.id);
      if (existing) {
          setCurrentScoreData(existing.scoreData);
      } else {
          setCurrentScoreData({});
      }
  };

  const calculateTotal = (workType: string, scoreData: Record<string, {score: number}>) => {
      const criteria = workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;
      let total = 0;
      criteria.forEach(c => {
          if (scoreData[c.id] && scoreData[c.id].score) {
              total += scoreData[c.id].score * c.weight;
          }
      });
      return total;
  };

  const handleSaveScore = async () => {
      if (!activeSubmission) return;
      const criteria = activeSubmission.workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;
      
      let missing = false;
      criteria.forEach(c => {
          if (!currentScoreData[c.id] || !currentScoreData[c.id].score) {
              missing = true;
          }
      });

      if (missing) {
          const { isConfirmed } = await Swal.fire({
              title: 'ข้อมูลไม่ครบถ้วน',
              text: 'คุณยังให้คะแนนไม่ครบทุกหัวข้อ ยืนยันที่จะบันทึกไว้ก่อนหรือไม่?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'บันทึกชั่วคราว',
              cancelButtonText: 'ยกเลิก',
              confirmButtonColor: '#0ea5e9'
          });
          if (!isConfirmed) return;
      } else {
          // Show summary
          const summaryHtml = criteria.map(c => {
             const sc = currentScoreData[c.id]?.score || 0;
             return `<div class="flex justify-between text-sm py-1.5 border-b border-slate-100"><span class="truncate pr-4 text-slate-600">${c.label}</span><b class="text-slate-800">${sc} × ${c.weight} = ${sc * c.weight}</b></div>`;
          }).join('');
          
          const total = calculateTotal(activeSubmission.workType, currentScoreData);
          
          const { isConfirmed } = await Swal.fire({
              title: 'สรุปคะแนนประเมิน',
              html: `<div class="text-left mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto">${summaryHtml}</div>
                     <div class="text-center font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 p-6 rounded-2xl border-2 border-sky-200 dark:border-sky-800 shadow-inner">
                        <div class="text-sm text-sky-500 mb-1 font-bold uppercase tracking-widest">คะแนนรวมที่ได้</div>
                        <span class="text-6xl drop-shadow-md">${total}</span> <span class="text-3xl text-sky-300">/ 100</span>
                     </div>`,
              showCancelButton: true,
              confirmButtonText: 'ยืนยันการส่งคะแนน',
              cancelButtonText: 'กลับไปแก้ไข',
              confirmButtonColor: '#10b981',
              cancelButtonColor: '#64748b',
              width: '32em'
          });
          if (!isConfirmed) return;
      }

      Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
          const totalScore = calculateTotal(activeSubmission.workType, currentScoreData);
          await apiSaveReviewerScore({
              submissionId: activeSubmission.id,
              reviewerId: currentUser.id,
              workType: activeSubmission.workType,
              scoreData: currentScoreData,
              totalScore: totalScore
          });
          
          if (activeSubmission.status === 'reviewed') {
              const audit = activeSubmission.audit || [];
              await apiUpdateSubmission(settings, activeSubmission.id, {
                  status: 'scored',
                  audit: [
                      ...audit,
                      {
                          at: new Date().toISOString(),
                          action: 'SCORED',
                          note: `กรรมการ (${currentUser.firstName}) ให้คะแนนเรียบร้อยแล้ว`
                      }
                  ]
              });
              refreshData(); // To refresh submissions list from parent
          }
          
          await loadScores();
          showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'บันทึกคะแนนเรียบร้อยแล้วคะค่ะ' });
          setActiveSubmission(null);
          Swal.close();
      } catch (err: any) {
          Swal.close();
          showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      }
  };

  const renderTable = () => (
      <div className="animate-fade-in space-y-6 max-w-7xl mx-auto pb-10">
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <i className="fa-solid fa-chart-bar absolute -bottom-5 -right-5 text-8xl opacity-20 transform -rotate-12"></i>
                <div className="relative z-10">
                    <h2 className="font-black text-2xl mb-1"><i className="fa-solid fa-list-check opacity-70 mr-2"></i>รายชื่อผลงานที่รับผิดชอบ</h2>
                    <p className="text-sky-100 font-medium mb-4">
                        คุณมีผลงานที่ได้รับมอบหมายทั้งหมด {branchSubmissions.length} รายการ
                    </p>
                    
                    {branchSubmissions.length > 0 && (
                        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 text-sm font-bold shadow-sm">
                            <i className="fa-solid fa-bell text-yellow-300 animate-pulse"></i> 
                            มีผู้เสนอส่งผลงานมา จำนวน {branchSubmissions.length} รายการ
                        </div>
                    )}
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <i className="fa-solid fa-search absolute left-4 top-3.5 text-slate-400"></i>
                    <input 
                        type="text" 
                        placeholder="พิมพ์ค้นหาชื่อผลงาน, ชื่อผู้ส่ง..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none focus:bg-white focus:ring-2 focus:ring-sky-200 text-sm dark:text-white transition-all"
                        value={filter.search}
                        onChange={e => setFilter({...filter, search: e.target.value})}
                    />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white text-sm"
                        value={filter.type}
                        onChange={e => setFilter({...filter, type: e.target.value})}
                    >
                        <option value="all">ทุกประเภท</option>
                        {WORK_TYPES.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white text-sm max-w-[200px] overflow-hidden text-ellipsis"
                        value={filter.branch}
                        onChange={e => setFilter({...filter, branch: e.target.value})}
                    >
                        <option value="all">ทุกสาขา</option>
                        {BRANCHES.map(b => <option key={b.id} value={b.id}>{String(b.id).padStart(2,'0')} - {b.label}</option>)}
                    </select>
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white text-sm max-w-[200px] overflow-hidden text-ellipsis"
                        value={filter.org}
                        onChange={e => setFilter({...filter, org: e.target.value})}
                    >
                        <option value="all">ทุกสถานพยาบาล</option>
                        {Array.from(new Set(submissions.map(s => s.organization).filter(Boolean))).map(org => 
                            <option key={org} value={org}>{org}</option>
                        )}
                    </select>
                </div>
            </div>

            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-500 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-list-check"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ผลงานในความรับผิดชอบ</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-microphone-lines"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.filter(s => s.workType === 'oral').length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ประเภท Oral</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-images"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.filter(s => s.workType === 'eposter').length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ประเภท E-Poster</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-lightbulb"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.filter(s => s.workType === 'innovation').length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ประเภท N-Innovation</div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 border-collapse min-w-[800px]">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <tr>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">ลำดับการ<br/>นำเสนอ</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('workType')}>
                                    ประเภท {sortConfig?.key === 'workType' && <i className={`fa-solid fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>}
                                </th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('fileName')}>
                                    ชื่อผลงาน {sortConfig?.key === 'fileName' && <i className={`fa-solid fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>}
                                </th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleSort('firstName')}>
                                    ชื่อผู้ส่ง {sortConfig?.key === 'firstName' && <i className={`fa-solid fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>}
                                </th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">นำเสนอ</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center bg-sky-50 dark:bg-sky-900/30">คะแนน<br/>ของฉัน</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">รวม<br/>คะแนน</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">จำนวน<br/>กรรมการ</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">เฉลี่ย</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center rounded-tr-xl">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedSubmissions.map((s, idx) => {
                                const subScores = allScores.filter(sc => sc.submissionId === s.id);
                                const myScore = subScores.find(sc => sc.reviewerId === currentUser.id);
                                const totalSc = subScores.reduce((acc, cr) => acc + cr.totalScore, 0);
                                const avgSc = subScores.length > 0 ? (totalSc / subScores.length).toFixed(2) : '-';
                                const workTypeName = WORK_TYPES.find(w => w.id === s.workType)?.label || s.workType;
                                
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group">
                                        <td className="px-5 py-4 text-center">{((submissionPage - 1) * ITEMS_PER_PAGE + idx + 1).toString().padStart(2, '0')}</td>
                                        <td className="px-5 py-4">
                                            <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap mb-1
                                                ${s.workType === 'oral' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800' :
                                                  s.workType === 'eposter' ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800' :
                                                  s.workType === 'innovation' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' :
                                                  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}
                                            `}>
                                                {workTypeName}
                                            </div>
                                            <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[150px]" title={s.branchId ? BRANCHES.find(b => b.id.toString() === s.branchId?.toString())?.label : ''}>
                                                {s.branchId ? `สาขา: ${String(s.branchId).padStart(2,'0')}` : '-'}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4" title={s.fileName}>
                                            <div className="font-bold text-slate-800 dark:text-slate-200">{s.fileName}</div>
                                        </td>
                                        <td className="px-5 py-4">{s.firstName} {s.lastName}</td>
                                        <td className="px-5 py-4 text-center">
                                            {s.presentationUrl ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="text-[10px] text-emerald-500 font-bold uppercase">ส่งแล้ว</div>
                                                    <a href={s.presentationUrl} target="_blank" rel="noreferrer" className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center hover:bg-sky-500 hover:text-white transition shadow-sm" title="เปิดลิงก์นำเสนอ">
                                                        <i className="fa-solid fa-file-powerpoint"></i>
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 opacity-40">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">ยังไม่ส่ง</div>
                                                    <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center">
                                                        <i className="fa-solid fa-file-circle-xmark"></i>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center font-black text-sky-600 bg-sky-50/50 dark:bg-sky-900/10 group-hover:bg-sky-100/50 transition">
                                            {myScore ? myScore.totalScore : <span className="text-slate-300 font-normal">-</span>}
                                        </td>
                                        <td className="px-5 py-4 text-center font-bold text-slate-800 dark:text-white">{totalSc > 0 ? totalSc : <span className="text-slate-300 font-normal">-</span>}</td>
                                        <td className="px-5 py-4 text-center">{subScores.length > 0 ? subScores.length : <span className="text-slate-300">-</span>}</td>
                                        <td className="px-5 py-4 text-center font-black text-emerald-600">{avgSc}</td>
                                        <td className="px-5 py-4 text-center">
                                            {s.status === 'accepted' || s.status === 'reviewed' ? (
                                                <button 
                                                    onClick={() => handleOpenAssessment(s)}
                                                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-200 dark:bg-slate-800/80 dark:hover:bg-emerald-500 dark:hover:shadow-none rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto w-full md:w-auto"
                                                >
                                                    <i className="fa-regular fa-pen-to-square"></i> {myScore ? 'แก้ไขคะแนน' : 'ให้คะแนน'}
                                                </button>
                                            ) : (
                                                <div className="px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl inline-flex items-center justify-center gap-1.5 whitespace-nowrap mx-auto w-full md:w-auto text-center" title="รอแอดมินยืนยันความสมบูรณ์ของเอกสารก่อน จึงจะสามารถให้คะแนนได้">
                                                    <i className="fa-solid fa-lock opacity-50"></i> แอดมินยังไม่ยืนยัน
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {branchSubmissions.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-5 py-16 text-center text-slate-400">
                                        <i className="fa-solid fa-inbox text-4xl mb-3 opacity-30 block"></i>
                                        ไม่พบรายการผลงานในสาขาที่คุณรับผิดชอบ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                        <Pagination 
                            currentPage={submissionPage} 
                            totalPages={totalPages} 
                            onPageChange={setSubmissionPage} 
                        />
                    </div>
                )}
            </div>
      </div>
  );

  const renderAssessment = () => {
      if (!activeSubmission) return null;
      const criteria = activeSubmission.workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;
      const attachments = parseAttachments(activeSubmission.fileUrl);
      const mainPdf = attachments.find((a: any) => a.name === 'ไฟล์นำเสนอ' || (a.value && a.value.toLowerCase().includes('.pdf'))) || attachments[0];

      return (
          <div className="animate-fade-in flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto pb-10">
              
              {/* Left Side: Detail & Content */}
              <div className="w-full lg:w-[45%] flex flex-col gap-5">
                  <button 
                      onClick={() => setActiveSubmission(null)}
                      className="self-start px-4 py-2 bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold hover:text-sky-600 hover:shadow-md hover:bg-slate-50 transition rounded-xl flex items-center gap-2 shadow-sm border border-slate-200 dark:border-slate-700"
                  >
                      <i className="fa-solid fa-arrow-left"></i> ย้อนกลับ
                  </button>
                  
                  <div className="bg-sky-50 dark:bg-sky-900/10 border-t-4 border-sky-500 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-5 md:p-6 space-y-4 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                              <span className="text-slate-500 font-medium">รหัสผลงาน</span> 
                              <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 col-span-2 place-self-start">{activeSubmission.id.substring(0,8)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-sky-100 dark:border-sky-800/50 pt-4">
                              <span className="text-slate-500 font-medium">ชื่อผลงาน</span> 
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-base leading-tight col-span-2">{activeSubmission.fileName}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-sky-100 dark:border-sky-800/50 pt-4">
                              <span className="text-slate-500 font-medium">ผู้จัดทำ</span> 
                              <span className="col-span-2 flex items-center gap-2 text-slate-700 dark:text-slate-300"><i className="fa-solid fa-user text-sky-400"></i> {activeSubmission.firstName} {activeSubmission.lastName}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-sky-100 dark:border-sky-800/50 pt-4">
                              <span className="text-slate-500 font-medium">หมวดหมู่</span> 
                              <span className="col-span-2 text-slate-700 dark:text-slate-300">{WORK_TYPES.find(w => w.id === activeSubmission.workType)?.label}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-sky-100 dark:border-sky-800/50 pt-4">
                              <span className="text-slate-500 font-medium">ไฟล์นำเสนอ</span> 
                              <span className="col-span-2">
                                  {activeSubmission.presentationUrl ? (
                                      <a 
                                          href={activeSubmission.presentationUrl} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition shadow-md shadow-emerald-200 dark:shadow-none"
                                      >
                                          <i className="fa-solid fa-file-powerpoint"></i> เปิดลิงก์นำเสนอ (Canva/Drive)
                                      </a>
                                  ) : (
                                      <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded-lg">
                                          <i className="fa-solid fa-circle-exclamation"></i> ยังไม่ได้แนบลิงก์นำเสนอ
                                      </span>
                                  )}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Document Preview Logic */}
                  {(() => {
                      let embedUrl = "";
                      let isGoogleDrive = false;
                      let isCanva = false;
                      
                      const pUrl = activeSubmission.presentationUrl;
                      const fUrl = activeSubmission.fileUrl;
                      
                      // Priority 1: Presentation URL
                      if (pUrl) {
                          if (pUrl.includes('drive.google.com')) {
                              embedUrl = pUrl.replace(/\/view.*$/, '/preview');
                              isGoogleDrive = true;
                          } else if (pUrl.includes('canva.com/design/')) {
                              // Convert Canva link to embed if possible, or just use as is
                              embedUrl = pUrl;
                              isCanva = true;
                          } else {
                              embedUrl = pUrl;
                          }
                      } 
                      // Priority 2: File URL (PDF/Drive)
                      else if (fUrl) {
                          const atts = parseAttachments(fUrl);
                          const first = atts[0]?.value;
                          if (first) {
                              if (first.includes('drive.google.com')) {
                                  embedUrl = first.replace(/\/view.*$/, '/preview');
                                  isGoogleDrive = true;
                              } else {
                                  embedUrl = first;
                              }
                          }
                      }

                      if (!embedUrl) {
                          return (
                              <div className="flex-1 min-h-[300px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 text-slate-400 p-8 text-center">
                                  <i className="fa-solid fa-folder-open text-6xl mb-4 opacity-50"></i>
                                  <div className="font-bold text-lg text-slate-600 dark:text-slate-300">ไม่มีไฟล์หรือลิงก์นำเสนอ</div>
                                  <p className="text-sm mt-2">ผู้ส่งยังไม่ได้แนบลิงก์นำเสนอผลงาน</p>
                              </div>
                          );
                      }

                      return (
                          <div className="flex-1 min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col bg-slate-900 shadow-md relative group">
                              <div className="absolute top-2 right-2 p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <a href={embedUrl} target="_blank" rel="noreferrer" className="w-10 h-10 bg-black/60 hover:bg-sky-500 text-white rounded-xl backdrop-blur-md flex items-center justify-center transition border border-white/10" title="เปิดในแท็บใหม่">
                                      <i className="fa-solid fa-external-link-alt text-sm"></i>
                                  </a>
                              </div>
                              <iframe 
                                  src={embedUrl} 
                                  className="w-full h-full flex-1 border-0 bg-white" 
                                  title="Presentation Viewer"
                                  allow="autoplay"
                              />
                          </div>
                      );
                  })()}
              </div>

              {/* Right Side: Scoring Form */}
              <div className="w-full lg:w-[55%]">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden flex flex-col h-full">
                      {/* Decoration */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 dark:bg-sky-900/10 rounded-bl-full pointer-events-none -z-0 opacity-50"></div>
                      
                      <div className="flex items-center justify-between mb-8 relative z-10">
                          <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                              <i className="fa-solid fa-clipboard-check text-emerald-500"></i> ให้คะแนน 
                              <span className="text-sm font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-full uppercase tracking-widest">{activeSubmission.workType}</span>
                          </h3>
                          <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl shadow-sm text-center">
                              <div className="text-[10px] font-black uppercase tracking-wider mb-0.5 opacity-80">คะแนนรวมขณะนี้</div>
                              <div className="text-2xl font-black leading-none">{calculateTotal(activeSubmission.workType, currentScoreData)}<span className="text-base text-emerald-500 dark:text-emerald-600">/100</span></div>
                          </div>
                      </div>
                      
                      <div className="space-y-8 relative z-10 flex-1 overflow-y-auto pb-10 pr-2 custom-scrollbar">
                          {criteria.map((c, i) => {
                              const v = currentScoreData[c.id]?.score || 0;
                              const note = currentScoreData[c.id]?.comment || '';
                              const showGroup = c.group && (i === 0 || criteria[i-1].group !== c.group);
                              
                              return (
                                  <div key={c.id}>
                                      {showGroup && (
                                          <div className="text-base font-black text-sky-700 dark:text-sky-400 mb-4 pb-2 border-b-2 border-sky-100 dark:border-sky-900/50 flex items-center gap-2">
                                              <i className="fa-solid fa-layer-group text-sky-300"></i> {c.group}
                                          </div>
                                      )}
                                      <div className={`p-5 rounded-2xl transition border ${v > 0 ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800/50' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800'} ${c.group ? 'ml-2 md:ml-4' : ''}`}>
                                          <div className="flex justify-between items-start gap-4 mb-4">
                                              <div className="font-bold text-slate-700 dark:text-slate-200 text-base leading-snug">{c.label} 
                                                  <span className="text-[11px] font-black text-white bg-rose-500 px-2 py-0.5 rounded-md inline-block ml-2 align-middle">x{c.weight}</span>
                                              </div>
                                              <div className="text-right shrink-0 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center min-w-[70px]">
                                                  <div className="text-xs text-slate-400 uppercase font-black tracking-wider mb-0.5">รวม</div>
                                                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 leading-none">{v > 0 ? v * c.weight : '-'}</div>
                                              </div>
                                          </div>
                                          
                                          <ScoreSelector 
                                              value={v} 
                                              onChange={(val) => setCurrentScoreData(prev => ({...prev, [c.id]: { ...prev[c.id], score: val }}))} 
                                          />
                                          
                                          <div className="mt-4 relative group">
                                              <div className="absolute left-3 top-2.5 text-slate-400 transition group-focus-within:text-sky-500">
                                                  <i className="fa-regular fa-comment-dots"></i>
                                              </div>
                                              <input 
                                                  type="text"
                                                  placeholder="เพิ่มข้อเสนอแนะในหัวข้อนี้ (ไม่บังคับ)..."
                                                  value={note}
                                                  onChange={(e) => setCurrentScoreData(prev => ({...prev, [c.id]: { ...prev[c.id], comment: e.target.value }}))}
                                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 transition placeholder:text-slate-300"
                                              />
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 flex flex-col gap-4">
                          <button 
                              onClick={handleSaveScore}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition flex items-center justify-center gap-3 shadow-xl dark:bg-sky-600 dark:hover:bg-sky-500 focus:ring-4 focus:ring-sky-100"
                          >
                              <i className="fa-solid fa-check-double text-emerald-400"></i> ตรวจทานและส่งคะแนน
                          </button>
                      </div>
                  </div>
              </div>

          </div>
      );
  };

  return (
    <div className="min-h-[500px] mb-20 relative z-10 w-full animate-fade-in">
        {!activeSubmission ? renderTable() : renderAssessment()}
    </div>
  );
};

export default ReviewerPanel;
