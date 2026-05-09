import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Submission, AppSettings, UserProfile, ReviewerScore } from '../types';
import { apiGetAllScores, apiSaveReviewerScore, apiUpdateSubmission, apiGetUserProfile, apiGetSubmissionById, apiGetAllUsers } from '../services/apiService';
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
  hasMoreSubmissions?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
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

const ReviewerPanel: React.FC<ReviewerPanelProps> = ({ 
    submissions, settings, refreshData, showToast, currentUser, onTriggerFeedback,
    hasMoreSubmissions, onLoadMore, loadingMore
}) => {
  const [allScores, setAllScores] = useState<ReviewerScore[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideCanvaExt, setHideCanvaExt] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [showAbstractModal, setShowAbstractModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [selectedRankingSubmission, setSelectedRankingSubmission] = useState<Submission | null>(null);
  const [currentScoreData, setCurrentScoreData] = useState<Record<string, {score: number, comment: string}>>({});
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  useEffect(() => {
    setActiveProfile(null);
    if (activeSubmission?.userId) {
        apiGetUserProfile(activeSubmission.userId).then(setActiveProfile).catch(console.error);
    }
  }, [activeSubmission]);
  
  const loadScores = async () => {
      setLoading(true);
      try {
          const [scores, users] = await Promise.all([
              apiGetAllScores(),
              apiGetAllUsers()
          ]);
          setAllScores(scores);
          setAllUsers(users);
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

  const handleOpenAssessment = async (sub: Submission) => {
      setIsFetchingDetail(true);
      setActiveSubmission(sub);
      
      try {
          const fullSub = await apiGetSubmissionById(sub.id);
          setActiveSubmission(fullSub);
          const existing = allScores.find(s => s.submissionId === sub.id && s.reviewerId === currentUser.id);
          if (existing) {
              setCurrentScoreData(existing.scoreData);
          } else {
              setCurrentScoreData({});
          }
      } catch (e: any) {
          showToast({ type: 'error', title: 'โหลดข้อมูลล้มเหลว', message: e.message });
          setActiveSubmission(null);
      } finally {
          setIsFetchingDetail(false);
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
      <div className="animate-fade-in space-y-6 max-w-7xl mx-auto pb-10 relative">
            {isFetchingDetail && (
                <div className="fixed inset-0 z-[110] bg-white/40 dark:bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-emerald-100 dark:border-slate-800 rounded-full"></div>
                    <div className="absolute w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">กำลังเข้าสู่โหมดประเมิน...</p>
                </div>
            )}
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <i className="fa-solid fa-chart-bar absolute -bottom-5 -right-5 text-8xl opacity-20 transform -rotate-12"></i>
                <div className="relative z-10">
                    <h2 className="font-black text-2xl mb-1"><i className="fa-solid fa-list-check opacity-70 mr-2"></i>รายชื่อผลงานที่รับผิดชอบ</h2>
                    
                    {/* Show assigned branches */}
                    {currentUser.branchId && (
                        <div className="flex flex-wrap gap-2 mb-3 mt-2">
                            {(currentUser.branchId || "").toString().split(',').filter(Boolean).map(bId => {
                                const branch = BRANCHES.find(b => b.id.toString() === bId);
                                return (
                                    <button 
                                        key={bId} 
                                        onClick={() => setFilter({ ...filter, branch: filter.branch === bId ? 'all' : bId })}
                                        className={`px-2.5 py-1 ${filter.branch === bId ? 'bg-sky-500 text-white border-sky-400 shadow-md' : 'bg-white/20 dark:bg-white/10 border-white/20 hover:bg-white/30'} rounded-lg text-sm backdrop-blur-sm border flex items-center gap-2 transition`}
                                    >
                                        <i className="fa-solid fa-tag text-sky-200"></i>
                                        {branch?.label || `สาขา ${bId}`}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <p className="text-sky-100 font-medium mb-4">
                        คุณมีผลงานที่ได้รับมอบหมายทั้งหมด {branchSubmissions.length} รายการ
                    </p>
                    
                    {branchSubmissions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 text-sm font-bold shadow-sm">
                                <i className="fa-solid fa-bell text-yellow-300 animate-pulse"></i> 
                                มีผู้เสนอส่งผลงานมา จำนวน {branchSubmissions.length} รายการ
                            </div>
                            <button 
                                onClick={() => setShowRankingModal(true)}
                                className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
                            >
                                <i className="fa-solid fa-ranking-star"></i>
                                สรุปคะแนน (Ranking)
                            </button>
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
                        <option value="all">ทุกสาขาที่รับผิดชอบ</option>
                        {BRANCHES.filter(b => (currentUser.branchId || '').toString().split(',').includes(b.id.toString())).map(b => <option key={b.id} value={b.id}>{String(b.id).padStart(2,'0')} - {b.label}</option>)}
                    </select>
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white text-sm max-w-[200px] overflow-hidden text-ellipsis"
                        value={filter.org}
                        onChange={e => setFilter({...filter, org: e.target.value})}
                    >
                        <option value="all">ทุกสถานพยาบาล</option>
                        {Array.from(new Set(branchSubmissions.map(s => s.organization).filter(Boolean))).map(org => 
                            <option key={org} value={org as string}>{org as string}</option>
                        )}
                    </select>
                </div>
            </div>

            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <button 
                    onClick={() => setFilter({ ...filter, type: 'all' })}
                    className={`text-left p-5 rounded-2xl shadow-sm border flex items-center gap-4 transition ${filter.type === 'all' ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-300 dark:border-sky-600 shadow-md transform -translate-y-1' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-1'}`}
                >
                    <div className="h-12 w-12 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-500 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-list-check"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ผลงานในความรับผิดชอบ</div>
                    </div>
                </button>
                <button 
                    onClick={() => setFilter({ ...filter, type: 'oral' })}
                    className={`text-left p-5 rounded-2xl shadow-sm border flex items-center gap-4 transition ${filter.type === 'oral' ? 'bg-amber-50 dark:bg-amber-900/40 border-amber-300 dark:border-amber-600 shadow-md transform -translate-y-1' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-1'}`}
                >
                    <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-microphone-lines"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.filter(s => s.workType === 'oral').length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ประเภท Oral</div>
                    </div>
                </button>
                <button 
                    onClick={() => setFilter({ ...filter, type: 'eposter' })}
                    className={`text-left p-5 rounded-2xl shadow-sm border flex items-center gap-4 transition ${filter.type === 'eposter' ? 'bg-purple-50 dark:bg-purple-900/40 border-purple-300 dark:border-purple-600 shadow-md transform -translate-y-1' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-1'}`}
                >
                    <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-images"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.filter(s => s.workType === 'eposter').length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ประเภท E-Poster</div>
                    </div>
                </button>
                <button 
                    onClick={() => setFilter({ ...filter, type: 'innovation' })}
                    className={`text-left p-5 rounded-2xl shadow-sm border flex items-center gap-4 transition ${filter.type === 'innovation' ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-600 shadow-md transform -translate-y-1' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-1'}`}
                >
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-lightbulb"></i></div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{branchSubmissions.filter(s => s.workType === 'innovation').length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">ประเภท N-Innovation</div>
                    </div>
                </button>
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
                                            <div className="text-[10px] text-slate-500 line-clamp-2 max-w-[200px]" title={s.branchId ? BRANCHES.find(b => b.id.toString() === s.branchId?.toString())?.label : ''}>
                                                {s.branchId ? `สาขา ${s.branchId}: ${BRANCHES.find(b => b.id.toString() === s.branchId?.toString())?.label || ''}` : '-'}
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
                                            {myScore ? (
                                                <button 
                                                    onClick={() => handleOpenAssessment(s)}
                                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-500 dark:hover:text-white dark:hover:shadow-none rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto w-full md:w-auto"
                                                >
                                                    <i className="fa-regular fa-pen-to-square"></i> แก้ไขคะแนน
                                                </button>
                                            ) : (s.status === 'accepted' || s.status === 'reviewed' || s.status === 'scored') ? (
                                                <button 
                                                    onClick={() => handleOpenAssessment(s)}
                                                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-200 dark:bg-slate-800/80 dark:hover:bg-emerald-500 dark:hover:shadow-none rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto w-full md:w-auto"
                                                >
                                                    <i className="fa-regular fa-pen-to-square"></i> ให้คะแนน
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
              {document.getElementById('top-bar-portal') && createPortal(
                  <button 
                      onClick={() => setActiveSubmission(null)}
                      className="animate-fade-in flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:text-sky-500 dark:hover:text-sky-400 transition rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5"
                  >
                      <i className="fa-solid fa-arrow-left"></i> ย้อนกลับ
                  </button>,
                  document.getElementById('top-bar-portal')!
              )}
              <div className="w-full lg:w-[60%] flex flex-col gap-5">
                  <div className="bg-sky-50 dark:bg-sky-900/10 border-t-4 border-sky-500 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-5 md:p-6 text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1 sm:col-span-2">
                                  <span className="text-slate-500 font-medium block text-xs uppercase tracking-wider">ชื่อผลงาน</span> 
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-base leading-tight block">{activeSubmission.fileName || "-"}</span>
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 font-medium block text-xs uppercase tracking-wider">ประเภทผลงาน</span> 
                                  <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight block">
                                      <i className="fa-solid fa-layer-group text-slate-400 mr-2"></i>
                                      {WORK_TYPES.find(w => w.id === activeSubmission.workType)?.label || "-"}
                                  </span>
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 font-medium block text-xs uppercase tracking-wider">สาขาผลงาน</span> 
                                  <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight block">
                                      <i className="fa-solid fa-code-branch text-slate-400 mr-2"></i>
                                      {BRANCHES.find(b => b.id === activeSubmission.branchId)?.label || "-"}
                                  </span>
                              </div>
                              <div className="space-y-1 border-t border-sky-100 dark:border-sky-800/50 pt-3">
                                   <div className="flex items-center justify-between gap-4 mb-2">
                                       <span className="text-slate-500 font-medium block text-xs uppercase tracking-wider">ผู้นำเสนอ</span> 
                                   </div>
                                   <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-3">
                                      <span>
                                         {activeSubmission.firstName} {activeSubmission.lastName}
                                      </span>
                                  </span>
                              </div>
                              <div className="hidden sm:flex border-t border-sky-100 dark:border-sky-800/50 pt-3 justify-center items-center sm:row-span-3">
                                  {attachments.length > 0 && attachments[0].value && (
                                      <button 
                                          onClick={() => setShowAbstractModal(true)}
                                          className="w-full h-full min-h-[120px] bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-900/10 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 border-dashed border-rose-200 dark:border-rose-800/50 hover:border-transparent hover:shadow-lg hover:-translate-y-1"
                                      >
                                          <div className="w-12 h-12 rounded-full bg-white dark:bg-rose-900/50 flex items-center justify-center text-current shadow-sm">
                                              <i className="fa-regular fa-file-pdf text-2xl"></i>
                                          </div>
                                          <span className="font-bold text-sm">เปิดบทคัดย่อ (Abstract)</span>
                                      </button>
                                  )}
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 font-medium block text-xs uppercase tracking-wider">ตำแหน่ง</span> 
                                  <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight block">
                                      <i className="fa-solid fa-briefcase text-slate-400 mr-2"></i>
                                      {activeSubmission.position || "-"} { activeProfile?.level ? <span className="text-sky-600 dark:text-sky-400">({activeProfile.level})</span> : ((activeSubmission as any).level ? <span className="text-sky-600 dark:text-sky-400">({(activeSubmission as any).level})</span> : "") }
                                  </span>
                              </div>
                              <div className="space-y-1 sm:col-start-1">
                                  <span className="text-slate-500 font-medium block text-xs uppercase tracking-wider">หน่วยงาน/สังกัด</span> 
                                  <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight block">
                                      <i className="fa-solid fa-building text-slate-400 mr-2"></i>
                                      {activeSubmission.organization || "-"}
                                  </span>
                              </div>
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
                          } else if (pUrl.includes('canva.com/design/') || pUrl.includes('canva.link/')) {
                              // Canva usually blocks embedding unless it's the specific view?embed URL.
                              // While we can try to format it, it's safer to just set isCanva = true
                              // which we will handle by showing a dedicated Canva button if it fails to embed
                              if (pUrl.includes('/view')) {
                                  embedUrl = pUrl.split('/view')[0] + '/view?embed';
                              } else {
                                  embedUrl = pUrl;
                              }
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
                              } else if (first.includes('canva.com/design/') || first.includes('canva.link/')) {
                                  if (first.includes('/view')) {
                                      embedUrl = first.split('/view')[0] + '/view?embed';
                                  } else {
                                      embedUrl = first;
                                  }
                                  isCanva = true;
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
                                  <a href={pUrl || embedUrl} target="_blank" rel="noreferrer" className="w-10 h-10 bg-black/60 hover:bg-sky-500 text-white rounded-xl backdrop-blur-md flex items-center justify-center transition border border-white/10" title="เปิดในแท็บใหม่">
                                      <i className="fa-solid fa-external-link-alt text-sm"></i>
                                  </a>
                              </div>
                              {isCanva ? (
                                  !hideCanvaExt ? (
                                      <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                                          <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 shadow-sm relative">
                                              <div className="flex items-center gap-2">
                                                  <div className="w-3 h-3 rounded-full bg-rose-400/80 shadow-sm"></div>
                                                  <div className="w-3 h-3 rounded-full bg-amber-400/80 shadow-sm"></div>
                                                  <div className="w-3 h-3 rounded-full bg-emerald-400/80 shadow-sm"></div>
                                                  <span className="ml-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                                                      <div className="w-5 h-5 rounded bg-[#00C4CC] flex items-center justify-center text-white text-[10px] font-black tracking-tighter mix-blend-multiply dark:mix-blend-normal">C</div>
                                                      Canva Viewer
                                                  </span>
                                              </div>
                                              <div className="flex gap-2 items-center">
                                                  <a href={pUrl || embedUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 px-3 py-1 bg-opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm border border-sky-100 dark:border-sky-500/20">
                                                      เปิดหน้าต่างใหม่ <i className="fa-solid fa-external-link-alt"></i>
                                                  </a>
                                                  <button onClick={() => setHideCanvaExt(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition-colors ml-1" title="ปิดแท็บตัวอย่าง">
                                                      <i className="fa-solid fa-times"></i>
                                                  </button>
                                              </div>
                                          </div>
                                          <div className="flex-1 bg-slate-100/50 dark:bg-slate-900">
                                              <iframe src={embedUrl} className="w-full h-full border-0" allow="autoplay" />
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 z-10 p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl m-2">
                                          <div className="w-16 h-16 bg-gradient-to-br from-[#00C4CC] to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-[#00c4cc]/20 mb-6 opacity-80 mix-blend-multiply dark:mix-blend-normal">
                                              <span className="text-white font-black text-2xl">C</span>
                                          </div>
                                          <h3 className="font-black text-xl text-slate-800 dark:text-white mb-2">Canva Viewer ถูกพับเก็บ</h3>
                                          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-sm">หน้าตัวอย่างถูกซ่อนไว้เพื่อจัดการป็อปอัป หากคุณต้องการดูงานนำเสนออีกครั้งสามารถคลิกได้ด้านล่าง</p>
                                          <div className="flex flex-col sm:flex-row gap-3">
                                              <button onClick={() => setHideCanvaExt(false)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#00C4CC] hover:text-[#00C4CC] text-slate-600 dark:text-slate-300 font-bold rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-[#00C4CC]/20">
                                                  <i className="fa-solid fa-rotate-right mr-2"></i> โหลดตัวอย่างใหม่
                                              </button>
                                              <a href={pUrl || embedUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-[#00C4CC] hover:bg-[#00a9b0] text-white font-bold rounded-xl shadow-md shadow-[#00c4cc]/20 transition-all focus:ring-4 focus:ring-[#00C4CC]/40 flex items-center gap-2 justify-center">
                                                  <i className="fa-solid fa-external-link-alt"></i> เปิด Canva ในหน้าใหม่
                                              </a>
                                          </div>
                                      </div>
                                  )
                              ) : (
                                  <iframe 
                                      src={embedUrl} 
                                      className="w-full h-full flex-1 border-0 bg-white" 
                                      title="Presentation Viewer"
                                      allow="autoplay"
                                  />
                              )}
                          </div>
                      );
                  })()}
              </div>

              {/* Right Side: Scoring Form */}
              <div className="w-full lg:w-[40%]">
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
                          <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                             <div className="font-bold text-sky-800 dark:text-sky-300">คะแนนรวมทั้งหมด</div>
                             <div className="text-3xl font-black text-sky-600 dark:text-sky-400">{calculateTotal(activeSubmission.workType, currentScoreData)} <span className="text-lg opacity-50">/ 100</span></div>
                          </div>
                          <button 
                              onClick={handleSaveScore}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition flex items-center justify-center gap-3 shadow-xl dark:bg-sky-600 dark:hover:bg-sky-500 focus:ring-4 focus:ring-sky-100"
                          >
                              <i className="fa-solid fa-check-double text-emerald-400"></i> ตรวจทานและส่งคะแนน
                          </button>
                      </div>
                  </div>
              </div>

              {/* Abstract Modal Overlay */}
              {showAbstractModal && activeSubmission.fileUrl && parseAttachments(activeSubmission.fileUrl).length > 0 && parseAttachments(activeSubmission.fileUrl)[0].value && createPortal(
                  <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/50 backdrop-blur-sm overflow-hidden p-4 md:p-8 animate-fade-in" style={{zIndex: 99999}}>
                      <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowAbstractModal(false)}></div>
                      <div className="relative z-10 w-full max-w-6xl mx-auto h-full flex flex-col bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/20">
                          <div className="bg-white dark:bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                              <div className="font-bold flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-900/30 flex items-center justify-center">
                                      <i className="fa-regular fa-file-pdf"></i>
                                  </div>
                                  บทคัดย่อ (Abstract)
                              </div>
                              <div className="flex items-center gap-3">
                                  <a href={parseAttachments(activeSubmission.fileUrl)[0].value} target="_blank" rel="noreferrer" className="text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
                                      เปิดแอปภายนอก <i className="fa-solid fa-external-link-alt"></i>
                                  </a>
                                  <button onClick={() => setShowAbstractModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 dark:hover:bg-rose-500 transition-colors shadow-sm">
                                      <i className="fa-solid fa-times text-lg"></i>
                                  </button>
                              </div>
                          </div>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 md:p-4">
                              <iframe 
                                  src={parseAttachments(activeSubmission.fileUrl)[0].value.replace(/\/view.*$/, '/preview')} 
                                  className="w-full h-full border-0 rounded-2xl shadow-inner bg-white dark:bg-slate-900" 
                                  allow="autoplay" 
                                  title="Abstract Document"
                              />
                          </div>
                      </div>
                  </div>,
                  document.body
              )}

          </div>
      );
  };

  return (
    <div className="min-h-[500px] mb-20 relative z-10 w-full animate-fade-in">
        {!activeSubmission ? renderTable() : renderAssessment()}

        {/* Ranking Modal */}
        {showRankingModal && createPortal(
            <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/50 backdrop-blur-sm p-4 md:p-8 animate-fade-in print:p-0 print:bg-white" style={{zIndex: 99999}}>
                <style>{`
                    @media print {
                        body { background: white; }
                        #root, .print-hidden-global { display: none !important; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                `}</style>
                <div className="absolute inset-0 bg-slate-900/50 print:hidden" onClick={() => { setShowRankingModal(false); setSelectedRankingSubmission(null); }}></div>
                <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/20 max-h-full print:max-h-none print:shadow-none print:ring-0 print:rounded-none">
                    <div className="bg-white dark:bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 shrink-0 print:hidden">
                        <div className="font-bold flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-500 dark:bg-pink-900/30 flex items-center justify-center">
                                <i className="fa-solid fa-ranking-star"></i>
                            </div>
                            สรุปลำดับคะแนน (Ranking)
                        </div>
                        <button onClick={() => { setShowRankingModal(false); setSelectedRankingSubmission(null); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-pink-50 text-pink-500 hover:bg-pink-500 hover:text-white dark:bg-pink-500/10 dark:hover:bg-pink-500 transition-colors shadow-sm">
                            <i className="fa-solid fa-times text-lg"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto print:overflow-visible p-4 md:p-6 bg-slate-50 dark:bg-slate-950 print:bg-white print:p-0">
                        <div className="space-y-3">
                            {(() => {
                                if (selectedRankingSubmission) {
                                    const s = selectedRankingSubmission;
                                    const subScores = allScores.filter(sc => sc.submissionId === s.id);
                                    const totalSc = subScores.reduce((acc, cr) => acc + cr.totalScore, 0);
                                    const avgSc = subScores.length > 0 ? (totalSc / subScores.length).toFixed(2) : '0.00';
                                    const criteria = s.workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;
                                    
                                    const scoreValues = subScores.map(sc => sc.totalScore);
                                    const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
                                    const minScore = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;
                                    const hasOutlier = scoreValues.length > 1 && (maxScore - minScore >= 15);
                                    
                                    return (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="flex justify-between items-center print:hidden">
                                                <button onClick={() => setSelectedRankingSubmission(null)} className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center gap-2">
                                                    <i className="fa-solid fa-arrow-left"></i> กลับไปหน้ารวม
                                                </button>
                                                <button onClick={() => window.print()} className="text-sm font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
                                                    <i className="fa-solid fa-print"></i> พิมพ์รายงาน
                                                </button>
                                            </div>
                                            
                                            <div className="print:block hidden mb-4">
                                                <h2 className="text-2xl font-black text-center mb-2">รายงานสรุปผลการประเมิน</h2>
                                                <p className="text-center text-slate-500 text-sm">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
                                            </div>

                                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 print:shadow-none print:border-slate-300 print:rounded-xl">
                                                <div className="font-bold text-slate-800 dark:text-white text-xl mb-1">{s.fileName}</div>
                                                <div className="text-sm text-slate-500 mb-4">{WORK_TYPES.find(w => w.id === s.workType)?.label} &bull; ผู้นำเสนอ: {s.firstName} {s.lastName}</div>
                                                
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <div className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-6 py-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex-1 text-center">
                                                        <div className="text-sm font-bold mb-1">คะแนนเฉลี่ยรวม</div>
                                                        <div className="text-4xl font-black">{avgSc}</div>
                                                    </div>
                                                    <div className="bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex-1 text-center">
                                                        <div className="text-sm font-bold mb-1">จำนวนผู้ประเมิน</div>
                                                        <div className="text-4xl font-black">{subScores.length} <span className="text-lg font-normal text-slate-500">คน</span></div>
                                                    </div>
                                                    {hasOutlier && (
                                                        <div className="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 px-6 py-4 rounded-2xl border border-rose-200 dark:border-rose-800/50 flex-1 text-center">
                                                            <div className="text-sm font-bold mb-1">การให้คะแนนแตกต่างกัน</div>
                                                            <div className="text-base font-black flex items-center gap-2 justify-center mt-1"><i className="fa-solid fa-triangle-exclamation animate-pulse"></i> Outlier</div>
                                                            <div className="text-xs mt-1">คะแนนห่างกัน {maxScore - minScore} แต้ม</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                                    <i className="fa-solid fa-users text-sky-500"></i> รายละเอียดคะแนนจากกรรมการแต่ละท่าน
                                                </h3>
                                                {(() => {
                                                    const assignedReviewers = allUsers.filter(u => 
                                                        u.role === 'reviewer' && 
                                                        ((u.branchId || '').toString().split(',').includes((s.branchId || '').toString()) || 
                                                        (s.reviewerIds || []).includes(u.id) || 
                                                        s.reviewerId === u.id)
                                                    );
                                                    
                                                    // Map scores to reviewers who submitted them, and append those who scored but aren't in assignedReviewers (if any)
                                                    const scoringReviewerIds = subScores.map(sc => sc.reviewerId);
                                                    const additionalReviewers = allUsers.filter(u => scoringReviewerIds.includes(u.id) && !assignedReviewers.find(ar => ar.id === u.id));
                                                    const displayReviewers = [...assignedReviewers, ...additionalReviewers];

                                                    if (displayReviewers.length === 0 && subScores.length === 0) {
                                                        return <div className="text-center text-slate-500 py-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">ไม่มีข้อมูลกรรมการในสาขานี้</div>;
                                                    }

                                                    return (
                                                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm print:shadow-none print:border-slate-300 print:rounded-lg">
                                                            <div className="p-0 overflow-x-auto print:overflow-x-visible">
                                                                <table className="w-full text-sm print:text-xs">
                                                                    <thead className="bg-slate-100/50 dark:bg-slate-900/50 text-slate-500">
                                                                        <tr>
                                                                            <th className="text-left px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-700 min-w-[250px] print:min-w-0 print:px-2 print:py-2">เกณฑ์การประเมิน</th>
                                                                            {displayReviewers.map((reviewer) => {
                                                                                const sc = subScores.find(score => score.reviewerId === reviewer.id);
                                                                                return (
                                                                                    <th key={reviewer.id} className={`text-center px-4 py-4 print:px-2 print:py-2 font-bold border-b border-slate-200 dark:border-slate-700 min-w-[150px] print:min-w-0 border-l border-slate-200 dark:border-slate-700 ${!sc ? 'opacity-60' : ''}`}>
                                                                                        <div className="text-slate-700 dark:text-slate-300 break-words">{reviewer.prefix || ''}{reviewer.firstName} {reviewer.lastName}</div>
                                                                                        {sc ? (
                                                                                            <div className="text-sky-600 dark:text-sky-400 text-xs mt-1 font-black">รวม {sc.totalScore} คะแนน</div>
                                                                                        ) : (
                                                                                            <div className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block">ยังไม่ได้บันทึกผลการประเมิน</div>
                                                                                        )}
                                                                                    </th>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                                        {criteria.map((c) => (
                                                                            <tr key={c.id}>
                                                                                <td className="px-6 py-4 print:px-2 print:py-2 text-slate-700 dark:text-slate-300 align-top">
                                                                                    {c.label}
                                                                                </td>
                                                                                {displayReviewers.map((reviewer) => {
                                                                                    const sc = subScores.find(score => score.reviewerId === reviewer.id);
                                                                                    if (!sc) {
                                                                                        return (
                                                                                            <td key={`${c.id}-${reviewer.id}`} className="px-4 py-4 print:px-2 print:py-2 text-center border-l border-slate-100 dark:border-slate-800/60 align-middle bg-slate-50/30 dark:bg-slate-900/10">
                                                                                                <span className="text-slate-300 dark:text-slate-700 text-lg">-</span>
                                                                                            </td>
                                                                                        );
                                                                                    }
                                                                                    const scoreDetail = sc.scoreData[c.id];
                                                                                    return (
                                                                                        <td key={`${c.id}-${reviewer.id}`} className="px-4 py-4 print:px-2 print:py-2 text-center border-l border-slate-100 dark:border-slate-800/60 align-top">
                                                                                            <div className="font-bold text-slate-800 dark:text-white text-lg">
                                                                                                {scoreDetail?.score ? scoreDetail.score * c.weight : 0}
                                                                                            </div>
                                                                                            <div className="text-xs text-slate-400 mt-0.5 mb-2" title="คะแนนที่ได้ × น้ำหนักคะแนน">
                                                                                                <i className="fa-solid fa-star text-[10px] text-amber-400 mr-1 opacity-50"></i>
                                                                                                ({scoreDetail?.score || 0} &times; {c.weight})
                                                                                            </div>
                                                                                            {scoreDetail?.comment && (
                                                                                                <div className="mt-2 text-xs text-slate-500 italic bg-sky-50 dark:bg-sky-900/20 p-2 text-left break-words whitespace-pre-wrap border border-sky-100 dark:border-sky-800/50 rounded-xl relative">
                                                                                                    <div className="absolute -top-2 left-4 text-sky-400 dark:text-sky-600"><i className="fa-solid fa-caret-up"></i></div>
                                                                                                    <i className="fa-regular fa-comment-dots mr-1"></i>
                                                                                                    {scoreDetail.comment}
                                                                                                </div>
                                                                                            )}
                                                                                        </td>
                                                                                    );
                                                                                })}
                                                                            </tr>
                                                                        ))}
                                                                        <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                                                                            <td className="px-6 py-4 print:px-2 print:py-2 text-right font-black text-slate-700 dark:text-slate-300">รวมคะแนนทั้งหมด</td>
                                                                            {displayReviewers.map((reviewer) => {
                                                                                const sc = subScores.find(score => score.reviewerId === reviewer.id);
                                                                                if (!sc) {
                                                                                    return (
                                                                                        <td key={`total-${reviewer.id}`} className="px-4 py-4 print:px-2 print:py-2 text-center border-l border-slate-100 dark:border-slate-800/60">
                                                                                            <span className="text-slate-300 dark:text-slate-700">-</span>
                                                                                        </td>
                                                                                    );
                                                                                }
                                                                                return (
                                                                                    <td key={`total-${reviewer.id}`} className="px-4 py-4 print:px-2 print:py-2 text-center border-l border-slate-100 dark:border-slate-800/60 font-black text-emerald-600 dark:text-emerald-400 text-2xl print:text-xl">
                                                                                        {sc.totalScore}
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                }

                                const rankedList = branchSubmissions.map(s => {
                                    const subScores = allScores.filter(sc => sc.submissionId === s.id);
                                    const totalSc = subScores.reduce((acc, cr) => acc + cr.totalScore, 0);
                                    const avgSc = subScores.length > 0 ? (totalSc / subScores.length).toFixed(2) : '0.00';
                                    
                                    const scoreValues = subScores.map(sc => sc.totalScore);
                                    const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
                                    const minScore = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;
                                    const hasOutlier = scoreValues.length > 1 && (maxScore - minScore >= 15);
                                    
                                    return { ...s, avgSc: parseFloat(avgSc), totalSc, scoredCount: subScores.length, hasOutlier };
                                }).sort((a, b) => b.avgSc - a.avgSc);

                                if(rankedList.length === 0) return <div className="text-center text-slate-500 py-8">ไม่มีข้อมูลผลงาน</div>;

                                return (
                                    <div className="space-y-4">
                                        <div className="flex justify-end print:hidden mb-4">
                                            <button onClick={() => window.print()} className="text-sm font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
                                                <i className="fa-solid fa-print"></i> พิมพ์รายงานสรุปทุกอันดับ
                                            </button>
                                        </div>
                                        
                                        <div className="print:block hidden mb-6">
                                            <h2 className="text-2xl font-black text-center mb-2">รายงานสรุปลำดับคะแนนผลงาน</h2>
                                            <p className="text-center text-slate-500 text-sm">อ้างอิงข้อมูลคะแนนเฉลี่ยจากรรมการทั้งหมด</p>
                                        </div>

                                        <div className="space-y-3">
                                            {rankedList.map((s, idx) => (
                                                <div 
                                                    key={s.id} 
                                                    onClick={() => setSelectedRankingSubmission(s)}
                                                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md transition-all group print:shadow-none print:border-b print:border-l-0 print:border-r-0 print:border-t-0 print:border-slate-300 print:rounded-none print:py-3 print:px-0"
                                                >
                                                    <div className={`w-12 h-12 shrink-0 rounded-full flex flex-col items-center justify-center font-black text-lg print:w-8 print:h-8 print:text-base print:bg-transparent print:border-none print:text-slate-800 ${idx === 0 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 border-2 border-yellow-300 shadow-sm' : idx === 1 ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300 border-2 border-slate-300 shadow-sm' : idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-2 border-orange-300 shadow-sm' : 'bg-slate-50 text-slate-400 dark:bg-slate-800/50'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-center sm:text-left print:text-left">
                                                        <div className="font-bold text-slate-800 dark:text-white truncate text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors print:text-base print:text-slate-800 print:whitespace-normal" title={s.fileName}>{s.fileName}</div>
                                                        <div className="text-xs text-slate-500 truncate mt-1 print:whitespace-normal print:text-slate-600">
                                                            {WORK_TYPES.find(w => w.id === s.workType)?.label} &bull; {BRANCHES.find(b => b.id === s.branchId)?.label}
                                                        </div>
                                                        <div className="text-xs text-slate-500 truncate mt-0.5 print:whitespace-normal print:text-slate-600">ผู้นำเสนอ: {s.firstName} {s.lastName} ({s.position})</div>
                                                    </div>
                                                    <div className="text-center sm:text-right shrink-0 flex items-center gap-4 print:text-right">
                                                        <div>
                                                            <div className="font-black text-emerald-500 text-3xl group-hover:scale-110 transition-transform print:text-slate-800 print:text-2xl">{s.avgSc.toFixed(2)}</div>
                                                            <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-center gap-1 mt-1">
                                                                <div className="text-[10px] uppercase text-slate-400 font-bold bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded inline-block print:bg-transparent print:border print:border-slate-300 print:text-slate-600">
                                                                    ผู้ประเมิน {s.scoredCount} คน
                                                                </div>
                                                                {s.hasOutlier && (
                                                                    <div className="text-[10px] uppercase text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded inline-flex items-center gap-1 border border-rose-200 dark:border-rose-800 print:bg-transparent print:border-rose-300 print:text-rose-600" title="คะแนนห่างกันผิดปกติ (>= 15 แต้ม)">
                                                                        <i className="fa-solid fa-triangle-exclamation animate-pulse print:animate-none"></i> Outlier
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="hidden sm:flex text-slate-300 dark:text-slate-600 group-hover:text-emerald-400 transition-colors print:hidden">
                                                            <i className="fa-solid fa-chevron-right text-xl"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};

export default ReviewerPanel;
