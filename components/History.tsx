
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Submission, AppSettings, SubmissionStatus, AuditLog } from '../types';
import { BRANCHES, WORK_TYPES, BUDGET_YEAR } from '../constants';
import Badge from './ui/Badge';

// Declare Swal globally since it's loaded via CDN
declare const Swal: any;

interface HistoryProps {
  submissions: Submission[];
  loading: boolean;
  refreshList: () => Promise<void>;
  settings: AppSettings;
  showToast: (t: any) => void;
  onEdit: (submission: Submission) => void;
}

// Configuration for statuses
const STATUS_CONFIG: Record<SubmissionStatus, { label: string; tone: any; step: number }> = {
  draft: { label: 'ฉบับร่าง (Draft)', tone: 'amber', step: 1 },
  submitted: { label: 'ส่งแล้ว (Submitted)', tone: 'navy', step: 2 },
  reviewed: { label: 'กำลังตรวจสอบ (Reviewing)', tone: 'indigo', step: 3 },
  accepted: { label: 'ผ่านการคัดเลือก (Accepted)', tone: 'green', step: 4 },
  rejected: { label: 'ไม่ผ่าน (Rejected)', tone: 'red', step: 4 },
};

// --- Sub-component: Visual Vertical Step Bar (Right Column) ---
const VisualStepBar: React.FC<{ currentStatus: SubmissionStatus }> = ({ currentStatus }) => {
    const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['draft'];
    const currentStep = config.step;
    
    const steps = [
        { id: 1, label: 'ร่างผลงาน' },
        { id: 2, label: 'ส่งระบบ' },
        { id: 3, label: 'ตรวจสอบ' },
        { id: 4, label: 'ประกาศผล' },
    ];

    return (
        <div className="relative pl-2 py-2">
            <div className="space-y-6 relative z-10">
                {steps.map((step, index) => {
                    const isPassed = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isLast = index === steps.length - 1;
                    
                    let circleClass = "bg-slate-100 dark:bg-slate-700 text-slate-300 border-2 border-slate-200 dark:border-slate-600";
                    let textClass = "text-slate-400 dark:text-slate-600 font-medium";
                    let content = <span className="text-[10px] font-bold">{step.id}</span>;
                    let lineColor = "bg-slate-100 dark:bg-slate-700";

                    if (isPassed) {
                        circleClass = "bg-emerald-500 border-2 border-emerald-500 text-white shadow-sm";
                        textClass = "text-emerald-600 dark:text-emerald-400 font-bold opacity-80";
                        content = <i className="fa-solid fa-check text-[10px]"></i>;
                        lineColor = "bg-emerald-300 dark:bg-emerald-800";
                    } else if (isCurrent) {
                        if (currentStatus === 'rejected' && step.id === 4) {
                            circleClass = "bg-rose-500 border-2 border-rose-500 text-white ring-4 ring-rose-100 dark:ring-rose-900/30";
                            textClass = "text-rose-600 dark:text-rose-400 font-black";
                            content = <i className="fa-solid fa-xmark text-[12px]"></i>;
                        } else if (currentStatus === 'accepted' && step.id === 4) {
                             circleClass = "bg-emerald-500 border-2 border-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-900/30";
                             textClass = "text-emerald-600 dark:text-emerald-400 font-black";
                             content = <i className="fa-solid fa-trophy text-[10px]"></i>;
                        } else {
                            const tone = STATUS_CONFIG[currentStatus]?.tone || 'sky';
                            const colorMap: any = {
                                amber: "bg-amber-500 border-amber-500 ring-amber-100 dark:ring-amber-900/30",
                                sky: "bg-sky-500 border-sky-500 ring-sky-100 dark:ring-sky-900/30",
                                navy: "bg-sky-500 border-sky-500 ring-sky-100 dark:ring-sky-900/30",
                                indigo: "bg-indigo-500 border-indigo-500 ring-indigo-100 dark:ring-indigo-900/30"
                            };
                            const textMap: any = {
                                amber: "text-amber-600 dark:text-amber-400",
                                sky: "text-sky-600 dark:text-sky-400",
                                navy: "text-sky-600 dark:text-sky-400",
                                indigo: "text-indigo-600 dark:text-indigo-400"
                            };
                            
                            circleClass = `${colorMap[tone] || colorMap.sky} text-white ring-4 animate-pulse`; 
                            textClass = `${textMap[tone] || textMap.sky} font-black`;
                            content = <span className="text-[10px] font-bold">{step.id}</span>;
                        }
                    }

                    return (
                        <div key={step.id} className="flex items-center gap-3 relative">
                            {!isLast && (
                                <div className={`absolute left-[11px] top-6 w-[2px] h-[20px] -z-10 transition-colors duration-300 ${isPassed ? lineColor : 'bg-slate-100 dark:bg-slate-700'}`} />
                            )}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${circleClass}`}>
                                {content}
                            </div>
                            <span className={`text-xs transition-colors duration-300 ${textClass}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Sub-component: History Timeline Modal ---
const HistoryTimelineModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    submission: Submission | null;
    formatDate: (d: string) => string;
    getActionColors: (a: string) => any;
}> = ({ isOpen, onClose, submission, formatDate, getActionColors }) => {
    if (!isOpen || !submission) return null;

    // Sort audit logs: Newest first
    const logs = [...(submission.audit || [])].reverse();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col ring-1 ring-slate-200 dark:ring-slate-700 animate-bounce-in overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i className="fa-solid fa-clock-rotate-left text-sky-500"></i>
                            ประวัติการดำเนินการ
                        </h3>
                        <p className="text-xs text-slate-500 truncate max-w-[250px]">{submission.fileName}</p>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Timeline Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900">
                    <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-8">
                        {logs.map((log, idx) => {
                            const style = getActionColors(log.action);
                            const dateStr = formatDate(log.at);
                            const [d, t] = dateStr.split(' เวลา ');

                            return (
                                <div key={idx} className="relative pl-8 group">
                                    {/* Dot */}
                                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${style.dot} ring-2 ring-white dark:ring-slate-900`}></div>
                                    
                                    {/* Content */}
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <span>{d}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{t}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${style.bg} ${style.text} border-transparent`}>
                                                {log.action}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                            {log.note}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {logs.length === 0 && <div className="text-center text-slate-400 text-sm">ไม่พบประวัติการดำเนินการ</div>}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-900 dark:bg-sky-600 text-white rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-sm">
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
};

const History: React.FC<HistoryProps> = ({ submissions, loading, refreshList, settings, showToast, onEdit }) => {
  // Load initial filter from localStorage or default
  const [filter, setFilter] = useState(() => {
      const saved = localStorage.getItem('svk_history_filter');
      return saved ? JSON.parse(saved) : { q: "", workType: "all", branchId: "all", status: "all", startDate: "", endDate: "", year: String(BUDGET_YEAR) };
  });

  const [sortOption, setSortOption] = useState("updated_desc");
  
  // States
  const [historyModalData, setHistoryModalData] = useState<Submission | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null); // For Dropdown Menu
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Persistence: Save filter on change
  useEffect(() => {
      localStorage.setItem('svk_history_filter', JSON.stringify(filter));
      setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
      setCurrentPage(1);
  }, [itemsPerPage, sortOption]);

  // Close menu on outside click
  useEffect(() => {
      const handleClickOutside = () => setActiveMenuId(null);
      if (activeMenuId) document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const workTypeLabel = (id: string) => WORK_TYPES.find((x) => x.id === id)?.label || "-";
  const branchLabel = (id: number) => BRANCHES.find((x) => x.id === Number(id))?.label || "-";
  
  // --- New: Color Helper for Work Types ---
  const getWorkTypeStyle = (typeId: string) => {
      switch (typeId) {
          case 'oral': 
              return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800";
          case 'eposter': 
              return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
          case 'innovation': 
              return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
          default: 
              return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      }
  };

  const formatDateTimeTH = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const parseAttachments = (fileUrl?: string) => {
    if (!fileUrl) return [];
    try {
        if (fileUrl.startsWith('[')) return JSON.parse(fileUrl);
        return [{ type: 'file', value: fileUrl, name: 'ไฟล์แนบ' }];
    } catch (e) { return []; }
  };

  const getActionColors = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('SUBMIT') || act.includes('FIXED')) return { dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' };
    if (act.includes('DRAFT') || act.includes('SAVE')) return { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' };
    if (act.includes('REVIEW')) return { dot: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' };
    if (act.includes('ACCEPT')) return { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' };
    if (act.includes('REJECT')) return { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' };
    if (act.includes('DELETE')) return { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' };
    if (act.includes('ADMIN')) return { dot: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' };
    return { dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' };
  };

  const filtered = useMemo(() => {
    const q = String(filter.q || "").trim().toLowerCase();
    const keywords = q.split(/\s+/).filter(k => k.length > 0);

    let result = submissions.filter((s) => {
      const okType = filter.workType === "all" ? true : s.workType === filter.workType;
      const okBranch = filter.branchId === "all" ? true : Number(s.branchId) === Number(filter.branchId);
      const okStatus = filter.status === "all" ? true : s.status === filter.status;
      const okYear = !filter.year || filter.year === "all" ? true : String(s.budgetYear) === filter.year;

      const itemDate = new Date(s.createdAt);
      let okDate = true;
      if (filter.startDate) {
          const [y, m, d] = filter.startDate.split('-').map(Number);
          const start = new Date(y, m - 1, d, 0, 0, 0); 
          if (itemDate < start) okDate = false;
      }
      if (okDate && filter.endDate) {
          const [y, m, d] = filter.endDate.split('-').map(Number);
          const end = new Date(y, m - 1, d, 23, 59, 59, 999); 
          if (itemDate > end) okDate = false;
      }
      const hay = [s.firstName, s.lastName, s.position, s.organization, workTypeLabel(s.workType), branchLabel(s.branchId), STATUS_CONFIG[s.status]?.label || ''].filter(Boolean).join(" ").toLowerCase();
      const okQ = keywords.length === 0 ? true : keywords.every(k => hay.includes(k));
      return okType && okBranch && okStatus && okQ && okDate && okYear;
    });

    return result.sort((a, b) => {
        switch (sortOption) {
            case "created_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case "created_asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case "updated_desc": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            case "updated_asc": return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            case "status": return a.status.localeCompare(b.status);
            default: return 0;
        }
    });
  }, [submissions, filter, sortOption]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisibleButtons = 5;
    if (totalPages <= maxVisibleButtons) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 3) end = Math.min(totalPages - 1, 4);
        if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 3);
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
    }
    return pages;
  };

  const resetFilters = () => {
      const defaultFilter = { q: "", workType: "all", branchId: "all", status: "all", startDate: "", endDate: "", year: String(BUDGET_YEAR) };
      setFilter(defaultFilter);
      localStorage.setItem('svk_history_filter', JSON.stringify(defaultFilter));
      setSortOption("updated_desc");
  };

  const handleDeleteRequest = async (s: Submission) => {
     await Swal.fire({
        title: 'ต้องการลบข้อมูล?',
        html: `<div class="text-left text-sm text-slate-600 space-y-4"><p>หากท่านต้องการลบผลงานออกจากระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการ:</p><div class="bg-slate-100 p-4 rounded-xl border border-slate-200 text-center"><strong class="block text-slate-800 text-lg mb-1">ผู้จัดการข้อมูล (Data Manager)</strong><span class="block text-slate-500 mb-2">กลุ่มงานทรัพยากรบุคคล สำนักงานสาธารณสุขจังหวัดสตูล</span><a href="tel:0888888888" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition shadow-md"><i class="fa-solid fa-phone"></i> 088-888-8888</a></div><p class="text-xs text-rose-500">* การลบข้อมูลจะต้องผ่านการตรวจสอบเพื่อป้องกันความผิดพลาด</p></div>`,
        icon: 'info',
        confirmButtonText: 'รับทราบ',
        confirmButtonColor: '#0f172a',
        customClass: { popup: 'rounded-3xl' }
    });
  };

  const handlePrint = (s: Submission) => {
      showToast({ type: 'info', title: 'กำลังดำเนินการ', message: 'ระบบกำลังเตรียมเอกสาร PDF สำหรับพิมพ์...' });
      // In real implementation: window.open(`/api/print/submission/${s.id}`, '_blank');
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-5 md:p-6 fade-in min-h-[500px] flex flex-col">
      <HistoryTimelineModal 
          isOpen={!!historyModalData} 
          onClose={() => setHistoryModalData(null)} 
          submission={historyModalData}
          formatDate={formatDateTimeTH}
          getActionColors={getActionColors}
      />

      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-sky-500"></i>
                ประวัติการลงทะเบียน/ส่งผลงาน
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  พบข้อมูล {filtered.length} รายการ <span className="text-xs text-slate-400">(จากทั้งหมด {submissions.length})</span>
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <select 
                    value={filter.year || String(BUDGET_YEAR)} 
                    onChange={e => setFilter({...filter, year: e.target.value})}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                >
                    <option value="all">ทุกปีงบประมาณ</option>
                    <option value={String(BUDGET_YEAR)}>ปี {BUDGET_YEAR}</option>
                    <option value={String(BUDGET_YEAR - 1)}>ปี {BUDGET_YEAR - 1}</option>
                </select>

                <select 
                    value={filter.status} 
                    onChange={e => setFilter({...filter, status: e.target.value})}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                >
                    <option value="all">สถานะ: ทั้งหมด</option>
                    <option value="draft">ฉบับร่าง</option>
                    <option value="submitted">ส่งแล้ว</option>
                    <option value="reviewed">กำลังตรวจสอบ</option>
                    <option value="accepted">ผ่านการคัดเลือก</option>
                    <option value="rejected">ไม่ผ่าน</option>
                </select>

                <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`h-9 w-9 rounded-xl flex items-center justify-center transition border ${showAdvancedFilters ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 border-sky-200' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>
                    <i className={`fa-solid ${showAdvancedFilters ? 'fa-filter-circle-xmark' : 'fa-filter'}`}></i>
                </button>
            </div>
          </div>

          {/* Advanced Filters (Collapsible) */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-fade-in">
                <div className="relative"><i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i><input type="text" placeholder="ค้นหาชื่อ, หน่วยงาน..." value={filter.q} onChange={e => setFilter({...filter, q: e.target.value})} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-sky-200 bg-white dark:bg-slate-900 dark:text-white" /></div>
                <select value={filter.workType} onChange={e => setFilter({...filter, workType: e.target.value})} className="rounded-xl border border-slate-200 dark:border-slate-600 py-2.5 px-3 text-sm outline-none bg-white dark:bg-slate-900 dark:text-white"><option value="all">ประเภทผลงาน: ทั้งหมด</option>{WORK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                <div className="flex gap-2">
                    <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2.5 px-3 text-sm outline-none bg-white dark:bg-slate-900 dark:text-white" />
                    <span className="self-center text-slate-400">-</span>
                    <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2.5 px-3 text-sm outline-none bg-white dark:bg-slate-900 dark:text-white" />
                </div>
                <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                    <button onClick={resetFilters} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition flex items-center gap-2">
                        <i className="fa-solid fa-rotate-right"></i> <span>ล้างตัวกรองและค่าเริ่มต้น</span>
                    </button>
                </div>
            </div>
          )}
      </div>

      <div className="mt-6 flex-1">
        {loading && <div className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 justify-center py-8"><i className="fa-solid fa-spinner animate-spin" /><span>กำลังโหลดข้อมูล...</span></div>}

        <div className="space-y-6">
          {paginatedItems.length === 0 && !loading ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full mx-auto flex items-center justify-center text-3xl mb-4"><i className="fa-solid fa-magnifying-glass"></i></div>
              <div className="text-lg font-black text-slate-900 dark:text-white">ไม่พบข้อมูล</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง</div>
              <button onClick={resetFilters} className="mt-4 text-sky-600 dark:text-sky-400 font-bold text-sm hover:underline">ล้างตัวกรองทั้งหมด</button>
            </div>
          ) : (
            paginatedItems.map((s) => {
              const status = STATUS_CONFIG[s.status] || STATUS_CONFIG['draft'];
              const attachments = parseAttachments(s.fileUrl);
              const auditLogs = s.audit || [];
              const latestLogs = [...auditLogs].reverse().slice(0, 2);
              
              // Edit Lock Logic
              const isLocked = ['reviewed', 'accepted', 'rejected'].includes(s.status);
              const isMenuOpen = activeMenuId === s.id;

              return (
                <div key={s.id} className="rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm overflow-hidden transition hover:shadow-md">
                  <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[220px]">
                      
                      {/* Left Column: Details (70%) */}
                      <div className="lg:col-span-8 p-6 flex flex-col gap-4">
                          {/* Row 1: Title */}
                          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                              {s.fileName || '(ไม่มีชื่อเรื่อง)'}
                          </h3>

                          {/* Row 2: Metadata (Year · Type · Branch) */}
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium mb-2">
                              {/* Year: Neutral Color */}
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-bold dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                  ปี {s.budgetYear}
                              </span>
                              
                              {/* Work Type: Color Coded */}
                              <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1.5 ${getWorkTypeStyle(s.workType)}`}>
                                  <i className={`${WORK_TYPES.find(t=>t.id===s.workType)?.icon} text-[10px] opacity-70`}></i>
                                  {workTypeLabel(s.workType)}
                              </span>

                              <span className="text-slate-300 dark:text-slate-600">|</span>
                              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{branchLabel(s.branchId)}</span>
                          </div>

                          {/* Row 3: Sender & Org */}
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
                              <div className="flex items-center gap-1.5">
                                  <div className="w-4 flex justify-center"><i className="fa-solid fa-user text-slate-400"></i></div>
                                  <span className="truncate max-w-[150px] font-bold">{s.firstName} {s.lastName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                  <div className="w-4 flex justify-center"><i className="fa-solid fa-building text-slate-400"></i></div>
                                  <span className="truncate max-w-[180px]">{s.organization || "-"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 ml-auto text-slate-400">
                                   <i className="fa-regular fa-clock"></i>
                                   {formatDateTimeTH(s.updatedAt)}
                              </div>
                          </div>

                          {/* Attachments */}
                          {attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                  {attachments.map((file: any, idx: number) => (
                                      <a key={idx} href={file.value} target="_blank" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:text-sky-600 font-bold border border-slate-200 dark:border-slate-700 transition">
                                          <i className={`fa-solid ${file.type === 'link' ? 'fa-link' : 'fa-file-pdf'}`}></i><span className="truncate max-w-[150px]">{file.name || 'เอกสารแนบ'}</span>
                                      </a>
                                  ))}
                              </div>
                          )}
                          
                          {/* Compact History Preview */}
                          <div className="mt-auto border-t border-slate-100 dark:border-slate-700 pt-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-timeline"></i> กิจกรรมล่าสุด
                                </div>
                                <div className="space-y-2 mb-3">
                                    {latestLogs.map((log, idx) => {
                                        const style = getActionColors(log.action);
                                        const dt = formatDateTimeTH(log.at).split(' '); 
                                        return (
                                            <div key={idx} className="flex items-center gap-3 text-xs">
                                                <span className="text-slate-400 font-mono whitespace-nowrap min-w-[80px]">{dt[0]} {dt[1]} {dt[2].slice(2)}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-400 truncate">{log.note}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                                <button 
                                    onClick={() => setHistoryModalData(s)}
                                    className="text-xs font-bold text-slate-500 hover:text-sky-600 transition flex items-center gap-1 group"
                                >
                                    ดูประวัติทั้งหมด ({auditLogs.length}) <i className="fa-solid fa-arrow-right text-[10px] opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"></i>
                                </button>
                          </div>
                      </div>

                      {/* Right Column: Status & Action (30%) */}
                      <div className="lg:col-span-4 bg-slate-50/50 dark:bg-slate-900/30 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-700 p-6 flex flex-col justify-between gap-6">
                          {/* Status Pipeline */}
                          <div className="flex flex-col gap-4">
                              <div className="flex justify-end">
                                  <Badge tone={status.tone} className="shadow-sm text-sm py-1 px-3">
                                      {status.label}
                                  </Badge>
                              </div>
                              <VisualStepBar currentStatus={s.status} />
                          </div>

                          {/* New Actions Layout: Primary Button + Kebab Menu */}
                          <div className="flex items-center gap-2 relative">
                              <button 
                                onClick={() => onEdit(s)}
                                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-sm
                                    ${isLocked 
                                        ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600' 
                                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500'
                                    }
                                `}
                                title={isLocked ? "ผลงานอยู่ในสถานะที่ไม่สามารถแก้ไขได้" : "แก้ไขข้อมูล"}
                              >
                                {isLocked ? <i className="fa-solid fa-eye" /> : <i className="fa-solid fa-file-pen" />}
                                <span>{isLocked ? 'ดูรายละเอียด' : 'แก้ไขข้อมูล'}</span>
                              </button>
                              
                              {/* Kebab Menu Trigger */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                     onClick={() => setActiveMenuId(isMenuOpen ? null : s.id)}
                                     className={`h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white border transition shadow-sm
                                        ${isMenuOpen ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-100 border-transparent'}
                                     `}
                                  >
                                     <i className="fa-solid fa-ellipsis-vertical"></i>
                                  </button>

                                  {/* Dropdown Menu */}
                                  {isMenuOpen && (
                                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 animate-fade-in z-20 overflow-hidden">
                                          <div className="p-1">
                                              <button 
                                                  onClick={() => { handlePrint(s); setActiveMenuId(null); }}
                                                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                                              >
                                                  <i className="fa-solid fa-print w-4 text-center"></i> ออกหนังสือ/พิมพ์
                                              </button>
                                              <button 
                                                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                                                  onClick={() => setActiveMenuId(null)}
                                              >
                                                  <i className="fa-solid fa-file-pdf w-4 text-center"></i> ดาวน์โหลด PDF
                                              </button>
                                              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                              <button 
                                                  onClick={() => { handleDeleteRequest(s); setActiveMenuId(null); }}
                                                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg flex items-center gap-2"
                                              >
                                                  <i className="fa-solid fa-trash-can w-4 text-center"></i> แจ้งลบข้อมูล
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {filtered.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ</div>
              <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition text-slate-600 dark:text-slate-300"><i className="fa-solid fa-chevron-left text-xs"></i></button>
                  <div className="flex items-center gap-1">{getPageNumbers().map((p, i) => (typeof p === 'number' ? (<button key={i} onClick={() => setCurrentPage(p)} className={`h-9 w-9 rounded-lg font-bold text-sm transition ${currentPage === p ? 'bg-slate-900 text-white shadow-md dark:bg-sky-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{p}</button>) : <span key={i} className="h-9 w-9 flex items-center justify-center text-slate-400">...</span>))}</div>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition text-slate-600 dark:text-slate-300"><i className="fa-solid fa-chevron-right text-xs"></i></button>
              </div>
              
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                      เลื่อนไปบนสุด <i className="fa-solid fa-arrow-up ml-1"></i>
                  </button>
                  <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 px-3 text-sm outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-white cursor-pointer hover:border-slate-300 transition">
                      <option value={10}>10 รายการ / หน้า</option>
                      <option value={20}>20 รายการ / หน้า</option>
                      <option value={50}>50 รายการ / หน้า</option>
                  </select>
              </div>
          </div>
      )}
    </div>
  );
};

export default History;
